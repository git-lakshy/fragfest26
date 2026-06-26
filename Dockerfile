# Stage 1: Build the Next.js Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy code and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the FastAPI Backend and serve static frontend
FROM python:3.11-slim AS backend-runner
WORKDIR /app

# Install system dependencies if any
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY backend/app/ ./backend/app/
COPY docs/ ./docs/

# Copy static frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/out ./backend/static

# Expose target deployment port (Google Cloud Run default is 8080)
EXPOSE 8080

# Run Uvicorn backend server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
