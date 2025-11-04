from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import shutil
import os
from pathlib import Path
import sys
import uuid
from typing import Optional

# Add project root and module paths so we can import main pipeline
docroot = Path(__file__).resolve().parent.parent
# Ensure current working directory is the project root so relative paths in the pipeline work
try:
    os.chdir(str(docroot))
except Exception:
    pass

sys.path.insert(0, str(docroot))
sys.path.insert(0, str(docroot / 'scripts'))

# Explicitly preload preprocess.py so `from preprocess import ...` inside main.py resolves
try:
    import importlib.util
    preprocess_path = docroot / 'preprocess.py'
    if preprocess_path.exists():
        spec = importlib.util.spec_from_file_location('preprocess', str(preprocess_path))
        module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(module)
        sys.modules['preprocess'] = module
except Exception:
    # Safe to continue; main.py may still resolve it via sys.path
    pass

# Load root pipeline module as a uniquely named module to avoid circular import with this backend/main.py
try:
    import importlib.util
    pipeline_path = docroot / 'main.py'
    spec = importlib.util.spec_from_file_location('pipeline_main', str(pipeline_path))
    pipeline_module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(pipeline_module)
    MarksheetProcessor = getattr(pipeline_module, 'MarksheetProcessor')
except Exception as e:
    raise RuntimeError(f"Failed to load pipeline from {pipeline_path}: {e}")

# Import database
sys.path.insert(0, str(docroot / 'database'))
from db_config import MarksheetDB

# Request models
class UserCreate(BaseModel):
    username: str
    email: str

class SubmitData(BaseModel):
    user_email: str
    marksheets: list

UPLOAD_DIR = docroot / 'backend' / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()

# Enable CORS for all origins (for frontend dev convenience)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = MarksheetProcessor()
db = MarksheetDB()

@app.post("/process")
async def process_marksheet(
    file: UploadFile = File(...),
    mode: str = Query("school"),  # "school" or "college"
    expected_sem: Optional[str] = Query(None),
):
    # Save upload to disk
    suffix = Path(file.filename).suffix
    temp_filename = f"{uuid.uuid4().hex}{suffix}"
    temp_path = UPLOAD_DIR / temp_filename
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # If PDF, convert first page to image for downstream OCR
    try:
        if suffix.lower() == ".pdf":
            from pdf2image import convert_from_path
            pages = convert_from_path(str(temp_path), dpi=300)
            img_path = UPLOAD_DIR / f"{Path(temp_filename).stem}.jpg"
            if pages:
                pages[0].save(str(img_path), format="JPEG")
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
                temp_path = img_path
                suffix = ".jpg"
    except Exception as _e:
        # Non-fatal; continue with original file if conversion failed
        pass
    # Run pipeline
    try:
        if mode == "college":
            # Lazy import to avoid loading unless needed
            from scripts.college_extractor import process_fixed_format as college_process
            # Provided normalized boxes
            info_box = (0.395423, 0.163709, 0.653978, 0.128660)
            marks_box = (0.492943, 0.472937, 0.849016, 0.492458)
            data = college_process(str(temp_path), info_box, marks_box)
            # Semester validation: compare extracted semester with expected_sem (if provided)
            if expected_sem:
                try:
                    extracted_sem = (data.get("college", {}) or {}).get("semester")
                    if extracted_sem and str(extracted_sem).strip().upper() != str(expected_sem).strip().upper():
                        return JSONResponse(content={"error": f"Uploaded marksheet belongs to Semester {extracted_sem}. Please upload Semester {expected_sem} marksheet."}, status_code=400)
                except Exception:
                    pass
            return JSONResponse(content={"board": "COLLEGE_FIXED", "data": data})
        else:
            result = processor.process_single_marksheet(str(temp_path))
            # The result should contain an 'extraction' field with the final JSON path and/or data
            data = None
            if 'extraction' in result:
                data = result['extraction'].get('data')
                if not data and result['extraction'].get('final_json'):
                    final_json_path = Path(result['extraction']['final_json'])
                    if final_json_path.exists():
                        import json
                        with open(final_json_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
            if data is not None:
                # Also allow board-name/type to frontend
                return JSONResponse(content={"board": result.get("logo_detection", {}).get("board_name", ""), "data": data})
            else:
                # Return partial results even if extraction failed
                board_name = result.get("logo_detection", {}).get("board_name", "")
                return JSONResponse(content={
                    "board": board_name,
                    "data": {
                        "board": board_name,
                        "student_name": "OCR not available",
                        "subjects": [],
                        "note": "OCR extraction failed - please check API key"
                    }
                })
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
@app.post("/create_user")
async def create_user(user: UserCreate):
    try:
        user_id = db.create_user(user.username, user.email)
        if user_id:
            return {"user_id": user_id, "message": "User created successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to create user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/{email}")
async def get_user(email: str):
    try:
        user = db.get_user_by_email(email)
        if user:
            return user
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/submit_marksheets")
async def submit_marksheets(data: SubmitData):
    try:
        # Get user
        user = db.get_user_by_email(data.user_email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        saved_count = 0
        for marksheet in data.marksheets:
            marksheet_data = marksheet.get("data", {})
            filename = marksheet.get("filename", "")
            
            if "10th" in filename:
                result = db.save_10th_marksheet(user["user_id"], marksheet_data)
            elif "12th" in filename:
                result = db.save_12th_marksheet(user["user_id"], marksheet_data)
            elif "semester" in filename:
                # Extract semester number from filename
                import re
                sem_match = re.search(r'semester_(\d+)', filename)
                semester = int(sem_match.group(1)) if sem_match else 1
                result = db.save_college_marksheet(user["user_id"], semester, marksheet_data)
            else:
                continue
            
            if result:
                saved_count += 1
        
        return {
            "message": f"Successfully saved {saved_count} marksheets",
            "saved_count": saved_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user_marksheets/{email}")
async def get_user_marksheets(email: str):
    try:
        user = db.get_user_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        marksheets = db.get_user_marksheets(user["user_id"])
        return marksheets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update_semester")
async def update_semester(data: dict):
    try:
        user = db.get_user_by_email(data["email"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        success = db.update_user_semester(user["user_id"], data["semester"])
        if success:
            return {"message": "Semester updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update semester")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))