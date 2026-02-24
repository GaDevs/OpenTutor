# Installation and Configuration Guide

This guide lists, with official links, everything you need to install and configure so OpenTutor works with text and voice on WhatsApp.

## What you need to install

Required:

- Git (to clone the repository)
- Node.js 20+ (project runtime)
- pnpm (recommended package manager)
- Python 3.10+ (STT service)
- ffmpeg (STT audio decoding + WhatsApp audio conversion)
- Ollama (local LLM)
- Piper (local TTS)
- A Piper voice model (`.onnx` + `.onnx.json`)

Optional but recommended:

- Store `ffmpeg` inside `./tools/ffmpeg/` (auto-detected by the project)

## 1. Git

Official download:

- https://git-scm.com/downloads

Verify:

```bash
git --version
```

## 2. Node.js (20+)

Official download:

- https://nodejs.org/en/download/

Recommendation:

- Use an LTS version (`20+`)

Verify:

```bash
node -v
npm -v
```

## 3. pnpm (recommended)

Official links:

- Installation: https://pnpm.io/installation
- Documentation: https://pnpm.io/

Simple install via npm:

```bash
npm install -g pnpm
```

Verify:

```bash
pnpm -v
```

## 4. Python 3.10+ (for STT)

Official download:

- https://www.python.org/downloads/

Verify:

```bash
python --version
```

On Linux, you may use:

```bash
python3 --version
```

## 5. ffmpeg (required)

Official download page:

- https://ffmpeg.org/download.html

OpenTutor uses `ffmpeg` for:

- Audio decoding compatibility in STT (Whisper dependency chain)
- WAV -> OGG/Opus conversion for WhatsApp voice notes

### Option A (global): install in PATH

Verify:

```bash
ffmpeg -version
```

### Option B (recommended for easier onboarding): local project binary

Use this folder (setup scripts create it):

- `tools/ffmpeg/`

Expected filenames:

- Windows: `tools/ffmpeg/ffmpeg.exe`
- Linux: `tools/ffmpeg/ffmpeg`

OpenTutor auto-detects this location before checking `PATH`.

On Linux:

```bash
chmod +x ./tools/ffmpeg/ffmpeg
```

## 6. Ollama (local LLM)

Official links:

- Download / website: https://ollama.com/
- Model library: https://ollama.com/library

Verify:

```bash
ollama --version
```

Pull a model (example):

```bash
ollama pull llama3.1
```

Other compatible examples:

- `qwen2.5`
- `mistral`

### Recommended models for weaker machines (CPU / lower RAM)

If your machine is limited, start with smaller models (faster and lighter), for example:

- `qwen2.5:3b` (good balance for a local tutor)
- `llama3.2:3b` (good lightweight option, if available in your Ollama setup)
- quantized `7b` variants can work, but are usually much slower on CPU

Practical guidance:

- Start with `3b`
- Move to `7b+` only if latency is acceptable

Example:

```bash
ollama pull qwen2.5:3b
```

In `.env`:

```env
MODEL=qwen2.5:3b
```

Quick test:

```bash
ollama run llama3.1
```

## 7. Piper (local TTS)

Official/reference links:

- Piper project (GitHub): https://github.com/rhasspy/piper
- Piper voices (Hugging Face): https://huggingface.co/rhasspy/piper-voices

Install the `piper` binary and verify:

```bash
piper --help
```

If you do not want it in `PATH`, set `PIPER_BIN` in `.env`.

## 8. Download a Piper voice

The project already includes helper scripts for the default voice:

Windows:

```powershell
.\scripts\download-piper-voice.ps1
```

Linux:

```bash
./scripts/download-piper-voice.sh
```

Expected files (default example):

- `services/tts/voices/en_US-lessac-medium.onnx`
- `services/tts/voices/en_US-lessac-medium.onnx.json`

## 9. Clone the project and install Node dependencies

```bash
git clone <REPO_URL>
cd OpenTutor
pnpm install
```

If `pnpm` is not available, the project can also run with `npm`, but `pnpm` is the recommended flow.

Important:

- Do a normal install (do not use `--ignore-scripts`), because `better-sqlite3` needs native bindings.
- If you get a SQLite binding error on first startup, run:

```bash
npm rebuild better-sqlite3
```

## 10. Create and configure `.env`

Create it from the example:

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Main fields to review:

