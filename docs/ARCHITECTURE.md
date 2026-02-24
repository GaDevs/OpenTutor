# Architecture

## Overview

OpenTutor is a local-first, modular system:

- WhatsApp interface in Node.js/TypeScript
- Tutor Engine in TypeScript (FSM + prompts + memory policy)
- SQLite persistence in TypeScript
- Local LLM via Ollama HTTP API
- Local STT via FastAPI + Faster-Whisper
- Local TTS via Piper CLI + ffmpeg

## High-level Data Flow

```text
WhatsApp User
   |
   v
whatsapp-web.js (apps/whatsapp)
   |-- text ------------------------------+
   |-- audio -> media download -> STT ----+--> Tutor Engine (core/tutor)
                                           |    |-- load profile/settings/state/summary/history (core/db)
                                           |    |-- FSM transition + policy selection
                                           |    |-- prompt assembly
                                           |    '-- Ollama generate (core/llm)
                                           |
                                           +--> reply text
                                                |-- save messages/logs to SQLite
                                                |-- optional summary refresh every N messages
                                                '-- TTS (Piper -> WAV, ffmpeg -> OGG/Opus)
                                                          |
                                                          v
                                                    WhatsApp reply (text + voice)
```

## Module Responsibilities

### `apps/whatsapp`

- WhatsApp client lifecycle (`LocalAuth`, QR, ready/disconnect)
- Message routing (text vs audio)
- Slash command parsing and settings updates
- Rate limiting / loop guard
- STT and TTS integration
- Error handling and user-facing fallback messages

### `core/tutor`

- Finite state machine (FSM): `IDLE`, `LESSON_INTRO`, `PRACTICE`, `FEEDBACK`
- Pedagogical policies (corrections, response length, question count)
- Prompt construction using deterministic context inputs
- Memory summary refresh policy (every N messages)

### `core/db`

- SQLite schema + migrations
- Persistent user profile, settings, session state
- Message history and memory summary
- Vocabulary and mistake logging
- Event logs for debugging and operations

### `core/llm`

- Provider abstraction (`LlmProvider`)
- Ollama client (`POST /api/generate`, `stream=false`)
- Request timeout handling

### `services/stt`

- FastAPI HTTP endpoint `/transcribe`
- Local `faster-whisper` inference
- Optional language hint

## Why the LLM does not control everything

The Tutor Engine enforces:

- Current mode (`chat`, `lesson`, `drill`, `exam`)
- Correction policy (`off`, `light`, `strict`)
- FSM state and task
- Max response length
- Memory summary cadence
- Prompt inputs (profile + summary + recent messages + task)

This keeps tutor behavior more stable and product-like than raw chat completion.

## Persistence Model (SQLite)

Main tables:

- `users`
- `user_settings`
- `session_state`
- `user_memory`
- `messages`
- `vocab_seen`
- `mistakes`
- `event_logs`

Database path defaults to:

- `./data/opentutor.sqlite`

## Cross-platform notes

- Node app works on Windows/Linux
- STT service works on Windows/Linux with Python + ffmpeg
- TTS works on Windows/Linux if `piper` and `ffmpeg` are installed
- `scripts/` contains platform-specific helpers
