#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "OpenTutor setup (Linux)"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
else
  echo ".env already exists (keeping current file)"
fi

mkdir -p data tmp sessions services/tts/voices

if command -v pnpm >/dev/null 2>&1; then
  echo "Installing Node dependencies with pnpm..."
  pnpm install
elif command -v npm >/dev/null 2>&1; then
  echo "pnpm not found. Installing with npm..."
  npm install
else
  echo "Node package manager not found. Install Node.js 20+ and pnpm."
  exit 1
fi

cat <<'EOF'

Manual dependencies still required:
1) Install Ollama and run: ollama pull llama3.1
2) Install ffmpeg and ensure "ffmpeg" is in PATH
3) Install Piper binary and ensure "piper" is in PATH (or set PIPER_BIN)
4) Download a Piper voice: ./scripts/download-piper-voice.sh
5) Create Python venv for STT and install requirements:
   cd services/stt && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

Then run: pnpm dev
EOF
