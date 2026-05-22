FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install torch CPU-only first (prevents openai-whisper from downloading CUDA libs)
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create storage directories
RUN mkdir -p /app/storage/assets /app/storage/audio /app/storage/videos /app/storage/models

# Add non-root user PRIMERO (antes de usarlo en chown)
RUN useradd -m -u 1000 appuser

# Create mount point for shared frontend generated components volume
RUN mkdir -p /app/frontend/src/remotion/generated && \
    chown -R appuser:appuser /app/frontend && \
    chmod -R 777 /app/frontend/src/remotion/generated

# Change ownership of app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
