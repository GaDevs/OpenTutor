# Security

## Important warning

OpenTutor uses `whatsapp-web.js`, which is not an official WhatsApp Business API integration.

Use at your own risk and review platform terms for your use case.

## Local data storage

OpenTutor stores data locally in SQLite:

- User settings
- Learning progress summary
- Message history excerpts
- Mistakes/vocabulary
- Event logs

Database default path:

- `./data/opentutor.sqlite`

## Secrets

- Do not commit `.env`
- Do not commit session files (`./sessions`)
- Do not commit local databases or logs

## Operational safeguards

- Per-user rate limiting
- Minimum reply spacing
- Loop protection for repeated responses
- Response length caps
- Groups ignored by default (configurable)

## Privacy notes

- STT, LLM, and TTS are local services when configured as documented
- No paid/cloud API keys are required
- Privacy still depends on your machine security and local network settings

## Hardening suggestions

- Restrict local service ports to localhost
- Use OS-level disk encryption
- Run under a non-admin user
- Back up SQLite securely
- Rotate/delete message history if needed for compliance
