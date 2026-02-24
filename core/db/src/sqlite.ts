import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { runMigrations } from "./migrations";

export type TutorMode = "chat" | "lesson" | "drill" | "exam";
export type CorrectionsMode = "off" | "light" | "strict";

export interface UserSettings {
  mode: TutorMode;
  targetLanguage: string;
  level: string;
  goal: string;
  corrections: CorrectionsMode;
  voiceEnabled: boolean;
  sendTextWithVoice: boolean;
  allowGroups: boolean;
}

export interface UserProfile {
  chatId: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface SessionState {
  fsmState: string;
  currentTask: string;
  turnInState: number;
  updatedAt: string;
}

export interface MessageRecord {
  id: number;
  chatId: string;
  role: "user" | "assistant" | "system";
  source: "text" | "audio" | "command" | "internal";
  content: string;
  createdAt: string;
}

export interface UserMemory {
  summary: string;
  messagesSinceSummary: number;
  updatedAt: string;
}

export interface TutorContext {
  profile: UserProfile;
  settings: UserSettings;
  session: SessionState;
  memory: UserMemory;
  recentMessages: MessageRecord[];
}

export interface OpenTutorDbOptions {
  dbPath: string;
  defaults?: Partial<UserSettings>;
}

type AnyRecord = Record<string, unknown>;

const DEFAULT_SETTINGS: UserSettings = {
  mode: "lesson",
  targetLanguage: "en",
  level: "A1",
  goal: "",
  corrections: "light",
  voiceEnabled: true,
  sendTextWithVoice: true,
  allowGroups: false
};

export class OpenTutorDatabase {
  private readonly db: InstanceType<typeof BetterSqlite3>;
  private readonly defaults: UserSettings;

