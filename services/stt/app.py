import os
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel


APP_TITLE = "OpenTutor STT Service"
MODEL_NAME = os.getenv("STT_MODEL_SIZE", "small")
DEVICE = os.getenv("STT_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "int8")
DEFAULT_BEAM_SIZE = int(os.getenv("STT_BEAM_SIZE", "1"))


app = FastAPI(title=APP_TITLE, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


print(f"[stt] Loading Faster-Whisper model={MODEL_NAME} device={DEVICE} compute_type={COMPUTE_TYPE}")
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "model": MODEL_NAME,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default=None),
    beam_size: Optional[int] = Form(default=None),
) -> dict:
    suffix = Path(file.filename or "audio.bin").suffix or ".bin"
    bs = beam_size if beam_size is not None else DEFAULT_BEAM_SIZE

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_path = tmp.name
        data = await file.read()
        tmp.write(data)

    try:
        segments, info = model.transcribe(
            temp_path,
            language=language or None,
            beam_size=bs,
            vad_filter=True,
        )
        text = " ".join([seg.text.strip() for seg in segments]).strip()
        return {
            "text": text,
            "language": getattr(info, "language", language),
            "duration": getattr(info, "duration", None),
        }
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
