# OpenTutor

Self-hosted AI language tutor for WhatsApp with local voice support.

OpenTutor receives text or audio on WhatsApp, transcribes audio locally (Faster-Whisper), generates a tutoring response with a local LLM via Ollama, and returns text plus an optional voice reply generated locally with Piper.

## Highlights

- WhatsApp bot using `whatsapp-web.js` (QR login + `LocalAuth`)
- Local LLM via Ollama (`/api/generate`, any installed model)
- Local STT microservice (FastAPI + Faster-Whisper)
- Local TTS via Piper + `ffmpeg` (voice note OGG/Opus)
- SQLite persistence (`better-sqlite3`) for profiles, settings, state, messages, summary, vocab, mistakes, logs
- Tutor Engine with FSM + policies (LLM is guided, not fully in control)
- Text and voice flows both supported out of the box (after dependency install)
- Windows and Linux scripts for setup and dev run

## Repo Structure

See `docs/ARCHITECTURE.md` for details. Main components:

- `apps/whatsapp`: WhatsApp bot app (TypeScript)
- `core/db`: SQLite persistence layer
- `core/llm`: Ollama client/provider abstraction
- `core/tutor`: Tutor Engine (FSM, policies, prompts, memory)
- `services/stt`: FastAPI STT service (Python)
- `services/tts`: Piper voice model instructions
- `docs`: Markdown documentation
- `docs-html`: static HTML docs viewer

## Demo Flow (text)

1. User sends `/start`
2. Bot replies with onboarding and commands
3. User sets `/language en`, `/mode lesson`, `/voice on`
4. User sends: `i go to market yesterday`
5. Tutor Engine builds prompt from profile + summary + FSM + recent messages
6. Ollama generates a concise correction + follow-up question
7. Bot replies with text and voice note

## Demo Flow (audio)

1. User sends WhatsApp voice note
2. Bot downloads media
3. STT service transcribes via Faster-Whisper
4. Tutor Engine + Ollama generate response text
5. Piper synthesizes WAV
6. `ffmpeg` converts WAV to OGG/Opus
7. Bot sends WhatsApp voice reply (and optional text)

## Quick Start

Use `docs/QUICKSTART.md` for full instructions.

Minimum path:

```bash
pnpm install
cp .env.example .env
# install ollama, ffmpeg, piper, python deps
pnpm dev
```

## Requirements

- Node.js 20+
- `pnpm` (recommended) or npm
- Ollama + at least one downloaded model (e.g. `llama3.1`)
- Python 3.10+ for STT service
- `ffmpeg` in `PATH`
- Piper binary + voice model

## Documentation

- `docs/README.md`
- `docs/QUICKSTART.md`
- `docs/ARCHITECTURE.md`
- `docs/PEDAGOGY.md`
- `docs/COMMANDS.md`
- `docs/TROUBLESHOOTING.md`
- `docs/SECURITY.md`

Static docs site:

- `docs-html/index.html` (serve repository with a static server and open this file)

## Important Notes

- `whatsapp-web.js` is not an official WhatsApp API.
- All user data is stored locally in SQLite.
- Voice models and LLM models are not committed to this repository.

## License

MIT (`LICENSE`)
