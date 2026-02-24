# Pedagogy

OpenTutor is designed as a language tutor, not a generic chatbot.

## Core principles

- Short replies
- One question at a time
- Active production over passive explanation
- Limited corrections to avoid overload
- Repetition and recall
- Context continuity via memory summary

## Tutor Engine rules

The Tutor Engine builds every LLM prompt from:

1. Learner profile (level, goal)
2. Learner settings (mode, target language, correction mode, voice preference)
3. Session FSM state + current task
4. Memory summary (persisted)
5. Recent message history
6. Current learner input

The LLM does not choose the teaching strategy alone.

## Modes

### `chat`

- Free conversation in target language
- Minimal structure, still concise
- One follow-up question

### `lesson`

- Micro-topic introduction
- Guided examples
- Short practice prompts

### `drill`

- Repetition and pattern practice
- Fast prompts
- Quick correction cycles

### `exam`

- More strict evaluation
- Fewer hints
- Avoid revealing answers too early

## Correction policies

### `off`

- No explicit corrections unless learner asks

### `light`

- Correct only high-impact errors
- Max ~2 corrections
- Keep flow moving

### `strict`

- More direct correction
- Max ~3 corrections
- Still concise (no long grammar essay)

## FSM (Finite State Machine)

States:

- `IDLE`
- `LESSON_INTRO`
- `PRACTICE`
- `FEEDBACK`

Why use FSM:

- Prevents chaotic tutor behavior
- Makes mode behavior more predictable
- Gives the model a concrete current task

## Memory summary

Every N messages (default `8`), OpenTutor asks the LLM to generate a compact summary of:

- Level signals
- Recurring mistakes
- Useful vocabulary
- Goal
- Recommended next practice

This summary is stored in SQLite and injected into future prompts.

## Why this works better than raw chat

- The tutor remains focused on learning outcomes
- Corrections are bounded
- Prompt context is compact and persistent
- User settings directly shape behavior
