# Local ffmpeg (optional)

This folder is an optional place to store a project-local `ffmpeg` binary.

OpenTutor will auto-detect these paths when `FFMPEG_BIN` is not explicitly set:

- Windows: `./tools/ffmpeg/ffmpeg.exe`
- Linux: `./tools/ffmpeg/ffmpeg`

Why this folder exists:

- Easier onboarding (everything feels "inside the project")
- No need to modify global PATH on some machines
- Lets each developer keep their own local binary (ignored by git)

## Usage

1. Put the binary here
2. Keep filename as `ffmpeg` or `ffmpeg.exe`
3. Run `pnpm dev`

Optional explicit config:

```env
FFMPEG_BIN=./tools/ffmpeg/ffmpeg
```
