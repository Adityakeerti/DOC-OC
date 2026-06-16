from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import shutil
import os
import json
import asyncio
from pathlib import Path
import sys
import uuid
from typing import Optional

# Add project root and module paths so we can import main pipeline
docroot = Path(__file__).resolve().parent.parent
try:
    os.chdir(str(docroot))
except Exception:
    pass

sys.path.insert(0, str(docroot))
sys.path.insert(0, str(docroot / 'scripts'))

# Explicitly preload preprocess.py
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
    pass

# Load root pipeline module
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

OUTPUT_DIR = docroot / 'data' / 'output'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Marksheet OCR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
app.mount("/sample", StaticFiles(directory=str(docroot / 'sample')), name="sample")

processor = MarksheetProcessor()


# ── helpers ─────────────────────────────────────────────────────────────────

def sse(event_data: dict) -> str:
    """Format a Server-Sent Event line."""
    return f"data: {json.dumps(event_data)}\n\n"


def _save_and_convert_pdf(file_path: Path, suffix: str) -> tuple[Path, str]:
    """Convert PDF → JPEG using PyMuPDF. Returns (path, suffix)."""
    if suffix.lower() != ".pdf":
        return file_path, suffix

    img_path = file_path.with_suffix(".jpg")
    converted = False

    try:
        import fitz
        doc = fitz.open(str(file_path))
        page = doc.load_page(0)
        mat = fitz.Matrix(300 / 72, 300 / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(str(img_path))
        doc.close()
        converted = True
    except Exception:
        pass

    if not converted:
        try:
            from pdf2image import convert_from_path
            pages = convert_from_path(str(file_path), dpi=300)
            if pages:
                pages[0].save(str(img_path), format="JPEG")
                converted = True
        except Exception:
            pass

    try:
        os.remove(file_path)
    except Exception:
        pass

    if not converted:
        raise ValueError("Could not convert PDF to image. Ensure the PDF is not password-protected.")

    return img_path, ".jpg"


def _build_pipeline_meta(logo_det, face_det, table_det, preprocessing, overall_status) -> dict:
    return {
        'overall_status': overall_status,
        'logo': {
            'detected': logo_det.get('detected', False),
            'board_name': logo_det.get('board_name', ''),
            'board_id': logo_det.get('board_id', -1),
        },
        'face': {
            'detected': bool(face_det.get('photo_detected', 0)),
        },
        'tables': {
            'found': table_det.get('has_tables', False),
            'count': len(table_det.get('table_coordinates', [])),
            'items': table_det.get('table_coordinates', []),
        },
        'crop_coordinates': preprocessing.get('crop_coordinates'),
    }


# ── health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── streaming process endpoint ────────────────────────────────────────────────

@app.post("/process-stream")
async def process_marksheet_stream(
    file: UploadFile = File(...),
    mode: str = Query("school"),
    expected_sem: Optional[str] = Query(None),
):
    """
    Runs the pipeline step-by-step and streams Server-Sent Events back so the
    frontend can animate each stage in real time.
    """
    # Save upload
    suffix = Path(file.filename).suffix
    temp_filename = f"{uuid.uuid4().hex}{suffix}"
    temp_path = UPLOAD_DIR / temp_filename
    with open(temp_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Convert PDF outside the generator (needs to be synchronous before streaming)
    try:
        temp_path, suffix = _save_and_convert_pdf(temp_path, suffix)
    except ValueError as e:
        async def err():
            yield sse({"type": "error", "message": str(e)})
        return StreamingResponse(err(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    image_path_str = str(temp_path)

    async def generate():
        loop = asyncio.get_event_loop()

        # ── COLLEGE mode: no per-step streaming, just single call ──────────
        if mode == "college":
            yield sse({"type": "step", "step": "ocr", "status": "running",
                       "label": "Extracting college marksheet…"})
            try:
                from scripts.college_extractor import process_fixed_format as college_process
                info_box  = (0.395423, 0.163709, 0.653978, 0.128660)
                marks_box = (0.492943, 0.472937, 0.849016, 0.492458)
                data = await loop.run_in_executor(None, lambda: college_process(image_path_str, info_box, marks_box))

                if expected_sem:
                    extracted_sem = (data.get("college", {}) or {}).get("semester")
                    if extracted_sem and str(extracted_sem).strip().upper() != str(expected_sem).strip().upper():
                        yield sse({"type": "error",
                                   "message": f"Uploaded marksheet belongs to Semester {extracted_sem}. "
                                              f"Please upload Semester {expected_sem} marksheet."})
                        return

                # Fixed regions for college
                pipeline_meta = {
                    'overall_status': 'valid_marksheet',
                    'logo': {'detected': False, 'board_name': 'University'},
                    'face': {'detected': False},
                    'tables': {'found': True, 'count': 2, 'items': []},
                    'crop_coordinates': None,
                }
                yield sse({"type": "result", "board": "COLLEGE_FIXED", "data": data,
                           "pipeline": pipeline_meta})
            except Exception as e:
                yield sse({"type": "error", "message": str(e)})
            finally:
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
            return

        # ── SCHOOL mode: full step-by-step stream ──────────────────────────
        results = {
            "preprocessing": {},
            "logo_detection": {},
            "face_detection": {},
            "table_detection": {},
            "overall_status": "unknown",
        }

        try:
            # Step 1 — Preprocess
            yield sse({"type": "step", "step": "preprocess", "status": "running",
                       "label": "Cropping & normalising image…"})
            from preprocess import preprocess_marksheet
            processed_image, original_image, crop_coords = await loop.run_in_executor(
                None, lambda: preprocess_marksheet(image_path_str, None, False)
            )
            import cv2
            preprocessed_path = temp_path.parent / f"{temp_path.stem}_preprocessed.jpg"
            cv2.imwrite(str(preprocessed_path), processed_image)
            results["preprocessing"] = {
                "status": "success",
                "crop_coordinates": crop_coords,
                "preprocessed_image": str(preprocessed_path),
            }
            yield sse({"type": "step", "step": "preprocess", "status": "done",
                       "label": "Image normalised"})

            # Step 2 — Logo detection
            yield sse({"type": "step", "step": "logo", "status": "running",
                       "label": "Identifying board / institution logo…"})
            from scripts.detectLogo import detect_logo
            logo_result = await loop.run_in_executor(
                None, lambda: detect_logo(image_path_str, processor.logo_model_path)
            )
            board_names = {0: "Uttarakhand", 1: "CBSE", 2: "ICSE", -1: "Unknown"}
            board_name = board_names.get(logo_result, "Unknown")
            results["logo_detection"] = {
                "status": "success", "board_id": logo_result,
                "board_name": board_name, "detected": logo_result != -1,
            }
            yield sse({"type": "step", "step": "logo", "status": "done",
                       "label": f"Board identified: {board_name}",
                       "board": board_name, "detected": logo_result != -1})

            # Step 3 — Face / photo detection
            yield sse({"type": "step", "step": "face", "status": "running",
                       "label": "Detecting candidate photo (PII check)…"})
            from scripts.facedetector import detect_candidate_photo
            face_result = await loop.run_in_executor(
                None, lambda: detect_candidate_photo(image_path_str, logo_result)
            )
            results["face_detection"] = {
                "status": "success",
                "photo_detected": face_result["photo_detected"],
                "board": face_result["board"],
            }
            yield sse({"type": "step", "step": "face", "status": "done",
                       "label": "Photo region flagged for PII masking" if face_result["photo_detected"] else "No photo region found",
                       "detected": bool(face_result["photo_detected"])})

            # Step 4 — Table detection
            yield sse({"type": "step", "step": "tables", "status": "running",
                       "label": "Segmenting marks / info tables with transformer model…"})
            from scripts.predict_table import process_single_image as detect_tables
            table_result = await loop.run_in_executor(
                None, lambda: detect_tables(
                    image_path_str,
                    model_path=processor.table_model_path,
                    confidence_threshold=0.5,
                    info_threshold=0.5,
                    marks_threshold=0.8,
                    save_results=False,
                    fix_orientation=True,
                )
            )

            # Collect table coordinates (highest-confidence per class)
            table_coordinates = []
            if table_result == 1:
                try:
                    from predict_table import detect_tables_with_boxes_and_scores
                    raw = await loop.run_in_executor(
                        None, lambda: detect_tables_with_boxes_and_scores(image_path_str, processor.table_model_path)
                    )
                    # Group by label, keep highest confidence per class
                    best: dict = {}
                    for box, label, conf in raw:
                        x1, y1, x2, y2 = box
                        t_type = "Information Table" if label == 0 else "Marks Table"
                        if t_type not in best or conf > best[t_type]["confidence"]:
                            best[t_type] = {
                                "table_type": t_type,
                                "confidence": float(conf),
                                "coordinates": {"x1": float(x1), "y1": float(y1),
                                                "x2": float(x2), "y2": float(y2)},
                                "width": float(x2 - x1),
                                "height": float(y2 - y1),
                            }
                    table_coordinates = list(best.values())
                except Exception:
                    pass

            results["table_detection"] = {
                "status": "success",
                "tables_found": table_result,
                "has_tables": table_result == 1,
                "table_coordinates": table_coordinates,
            }
            yield sse({"type": "step", "step": "tables", "status": "done",
                       "label": f"{len(table_coordinates)} table region(s) segmented",
                       "tables": table_coordinates})

            # Save intermediate JSON (needed by OCR)
            results_path = temp_path.parent / f"{temp_path.stem}_result.json"
            with open(results_path, 'w') as f:
                json.dump(results, f, indent=2)

            # Persist table coordinates
            tc_dir = OUTPUT_DIR / "table_coordinates"
            tc_dir.mkdir(parents=True, exist_ok=True)
            with open(tc_dir / f"{temp_path.stem}.json", 'w') as f:
                json.dump({"file": image_path_str,
                           "table_coordinates": table_coordinates}, f, indent=2)

            # Step 5 — OCR: marks table
            yield sse({"type": "step", "step": "ocr_marks", "status": "running",
                       "label": "OCR: reading marks table via LLMWhisperer…"})
            from scripts.ocr import (
                get_max_confidence_table, crop_table_from_image,
                save_cropped_image, process_ocr, results_dir as ocr_results_dir,
            )
            stem = temp_path.stem
            marks_table = get_max_confidence_table(
                results["table_detection"]["table_coordinates"], "Marks Table"
            )
            if marks_table:
                cropped = crop_table_from_image(image_path_str, marks_table["coordinates"], 0.10)
                tmp = save_cropped_image(cropped, stem, "marks")
                marks_text = await loop.run_in_executor(None, lambda: process_ocr(tmp))
                try:
                    os.remove(tmp)
                except Exception:
                    pass
                with open(os.path.join(ocr_results_dir, f"{stem}_marks.txt"), 'w', encoding='utf-8') as f:
                    f.write(marks_text)
            yield sse({"type": "step", "step": "ocr_marks", "status": "done",
                       "label": "Marks table text extracted"})

            # Step 6 — OCR: info table
            yield sse({"type": "step", "step": "ocr_info", "status": "running",
                       "label": "OCR: reading information table via LLMWhisperer…"})
            info_table = get_max_confidence_table(
                results["table_detection"]["table_coordinates"], "Information Table"
            )
            if info_table:
                cropped = crop_table_from_image(image_path_str, info_table["coordinates"], 0.15)
                tmp = save_cropped_image(cropped, stem, "info")
                info_text = await loop.run_in_executor(None, lambda: process_ocr(tmp))
                try:
                    os.remove(tmp)
                except Exception:
                    pass
                with open(os.path.join(ocr_results_dir, f"{stem}_info.txt"), 'w', encoding='utf-8') as f:
                    f.write(info_text)
            yield sse({"type": "step", "step": "ocr_info", "status": "done",
                       "label": "Info table text extracted"})

            # Step 7 — Extraction
            yield sse({"type": "step", "step": "extract", "status": "running",
                       "label": "Structuring extracted text into JSON…"})
            from scripts.extractor import create_final_results_dir, process_file as extractor_process_file
            create_final_results_dir()
            extracted_data = await loop.run_in_executor(
                None, lambda: extractor_process_file(stem, board_name)
            )
            final_json_path = OUTPUT_DIR / "final_json" / f"{stem}.json"
            if extracted_data:
                with open(final_json_path, 'w', encoding='utf-8') as f:
                    json.dump(extracted_data, f, indent=2, ensure_ascii=False)
            yield sse({"type": "step", "step": "extract", "status": "done",
                       "label": "Structured JSON ready"})

            # Determine overall status
            is_icse = board_name == "ICSE"
            if logo_result != -1 and (face_result["photo_detected"] == 1 or is_icse) and table_result == 1:
                overall_status = "valid_marksheet"
            elif logo_result == -1:
                overall_status = "invalid_logo"
            elif table_result == 0:
                overall_status = "no_tables"
            elif not face_result["photo_detected"] and not is_icse:
                overall_status = "no_photo"
            else:
                overall_status = "partial_match"

            pipeline_meta = _build_pipeline_meta(
                results["logo_detection"], results["face_detection"],
                results["table_detection"], results["preprocessing"], overall_status
            )

            data = extracted_data
            if not data and final_json_path.exists():
                with open(final_json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

            if not data:
                data = {"board": board_name, "student_name": "OCR not available",
                        "subjects": [], "note": "OCR extraction failed"}

            yield sse({"type": "result", "board": board_name, "data": data,
                       "pipeline": pipeline_meta})

        except Exception as e:
            yield sse({"type": "error", "message": str(e)})
        finally:
            for p in [temp_path, preprocessed_path if 'preprocessed_path' in dir() else None,
                      results_path if 'results_path' in dir() else None]:
                try:
                    if p:
                        os.remove(p)
                except Exception:
                    pass

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no",
                 "Connection": "keep-alive"},
    )


# ── legacy single-shot process (kept for compatibility) ──────────────────────

@app.post("/process")
async def process_marksheet(
    file: UploadFile = File(...),
    mode: str = Query("school"),
    expected_sem: Optional[str] = Query(None),
):
    suffix = Path(file.filename).suffix
    temp_filename = f"{uuid.uuid4().hex}{suffix}"
    temp_path = UPLOAD_DIR / temp_filename
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        temp_path, suffix = _save_and_convert_pdf(temp_path, suffix)
    except ValueError as e:
        return JSONResponse(content={"error": str(e)}, status_code=400)

    try:
        if mode == "college":
            from scripts.college_extractor import process_fixed_format as college_process
            info_box  = (0.395423, 0.163709, 0.653978, 0.128660)
            marks_box = (0.492943, 0.472937, 0.849016, 0.492458)
            data = college_process(str(temp_path), info_box, marks_box)
            if expected_sem:
                try:
                    extracted_sem = (data.get("college", {}) or {}).get("semester")
                    if extracted_sem and str(extracted_sem).strip().upper() != str(expected_sem).strip().upper():
                        return JSONResponse(
                            content={"error": f"Uploaded marksheet belongs to Semester {extracted_sem}. "
                                              f"Please upload Semester {expected_sem} marksheet."},
                            status_code=400)
                except Exception:
                    pass
            return JSONResponse(content={"board": "COLLEGE_FIXED", "data": data})
        else:
            result = processor.process_single_marksheet(str(temp_path))
            data = None
            if 'extraction' in result:
                data = result['extraction'].get('data')
                if not data and result['extraction'].get('final_json'):
                    fp = Path(result['extraction']['final_json'])
                    if fp.exists():
                        with open(fp, 'r', encoding='utf-8') as f:
                            data = json.load(f)

            logo_det    = result.get('logo_detection', {})
            face_det    = result.get('face_detection', {})
            table_det   = result.get('table_detection', {})
            preprocessing = result.get('preprocessing', {})

            # Deduplicate table items by class, keep highest confidence
            raw_tables = table_det.get('table_coordinates', [])
            best: dict = {}
            for t in raw_tables:
                ttype = t.get('table_type', 'Unknown')
                if ttype not in best or t.get('confidence', 0) > best[ttype].get('confidence', 0):
                    best[ttype] = t
            deduped_tables = list(best.values())
            table_det_clean = {**table_det, 'table_coordinates': deduped_tables,
                               'count': len(deduped_tables)}

            pipeline_meta = _build_pipeline_meta(
                logo_det, face_det, table_det_clean, preprocessing,
                result.get('overall_status', 'unknown')
            )

            board_name = logo_det.get('board_name', '')
            if data is not None:
                return JSONResponse(content={"board": board_name, "data": data,
                                             "pipeline": pipeline_meta})
            else:
                return JSONResponse(content={
                    "board": board_name, "pipeline": pipeline_meta,
                    "data": {"board": board_name, "student_name": "OCR not available",
                             "subjects": [], "note": "OCR extraction failed"}
                })
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass


# ── submit (save to data/output/) ─────────────────────────────────────────────

@app.post("/submit")
async def submit_marksheets(payload: dict):
    import datetime
    try:
        session_id = uuid.uuid4().hex[:8]
        timestamp  = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        out_file   = OUTPUT_DIR / f"submission_{timestamp}_{session_id}.json"
        save_data  = {"session_id": session_id, "timestamp": timestamp,
                      "marksheets": payload.get("marksheets", [])}
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        return {"status": "ok", "message": "Marksheets saved successfully", "file": out_file.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))