PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  chat_id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_settings (
  chat_id TEXT PRIMARY KEY REFERENCES users(chat_id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'lesson',
  target_language TEXT NOT NULL DEFAULT 'en',
  level TEXT NOT NULL DEFAULT 'A1',
  goal TEXT NOT NULL DEFAULT '',
  corrections TEXT NOT NULL DEFAULT 'light',
  voice_enabled INTEGER NOT NULL DEFAULT 1,
  send_text_with_voice INTEGER NOT NULL DEFAULT 1,
  allow_groups INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_state (
  chat_id TEXT PRIMARY KEY REFERENCES users(chat_id) ON DELETE CASCADE,
  fsm_state TEXT NOT NULL DEFAULT 'IDLE',
  current_task TEXT NOT NULL DEFAULT '',
  turn_in_state INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_memory (
  chat_id TEXT PRIMARY KEY REFERENCES users(chat_id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  messages_since_summary INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL REFERENCES users(chat_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_id ON messages(chat_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages(chat_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vocab_seen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL REFERENCES users(chat_id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  source_sentence TEXT NOT NULL DEFAULT '',
  seen_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(chat_id, term)
);

CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL REFERENCES users(chat_id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  input_text TEXT NOT NULL,
  correction_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
