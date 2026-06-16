# ── Stage 1: Build React frontend ───────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Copy frontend source (folder name has parens — use explicit path)
COPY frontend\(demo\)/package.json frontend\(demo\)/package-lock.json ./
RUN npm ci

COPY frontend\(demo\)/ ./
RUN npm run build
# Built output is now at /frontend/dist

# ── Stage 2: Python backend + serve frontend ─────────────────────────────────
FROM python:3.11-slim

# ── System dependencies ──────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies (cached layer) ──────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy project source ──────────────────────────────────────────────────────
COPY . .

# ── Copy built frontend from Stage 1 ────────────────────────────────────────
COPY --from=frontend-builder /frontend/dist /app/frontend_dist

# ── Runtime directories ──────────────────────────────────────────────────────
RUN mkdir -p /app/backend/uploads /app/data/output/ocr_results \
    /app/data/output/table_coordinates /app/data/output/final_json

# ── Hugging Face Spaces uses port 7860 ──────────────────────────────────────
ENV PORT=7860

# ── Start FastAPI (serves both API + frontend) ───────────────────────────────
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
