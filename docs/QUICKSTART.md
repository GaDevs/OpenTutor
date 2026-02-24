# Quickstart

This guide gets OpenTutor running locally with WhatsApp text + voice.

## 1. Requirements

- Node.js `20+`
- `pnpm` (recommended)
- Python `3.10+`
- `ffmpeg` (either in `PATH` or placed inside `./tools/ffmpeg/`)
- Ollama installed
- Piper binary installed

## 2. Clone and install

```bash
git clone <your-fork-or-repo-url>
cd OpenTutor
pnpm install
```

Important:

- Do not use `--ignore-scripts` on install, because `better-sqlite3` needs native bindings.
- If you see a `better_sqlite3.node` binding error, run:

```bash
npm rebuild better-sqlite3
```

## 3. Configure environment

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Important variables in `.env`:

- `MODEL` (Ollama model name)
- `OLLAMA_BASE_URL`
- `STT_BASE_URL`
- `PIPER_BIN`
- `PIPER_MODEL`
- `PIPER_CONFIG`
- `FFMPEG_BIN`

## 4. Install Ollama and model

Install Ollama from the official website for your OS, then pull a model:

```bash
ollama pull llama3.1
```

You can use other installed models too (examples):

- `qwen2.5`
- `mistral`
- `phi4`

Set the one you want in `.env`:

```env
MODEL=llama3.1
```

## 5. Install ffmpeg

OpenTutor needs `ffmpeg` for:

- STT decoding compatibility (Faster-Whisper dependency)
- WAV -> OGG/Opus conversion for WhatsApp voice notes

OpenTutor supports two ways to use `ffmpeg`:

- Global install in `PATH`
- Local project binary in `./tools/ffmpeg/` (recommended for easier setup sharing)

If `FFMPEG_BIN` is not set, OpenTutor tries:

- Windows: `./tools/ffmpeg/ffmpeg.exe`
- Linux: `./tools/ffmpeg/ffmpeg`
- then falls back to `ffmpeg` from `PATH`

### Windows

- Install via `winget`, `choco`, or manual zip
- Ensure `ffmpeg.exe` is in `PATH`, or copy it to `.\tools\ffmpeg\ffmpeg.exe`

Example (`winget`, may vary by package id):

```powershell
winget install ffmpeg
```

### Linux (Debian/Ubuntu)

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

If you want a project-local binary instead of PATH, copy it to:

```bash
./tools/ffmpeg/ffmpeg
chmod +x ./tools/ffmpeg/ffmpeg
```

## 6. Install Piper and voice model

Install the `piper` binary (OS package / release binary), then download a voice.

### Download default voice

Windows:

```powershell
.\scripts\download-piper-voice.ps1
```

Linux:

```bash
./scripts/download-piper-voice.sh
```

This places files under `services/tts/voices/`.

If `piper` is not in `PATH`, update `.env`:

```env
PIPER_BIN=C:\path\to\piper.exe
```

## 7. Set up STT Python service

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

Optional STT tuning:

```bash
export STT_MODEL_SIZE=small
export STT_DEVICE=cpu
export STT_COMPUTE_TYPE=int8
```

You can verify STT before running the bot:

```bash
cd services/stt
python -m uvicorn app:app --host 0.0.0.0 --port 8001
```

Then check:

```bash
curl http://127.0.0.1:8001/health
```

## 7.5 Install Puppeteer Chrome (required by `whatsapp-web.js`)

If Chrome/Chromium is not found on first run, install Puppeteer's managed Chrome:

```bash
npx puppeteer browsers install chrome
```

## 8. Run OpenTutor (bot + STT)

```bash
pnpm dev
```

This starts:

- STT FastAPI service on `http://127.0.0.1:8001`
- WhatsApp bot app

On first run, a QR code appears in the terminal.

## 9. WhatsApp login

1. Open WhatsApp on your phone
2. Linked Devices
3. Scan the QR shown in the terminal
4. Wait for `client ready`

Sessions are stored locally in `./sessions` (configurable).

## 10. First commands

Send these to the bot in WhatsApp:

```text
/start
/language en
/mode lesson
/level A1
/corrections light
/voice on
```

Then send text or a voice note.

## 11. Verify voice pipeline

Send a short voice note in the target language.

Expected flow:

1. Bot transcribes audio (STT)
2. Bot generates tutor reply (Ollama)
3. Bot returns text + voice note (Piper + ffmpeg)

If it fails, see `TROUBLESHOOTING.md`.
