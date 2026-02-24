# OpenTutor TTS (Piper)

OpenTutor uses the local `piper` binary for text-to-speech and `ffmpeg` to convert WAV to OGG/Opus for WhatsApp voice notes.

## What is included here

- Runtime integration is implemented in `apps/whatsapp/src/media.ts`
- This folder stores voice models under `services/tts/voices/`
- Large voice files are not committed to git

## Requirements

- `piper` binary available on PATH, or set `PIPER_BIN` in `.env`
- A Piper voice model `.onnx` + `.onnx.json`
- `ffmpeg` available on PATH, or set `FFMPEG_BIN` in `.env`

## Default voice (recommended starter)

- `en_US-lessac-medium`

Use the helper scripts:

- Windows: `scripts/download-piper-voice.ps1`
- Linux: `scripts/download-piper-voice.sh`

They download files into `services/tts/voices/`.

## Environment variables

- `PIPER_BIN=piper`
- `PIPER_MODEL=./services/tts/voices/en_US-lessac-medium.onnx`
- `PIPER_CONFIG=./services/tts/voices/en_US-lessac-medium.onnx.json`
- `FFMPEG_BIN=ffmpeg`

## Swapping voice/language

1. Download another Piper model pair (`.onnx` and `.onnx.json`)
2. Update `PIPER_MODEL` and `PIPER_CONFIG` in `.env`
3. Restart the bot

Piper supports many languages/voices; OpenTutor itself is language-agnostic.
