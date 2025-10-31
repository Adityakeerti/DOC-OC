from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import shutil
import os
from pathlib import Path
import sys
import uuid

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

@app.post("/process")
async def process_marksheet(file: UploadFile = File(...)):
    # Save upload to disk
    suffix = Path(file.filename).suffix
    temp_filename = f"{uuid.uuid4().hex}{suffix}"
    temp_path = UPLOAD_DIR / temp_filename
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Run pipeline
    try:
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
            return JSONResponse(content={"error": "No data extracted"}, status_code=500)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
# modify the flow like:
# after processing one it should prompt to process next for 12th 
# and then submit 

# also make the UI finisihed 

# do last finishing processes