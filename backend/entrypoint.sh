#!/bin/bash
set -e

MODEL_DIR="/app/storage/models/piper"
MODEL_NAME="es_ES-carlfm-x_low"
ONNX_URL="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx"
JSON_URL="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx.json"

# Ensure storage dirs exist (in case volume is mounted empty)
mkdir -p /app/storage/assets /app/storage/audio /app/storage/videos /app/storage/models

if [ ! -s "$MODEL_DIR/$MODEL_NAME.onnx" ]; then
    echo "[entrypoint] Piper model not found or empty. Downloading..."
    mkdir -p "$MODEL_DIR"

    echo "[entrypoint] Downloading .onnx from HuggingFace..."
    wget -O "$MODEL_DIR/$MODEL_NAME.onnx" "$ONNX_URL"

    echo "[entrypoint] Downloading .onnx.json from HuggingFace..."
    wget -O "$MODEL_DIR/$MODEL_NAME.onnx.json" "$JSON_URL"

    echo "[entrypoint] Piper model downloaded successfully."
else
    echo "[entrypoint] Piper model found at $MODEL_DIR/$MODEL_NAME.onnx"
fi

exec "$@"