- `MODEL` (example: `llama3.1`)
- `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- `STT_BASE_URL` (default `http://127.0.0.1:8001`)
- `PIPER_BIN` (if `piper` is not in PATH)
- `PIPER_MODEL`
- `PIPER_CONFIG`
- `FFMPEG_BIN` (optional if using `tools/ffmpeg` auto-detection)

Example (Windows with local ffmpeg):

```env
MODEL=llama3.1
FFMPEG_BIN=./tools/ffmpeg/ffmpeg.exe
PIPER_MODEL=./services/tts/voices/en_US-lessac-medium.onnx
PIPER_CONFIG=./services/tts/voices/en_US-lessac-medium.onnx.json
```

## 11. Configure the STT service (Python)

Create a virtual environment inside `services/stt` and install dependencies.

### Windows (PowerShell)

```powershell
cd services\stt
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..
```

### Linux

```bash
cd services/stt
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

Optional performance tuning:

- `STT_MODEL_SIZE=small` (good CPU default)
- `STT_MODEL_SIZE=tiny` (lighter for weak machines, lower accuracy)
- `STT_DEVICE=cpu`
- `STT_COMPUTE_TYPE=int8`

Useful notes:

- On first startup, `faster-whisper` may download/prepare the model and take a bit longer.
- You can test the STT service independently:

```bash
cd services/stt
python -m uvicorn app:app --host 0.0.0.0 --port 8001
```

In another terminal:

```bash
curl http://127.0.0.1:8001/health
```

On Windows (PowerShell):

```powershell
Invoke-WebRequest http://127.0.0.1:8001/health | Select-Object -ExpandProperty Content
```

## 12. Install Puppeteer Chrome (required by `whatsapp-web.js`)

If the bot fails with a Chrome/Chromium not found error, install Puppeteer's managed Chrome:

```bash
npx puppeteer browsers install chrome
```

This usually fixes errors such as:

- `Could not find Chrome (...)`

## 13. Start everything and connect WhatsApp

Run:

```bash
pnpm dev
```

This starts:

- STT service (FastAPI)
- WhatsApp bot (Node.js)

First run:

1. A QR code appears in the terminal
2. Open WhatsApp on your phone
3. Go to `Linked Devices`
4. Scan the QR code

## 14. Configure the tutor (initial commands)

Send these commands to the bot:

```text
/start
/language en
/mode lesson
/level A1
/corrections light
/voice on
```

## 15. Verification checklist (text + voice)

Before testing, confirm:

- `ollama` is running
- the model is installed (`ollama list`)
- `ffmpeg -version` works (or a local binary exists in `tools/ffmpeg`)
- `piper --help` works (or `PIPER_BIN` is configured)
- Piper voice files exist in `services/tts/voices/`
- STT dependencies are installed in `.venv`
- Puppeteer Chrome is installed (`npx puppeteer browsers install chrome`)

Test:

1. Send a text message in WhatsApp
2. Send a voice note in WhatsApp
3. Confirm the bot replies with text and/or voice

## 16. If something fails

Check:

- `docs/TROUBLESHOOTING.md`
- `docs/QUICKSTART.md`

## 17. Recommended full setup flow (exact commands from scratch)

### Windows (PowerShell)

```powershell
git clone <REPO_URL>
cd OpenTutor
npm install -g pnpm
pnpm install
Copy-Item .env.example .env
npx puppeteer browsers install chrome

cd services\stt
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..

# Install Ollama, ffmpeg, Piper, and a Piper voice manually
# Optional: put ffmpeg at .\tools\ffmpeg\ffmpeg.exe

pnpm dev
```

### Linux

```bash
git clone <REPO_URL>
cd OpenTutor
npm install -g pnpm
pnpm install
cp .env.example .env
npx puppeteer browsers install chrome

cd services/stt
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# Install Ollama, ffmpeg, Piper, and a Piper voice manually
# Optional: put ffmpeg at ./tools/ffmpeg/ffmpeg

pnpm dev
```

## Quick summary (recommended order)

1. Install Git, Node.js, pnpm, Python
2. Install `ffmpeg`
3. Install Ollama and pull a model
4. Install Piper and download a voice
5. Run `pnpm install`
6. Create `.env`
7. Install `services/stt` dependencies (`pip install -r requirements.txt`)
8. Run `npx puppeteer browsers install chrome`
9. Run `pnpm dev`
10. Scan the QR code