  constructor(options: OpenTutorDbOptions) {
    const dir = path.dirname(options.dbPath);
    fs.mkdirSync(dir, { recursive: true });
    this.db = new BetterSqlite3(options.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.defaults = { ...DEFAULT_SETTINGS, ...options.defaults };
    runMigrations(this.db);
  }

  close(): void {
    this.db.close();
  }

  ensureUser(chatId: string, displayName = ""): void {
    const now = new Date().toISOString();
    const upsertUser = this.db.prepare(`
      INSERT INTO users (chat_id, display_name, created_at, last_seen_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET
        display_name = CASE WHEN excluded.display_name <> '' THEN excluded.display_name ELSE users.display_name END,
        last_seen_at = excluded.last_seen_at
    `);
    const upsertSettings = this.db.prepare(`
      INSERT OR IGNORE INTO user_settings
      (chat_id, mode, target_language, level, goal, corrections, voice_enabled, send_text_with_voice, allow_groups, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const upsertSession = this.db.prepare(`
      INSERT OR IGNORE INTO session_state (chat_id, fsm_state, current_task, turn_in_state, updated_at)
      VALUES (?, 'IDLE', '', 0, ?)
    `);
    const upsertMemory = this.db.prepare(`
      INSERT OR IGNORE INTO user_memory (chat_id, summary, messages_since_summary, updated_at)
      VALUES (?, '', 0, ?)
    `);

    const tx = this.db.transaction(() => {
      upsertUser.run(chatId, displayName, now, now);
      upsertSettings.run(
        chatId,
        this.defaults.mode,
        this.defaults.targetLanguage,
        this.defaults.level,
        this.defaults.goal,
        this.defaults.corrections,
        this.defaults.voiceEnabled ? 1 : 0,
        this.defaults.sendTextWithVoice ? 1 : 0,
        this.defaults.allowGroups ? 1 : 0,
        now
      );
      upsertSession.run(chatId, now);
      upsertMemory.run(chatId, now);
    });

    tx();
  }

  getTutorContext(chatId: string, displayName = "", recentLimit = 12): TutorContext {
    this.ensureUser(chatId, displayName);
    const profile = this.getUserProfile(chatId);
    const settings = this.getUserSettings(chatId);
    const session = this.getSessionState(chatId);
    const memory = this.getUserMemory(chatId);
    const recentMessages = this.getRecentMessages(chatId, recentLimit);
    return { profile, settings, session, memory, recentMessages };
  }

  getUserProfile(chatId: string): UserProfile {
    const row = this.db
      .prepare("SELECT chat_id, COALESCE(display_name, '') AS display_name, created_at, last_seen_at FROM users WHERE chat_id = ?")
      .get(chatId) as { chat_id: string; display_name: string; created_at: string; last_seen_at: string } | undefined;
    if (!row) {
      throw new Error(`User profile not found for chatId=${chatId}`);
    }
    return {
      chatId: row.chat_id,
      displayName: row.display_name,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at
    };
  }

  getUserSettings(chatId: string): UserSettings {
    const row = this.db
      .prepare(
        "SELECT mode, target_language, level, goal, corrections, voice_enabled, send_text_with_voice, allow_groups FROM user_settings WHERE chat_id = ?"
      )
      .get(chatId) as
      | {
          mode: TutorMode;
          target_language: string;
          level: string;
          goal: string;
          corrections: CorrectionsMode;
          voice_enabled: number;
          send_text_with_voice: number;
          allow_groups: number;
        }
      | undefined;

    if (!row) {
      throw new Error(`User settings not found for chatId=${chatId}`);
    }

    return {
      mode: row.mode,
      targetLanguage: row.target_language,
      level: row.level,
      goal: row.goal,
      corrections: row.corrections,
      voiceEnabled: row.voice_enabled === 1,
      sendTextWithVoice: row.send_text_with_voice === 1,
      allowGroups: row.allow_groups === 1
    };
  }

  updateUserSettings(chatId: string, patch: Partial<UserSettings>): UserSettings {
    this.ensureUser(chatId);
    const current = this.getUserSettings(chatId);
    const next: UserSettings = { ...current, ...patch };
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE user_settings
         SET mode = ?, target_language = ?, level = ?, goal = ?, corrections = ?, voice_enabled = ?, send_text_with_voice = ?, allow_groups = ?, updated_at = ?
         WHERE chat_id = ?`
      )
      .run(
        next.mode,
        next.targetLanguage,
        next.level,
        next.goal,
        next.corrections,
        next.voiceEnabled ? 1 : 0,
        next.sendTextWithVoice ? 1 : 0,
        next.allowGroups ? 1 : 0,
        now,
        chatId
      );
    return next;
  }

  getSessionState(chatId: string): SessionState {
    const row = this.db
      .prepare("SELECT fsm_state, current_task, turn_in_state, updated_at FROM session_state WHERE chat_id = ?")
      .get(chatId) as { fsm_state: string; current_task: string; turn_in_state: number; updated_at: string } | undefined;

    if (!row) {
      throw new Error(`Session state not found for chatId=${chatId}`);
    }

    return {
      fsmState: row.fsm_state,
      currentTask: row.current_task,
      turnInState: row.turn_in_state,
      updatedAt: row.updated_at
    };
  }

  updateSessionState(chatId: string, patch: Partial<Pick<SessionState, "fsmState" | "currentTask" | "turnInState">>): SessionState {
    this.ensureUser(chatId);
    const current = this.getSessionState(chatId);
    const next: SessionState = {
      ...current,
      fsmState: patch.fsmState ?? current.fsmState,
      currentTask: patch.currentTask ?? current.currentTask,
      turnInState: patch.turnInState ?? current.turnInState,
      updatedAt: new Date().toISOString()
    };
    this.db
      .prepare("UPDATE session_state SET fsm_state = ?, current_task = ?, turn_in_state = ?, updated_at = ? WHERE chat_id = ?")
      .run(next.fsmState, next.currentTask, next.turnInState, next.updatedAt, chatId);
    return next;
  }

  getUserMemory(chatId: string): UserMemory {
    const row = this.db
      .prepare("SELECT summary, messages_since_summary, updated_at FROM user_memory WHERE chat_id = ?")
      .get(chatId) as { summary: string; messages_since_summary: number; updated_at: string } | undefined;
    if (!row) {
      throw new Error(`User memory not found for chatId=${chatId}`);
    }
    return {
      summary: row.summary,
      messagesSinceSummary: row.messages_since_summary,
      updatedAt: row.updated_at
    };
  }

  setUserSummary(chatId: string, summary: string): UserMemory {
    this.ensureUser(chatId);
    const now = new Date().toISOString();
    this.db
      .prepare("UPDATE user_memory SET summary = ?, messages_since_summary = 0, updated_at = ? WHERE chat_id = ?")
      .run(summary, now, chatId);
    return this.getUserMemory(chatId);
  }

  appendMessage(
    chatId: string,
    role: MessageRecord["role"],
    source: MessageRecord["source"],
    content: string
  ): MessageRecord {
    this.ensureUser(chatId);
    const now = new Date().toISOString();
    const insert = this.db.prepare(
      "INSERT INTO messages (chat_id, role, source, content, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    const bumpMemory = this.db.prepare(
      "UPDATE user_memory SET messages_since_summary = messages_since_summary + 1, updated_at = ? WHERE chat_id = ?"
    );
    const touchUser = this.db.prepare("UPDATE users SET last_seen_at = ? WHERE chat_id = ?");
    const tx = this.db.transaction(() => {
      const result = insert.run(chatId, role, source, content, now);
      bumpMemory.run(now, chatId);
      touchUser.run(now, chatId);
      return Number(result.lastInsertRowid);
    });
    const id = tx();
    return {
      id,
      chatId,
      role,
      source,
      content,
      createdAt: now
    };
  }

  getRecentMessages(chatId: string, limit = 12): MessageRecord[] {
    const rows = this.db
      .prepare(
        "SELECT id, chat_id, role, source, content, created_at FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?"
      )
      .all(chatId, limit) as Array<{
      id: number;
      chat_id: string;
      role: MessageRecord["role"];
      source: MessageRecord["source"];
      content: string;
      created_at: string;
    }>;

    return rows
      .reverse()
      .map((row) => ({
        id: row.id,
        chatId: row.chat_id,
        role: row.role,
        source: row.source,
        content: row.content,
        createdAt: row.created_at
      }));
  }

  addVocabSeen(chatId: string, term: string, sourceSentence = ""): void {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return;
    this.ensureUser(chatId);
    this.db
      .prepare(
        `INSERT INTO vocab_seen (chat_id, term, source_sentence, seen_count, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
         ON CONFLICT(chat_id, term) DO UPDATE SET
           seen_count = seen_count + 1,
           source_sentence = excluded.source_sentence,
           last_seen_at = datetime('now')`
      )
      .run(chatId, normalized, sourceSentence);
  }

  addMistake(chatId: string, inputText: string, correctionText: string, category = "general"): void {
    this.ensureUser(chatId);
    this.db
      .prepare("INSERT INTO mistakes (chat_id, category, input_text, correction_text, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(chatId, category, inputText, correctionText, new Date().toISOString());
  }

  logEvent(level: "debug" | "info" | "warn" | "error", eventType: string, payload: AnyRecord = {}, chatId?: string): void {
    this.db
      .prepare("INSERT INTO event_logs (chat_id, level, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(chatId ?? null, level, eventType, JSON.stringify(payload), new Date().toISOString());
  }

  getRecentMistakes(chatId: string, limit = 5): Array<{ inputText: string; correctionText: string; category: string }> {
    return this.db
      .prepare("SELECT input_text, correction_text, category FROM mistakes WHERE chat_id = ? ORDER BY id DESC LIMIT ?")
      .all(chatId, limit)
      .map((row: unknown) => ({
        inputText: String((row as AnyRecord).input_text ?? ""),
        correctionText: String((row as AnyRecord).correction_text ?? ""),
        category: String((row as AnyRecord).category ?? "general")
      }));
  }
}
