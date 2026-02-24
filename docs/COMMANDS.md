# Commands

OpenTutor supports the following WhatsApp commands.

## Onboarding and help

- `/start` : show onboarding and recommended setup
- `/help` : show command list

## Mode and learning behavior

- `/mode chat|lesson|drill|exam`
- `/level <value>`
- `/goal <free text>`
- `/corrections off|light|strict`
- `/language <target language code>`

## Voice behavior

- `/voice on|off`

## Additional utility

- `/settings` : print current settings summary

## Examples

```text
/start
/language en
/mode lesson
/level A2
/goal Speak confidently in work meetings
/corrections light
/voice on
```

## Notes

- Commands are parsed from text messages starting with `/`
- Unknown commands return help text
- Commands are persisted per user in SQLite
