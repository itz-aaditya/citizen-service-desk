# ==========================================
# Stage 1: Build Frontend Single-Page App
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Python Runtime
# ==========================================
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Copy compiled frontend assets from Stage 1 into static mount directory
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000

CMD ["sh", "-c", "python -m scripts.seed_demo && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
