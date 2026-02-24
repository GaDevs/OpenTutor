# Contributing

## Development setup

1. Install dependencies (`pnpm install`)
2. Copy `.env.example` to `.env`
3. Set up local services (Ollama, STT, Piper/ffmpeg)
4. Run `pnpm dev`

## Guidelines

- Keep TypeScript strict and avoid hidden `any`
- Prefer small, testable modules
- Document behavior changes in `docs/`
- Do not commit secrets, sessions, databases, or large models

## Pull requests

- Describe the use case and behavior change
- Include setup/verification steps
- Update docs when commands/config/flows change
