# OpenTutor STT Service (Faster-Whisper)

This service exposes local speech-to-text over HTTP for the WhatsApp bot.

## Features

- FastAPI endpoint `POST /transcribe` (multipart file upload)
- Local transcription using `faster-whisper`
- Optional language hint (`language=en`, `es`, `fr`, etc.)
- CPU-friendly defaults (`small`, `int8`)

## Requirements

- Python `3.10+`
- `ffmpeg` installed and available in `PATH` (required by Whisper decoding)

## Install

### Windows (PowerShell)

```powershell
cd services/stt
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
```

### Linux

```bash
cd services/stt
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
cd services/stt
uvicorn app:app --host 0.0.0.0 --port 8001
```

## Environment variables

- `STT_MODEL_SIZE` (default `small`)
- `STT_DEVICE` (default `cpu`)
- `STT_COMPUTE_TYPE` (default `int8`)
- `STT_BEAM_SIZE` (default `1`)

Recommended models:

- `tiny` (fastest, lower accuracy)
- `small` (good default)
- `medium` (more accurate, slower)

## API

### `GET /health`

Returns service and model metadata.

### `POST /transcribe`

Multipart fields:

- `file` (required): audio file
- `language` (optional): target language hint (`en`, `es`, `fr`, ...)
- `beam_size` (optional): decoding beam size

Response:

```json
{
  "text": "hello how are you",
  "language": "en",
  "duration": 2.4
}
```

## Notes

- WhatsApp audio usually arrives as OGG/Opus. `faster-whisper` can transcribe it when `ffmpeg` is installed.
- If transcription quality is poor, send `language` explicitly or change `STT_MODEL_SIZE`.
