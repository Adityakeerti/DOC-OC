## DOC OC Final

Simple end-to-end marksheet extraction system:
- Python pipeline for preprocessing, logo/face/table detection, OCR, and data extraction
- FastAPI backend to accept uploads and return structured JSON
- React frontend for upload, progress, preview, and basic editing

### Project Structure
```
backend/                 FastAPI service (entry: backend/main.py)
frontend/                Vite + React UI
models/                  Model weights (logo.pt, tt_finetuned/)
scripts/                 Pipeline modules (detectLogo, predict_table, ocr, extractor)
data/
  input/                 Sample inputs (optional)
  output/
    ocr_results/         *_info.txt and *_marks.txt (OCR)
    table_coordinates/   {stem}.json (table boxes)
    final_json/          {stem}.json (final extracted data)
main.py                  CLI pipeline entry
requirements.txt         Python dependencies
```

### Prerequisites
- Python 3.10+ (tested on 3.11)
- Node 18+ (for frontend)
- Model files placed as:
  - `models/logo.pt`
  - `models/tt_finetuned/` (HuggingFace format)
- Optional: `.env` file with `UNSTRANCT_API_KEY=...` for OCR

### Setup & Run (Backend)
1) Create venv and install deps
```bash
python -m venv .venv
. .venv/Scripts/activate  # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Start FastAPI
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

API
- POST `http://localhost:8000/process`
  - form-data: `file` (image/pdf)
  - response: `{ board, data }` where `data` is structured marksheet JSON

### Setup & Run (Frontend)
```bash
cd frontend
npm install
npm run dev
```
Open the shown URL (usually http://localhost:5173). The app targets the backend at `http://<host>:8000/process`.

### CLI Usage (Optional)
Run the pipeline from root:
```bash
python main.py --image path/to/image.jpg --output data/output
```

### Outputs
- OCR text: `data/output/ocr_results/{stem}_info.txt`, `{stem}_marks.txt`
- Table coordinates: `data/output/table_coordinates/{stem}.json`
- Final JSON: `data/output/final_json/{stem}.json`

### Environment
Create `.env` (root) if using cloud OCR:
```
UNSTRANCT_API_KEY=your_api_key_here
```
If not set, the app skips OCR gracefully.

### Troubleshooting
- Circular import in backend: always run `uvicorn backend.main:app ...` or from `backend` folder use `uvicorn main:app ...` (fixed in code via importlib).
- Models not found: verify `models/logo.pt` and `models/tt_finetuned/` exist.
- OCR not created: ensure API key present and network allowed; otherwise only detection/coords may be saved.
