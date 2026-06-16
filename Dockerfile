# ── Base image ──────────────────────────────────────────────────────────────
FROM python:3.11-slim

# ── System dependencies ──────────────────────────────────────────────────────
# poppler-utils  → pdf2image (PDF → PIL)
# libgl1         → OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ────────────────────────────────────────────────────────
WORKDIR /app

# ── Python dependencies (cached layer) ──────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy project source ──────────────────────────────────────────────────────
COPY . .

# ── Hugging Face Spaces uses port 7860 ──────────────────────────────────────
ENV PORT=7860

# Create uploads directory used by backend
RUN mkdir -p /app/backend/uploads /app/data/output/ocr_results \
    /app/data/output/table_coordinates /app/data/output/final_json

# ── Start FastAPI with uvicorn ───────────────────────────────────────────────
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
