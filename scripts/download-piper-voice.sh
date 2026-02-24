#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

VOICE_NAME="${1:-en_US-lessac-medium}"
OUT_DIR="services/tts/voices"
mkdir -p "$OUT_DIR"

case "$VOICE_NAME" in
  en_US-lessac-medium)
    BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"
    curl -L "$BASE/en_US-lessac-medium.onnx" -o "$OUT_DIR/en_US-lessac-medium.onnx"
    curl -L "$BASE/en_US-lessac-medium.onnx.json" -o "$OUT_DIR/en_US-lessac-medium.onnx.json"
    ;;
  *)
    echo "Unsupported preset voice '$VOICE_NAME'. Edit this script or download manually."
    exit 1
    ;;
esac

echo "Voice downloaded to $OUT_DIR"
