#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT_DIR="$(pwd)"

if [[ -z "${FFMPEG_BIN:-}" ]]; then
  if [[ -x "$ROOT_DIR/tools/ffmpeg/ffmpeg" ]]; then
    export FFMPEG_BIN="$ROOT_DIR/tools/ffmpeg/ffmpeg"
    echo "Using local ffmpeg: $FFMPEG_BIN"
  elif [[ -f "$ROOT_DIR/tools/ffmpeg/ffmpeg.exe" ]]; then
    export FFMPEG_BIN="$ROOT_DIR/tools/ffmpeg/ffmpeg.exe"
    echo "Using local ffmpeg: $FFMPEG_BIN"
  fi
fi

PYTHON_BIN="${PYTHON_BIN:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x services/stt/.venv/bin/python ]]; then
    PYTHON_BIN="$ROOT_DIR/services/stt/.venv/bin/python"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
  else
    echo "Python not found. Install Python 3.10+ and create services/stt/.venv"
    exit 1
  fi
fi

cleanup() {
  if [[ -n "${STT_PID:-}" ]]; then
    kill "$STT_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting STT service..."
(cd services/stt && "$PYTHON_BIN" -m uvicorn app:app --host 0.0.0.0 --port 8001) &
STT_PID=$!
sleep 2

if command -v pnpm >/dev/null 2>&1; then
  pnpm --filter @opentutor/whatsapp dev
else
  npm run dev --workspace=@opentutor/whatsapp
fi
