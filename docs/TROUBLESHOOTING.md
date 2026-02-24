# Troubleshooting

## QR code does not appear

- Check that the bot process is running (`pnpm dev`)
- Ensure terminal supports text output (QR prints in terminal)
- If session data is corrupted, stop the app and remove `./sessions` (you will need to re-login)

## WhatsApp client fails to start (Puppeteer / browser issues)

- Install Puppeteer's managed Chrome:

```bash
npx puppeteer browsers install chrome
```

- Install system dependencies required by Chromium (Linux)
- Try updating `whatsapp-web.js`
- Ensure no security software is blocking local browser launch

Typical error:

- `Could not find Chrome (...)`

## `better-sqlite3` binding missing (`better_sqlite3.node`)

If startup fails with a native binding error, the SQLite package was likely installed without running scripts or needs a rebuild.

Fix:

```bash
npm rebuild better-sqlite3
```

Or reinstall normally (without `--ignore-scripts`):

```bash
pnpm install
```

## Bot replies to no messages

- Confirm `client ready` appears in logs
- Verify you are messaging the linked account (not a group if `ALLOW_GROUPS=false`)
- Check SQLite logs in `event_logs` table
- Verify Ollama is reachable (`OLLAMA_BASE_URL`)

## Ollama errors / timeouts

- Start Ollama locally
- Check model is installed:

```bash
ollama list
```

- Pull a model if missing:

```bash
ollama pull llama3.1
```

- Increase `OLLAMA_TIMEOUT_MS` for slower CPUs/models

## STT transcribe fails

- Ensure STT service is running on `http://127.0.0.1:8001`
- Check `services/stt/.venv` is installed correctly
- Confirm `ffmpeg` is in `PATH`
- Try a smaller STT model (`STT_MODEL_SIZE=tiny` or `small`)
- Inspect STT logs in terminal
- Verify `/health` responds:

```bash
curl http://127.0.0.1:8001/health
```

Common first-run issues:

- `No module named uvicorn` -> run `pip install -r requirements.txt` in `services/stt/.venv`
- `No module named requests` -> update/install dependencies again (`pip install -r requirements.txt`)

## Audio received but no voice reply

- Check `piper` binary path (`PIPER_BIN`)
- Verify voice files exist:
  - `services/tts/voices/*.onnx`
  - `services/tts/voices/*.onnx.json`
- Check `ffmpeg` conversion works (`ffmpeg -version`)
- If using project-local ffmpeg, verify file exists:
  - Windows: `tools/ffmpeg/ffmpeg.exe`
  - Linux: `tools/ffmpeg/ffmpeg`
- Try `/voice off` to validate text path independently

## Piper exits with error

- Wrong model/config path in `.env`
- Incompatible voice files
- Binary not executable (Linux permissions)

## WhatsApp voice format issues

- OpenTutor converts output to `OGG/Opus` using `ffmpeg`
- Verify `libopus` support in your ffmpeg build

## Group messages are ignored

Default behavior is to ignore groups.

Set in `.env`:

```env
ALLOW_GROUPS=true
```

## Rate limiting blocks messages

Adjust in `.env`:

- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_MESSAGES`
- `MIN_SECONDS_BETWEEN_REPLIES`
