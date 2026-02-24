import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import type { Message } from "whatsapp-web.js";
import { OpenTutorDatabase } from "@opentutor/db";
import { OllamaProvider } from "@opentutor/llm";
import { TutorEngine } from "@opentutor/tutor";
import { handleCommand } from "./commands";
import { downloadIncomingAudio, synthesizeVoiceNote, transcribeAudio } from "./media";
import { LoopGuard, PerUserRateLimiter } from "./rateLimit";
import { createWhatsAppClient } from "./whatsapp";

interface AppConfig {
  allowGroups: boolean;
  sendTextWithVoiceDefault: boolean;
  maxResponseChars: number;
  tempDir: string;
  sessionDir: string;
  dbPath: string;
  summaryEveryNMessages: number;
  maxHistoryMessages: number;
  rateLimitWindowMs: number;
  rateLimitMaxMessages: number;
  minSecondsBetweenReplies: number;
  stt: {
    baseUrl: string;
    timeoutMs: number;
  };
  tts: {
    piperBin: string;
    piperModel: string;
    piperConfig?: string;
    ffmpegBin: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
    timeoutMs: number;
  };
  defaults: {
    targetLanguage: string;
    mode: "chat" | "lesson" | "drill" | "exam";
    corrections: "off" | "light" | "strict";
  };
}

function envBool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function envInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function loadConfig(): AppConfig {
  const tempDir = process.env.TEMP_DIR || "./tmp";
  const sessionDir = process.env.WHATSAPP_SESSION_DIR || "./sessions";
  const dbPath = process.env.DB_PATH || "./data/opentutor.sqlite";
  return {
    allowGroups: envBool("ALLOW_GROUPS", false),
    sendTextWithVoiceDefault: envBool("SEND_TEXT_WITH_VOICE", true),
    maxResponseChars: envInt("MAX_RESPONSE_CHARS", 800),
    tempDir,
    sessionDir,
    dbPath,
    summaryEveryNMessages: envInt("SUMMARY_EVERY_N_MESSAGES", 8),
    maxHistoryMessages: envInt("MAX_HISTORY_MESSAGES", 12),
    rateLimitWindowMs: envInt("RATE_LIMIT_WINDOW_MS", 60_000),
    rateLimitMaxMessages: envInt("RATE_LIMIT_MAX_MESSAGES", 20),
    minSecondsBetweenReplies: envInt("MIN_SECONDS_BETWEEN_REPLIES", 1),
    stt: {
      baseUrl: process.env.STT_BASE_URL || "http://127.0.0.1:8001",
      timeoutMs: envInt("STT_TIMEOUT_MS", 120_000)
    },
    tts: {
      piperBin: process.env.PIPER_BIN || "piper",
      piperModel: process.env.PIPER_MODEL || "./services/tts/voices/en_US-lessac-medium.onnx",
      piperConfig: process.env.PIPER_CONFIG || undefined,
      ffmpegBin: process.env.FFMPEG_BIN || "ffmpeg"
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
      model: process.env.MODEL || "llama3.1",
      timeoutMs: envInt("OLLAMA_TIMEOUT_MS", 60_000)
    },
    defaults: {
      targetLanguage: process.env.DEFAULT_TARGET_LANGUAGE || "en",
      mode: ((process.env.DEFAULT_MODE || "lesson").toLowerCase() as AppConfig["defaults"]["mode"]),
      corrections: ((process.env.DEFAULT_CORRECTIONS || "light").toLowerCase() as AppConfig["defaults"]["corrections"])
    }
  };
}

function isAudioMessage(msg: Message): boolean {
  return msg.hasMedia && (msg.type === "audio" || msg.type === "ptt");
}

function isTextMessage(msg: Message): boolean {
  return typeof msg.body === "string" && msg.body.trim().length > 0;
}

async function processMessage(msg: Message, deps: {
  config: AppConfig;
  db: OpenTutorDatabase;
  tutor: TutorEngine;
  rateLimiter: PerUserRateLimiter;
  loopGuard: LoopGuard;
}): Promise<void> {
  const { config, db, tutor, rateLimiter, loopGuard } = deps;

  if (msg.fromMe) return;
  if (msg.from === "status@broadcast") return;

  const chat = await msg.getChat();
  if (chat.isGroup && !config.allowGroups) {
    return;
  }

  const contact = await msg.getContact();
  const chatId = msg.from;
  const displayName = contact.pushname || contact.name || contact.number || "";

  db.ensureUser(chatId, displayName);
  db.logEvent("info", "message.received", { type: msg.type, hasMedia: msg.hasMedia }, chatId);

  const incomingDecision = rateLimiter.allowIncoming(chatId);
  if (!incomingDecision.allowed) {
    db.logEvent("warn", "rate_limited.incoming", { retryAfterMs: incomingDecision.retryAfterMs }, chatId);
    return;
  }

  if (isTextMessage(msg) && msg.body.trim().startsWith("/")) {
    const commandResult = handleCommand(db, chatId, msg.body, displayName);
    if (commandResult.handled && commandResult.reply) {
      const replyDecision = rateLimiter.allowReply(chatId);
      if (!replyDecision.allowed) return;
      await msg.reply(commandResult.reply);
    }
    return;
  }

  let learnerText = "";
  let source: "text" | "audio" = "text";
  let tempCleanup: (() => Promise<void>) | undefined;

  try {
    if (isAudioMessage(msg)) {
      source = "audio";
      const media = await downloadIncomingAudio(msg, config.tempDir);
      tempCleanup = media.cleanup;
      const userSettings = db.getUserSettings(chatId);
      learnerText = await transcribeAudio(media.inputPath, config.stt, userSettings.targetLanguage);
      if (!learnerText) {
        await msg.reply("I could not transcribe that audio. Please try again or send text.");
        return;
      }
      db.logEvent("info", "stt.transcribed", { chars: learnerText.length }, chatId);
    } else if (isTextMessage(msg)) {
      source = "text";
      learnerText = msg.body.trim();
    } else {
      return;
    }

    const replyDecision = rateLimiter.allowReply(chatId);
    if (!replyDecision.allowed) {
      db.logEvent("warn", "rate_limited.reply", { retryAfterMs: replyDecision.retryAfterMs }, chatId);
      return;
    }

    const turn = await tutor.handleTurn({
      chatId,
      userText: learnerText,
      source,
      displayName
    });

    if (loopGuard.shouldBlock(chatId, turn.replyText)) {
      db.logEvent("warn", "loop_guard.blocked", { preview: turn.replyText.slice(0, 80) }, chatId);
      await msg.reply("Loop protection triggered. Please send a new prompt or use /start.");
      return;
    }

    const userSettings = turn.context.settings;
    const shouldSendVoice = userSettings.voiceEnabled;
    const shouldSendText = !shouldSendVoice || userSettings.sendTextWithVoice || config.sendTextWithVoiceDefault;

    if (shouldSendText) {
      await msg.reply(turn.replyText);
    }

    if (shouldSendVoice) {
      const voice = await synthesizeVoiceNote(turn.replyText, chatId, {
        piperBin: config.tts.piperBin,
        piperModel: config.tts.piperModel,
        piperConfig: config.tts.piperConfig,
        ffmpegBin: config.tts.ffmpegBin,
        tempDir: config.tempDir
      });
      try {
        await chat.sendMessage(voice.media, { sendAudioAsVoice: true });
      } finally {
        await voice.cleanup();
      }
    }

    db.logEvent("info", "message.replied", { chars: turn.replyText.length, source }, chatId);
  } catch (error) {
    db.logEvent("error", "message.failed", { error: String(error) }, chatId);
    console.error("[app] message processing failed:", error);
    await msg.reply(
      "OpenTutor had an error processing your message. Check Ollama/STT/Piper/ffmpeg and see docs/TROUBLESHOOTING.md."
    );
  } finally {
    if (tempCleanup) {
      await tempCleanup().catch(() => undefined);
    }
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  for (const dir of [config.tempDir, config.sessionDir, path.dirname(config.dbPath)]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new OpenTutorDatabase({
    dbPath: config.dbPath,
    defaults: {
      targetLanguage: config.defaults.targetLanguage,
      mode: config.defaults.mode,
      corrections: config.defaults.corrections,
      sendTextWithVoice: config.sendTextWithVoiceDefault
    }
  });

  const llm = new OllamaProvider({
    baseUrl: config.ollama.baseUrl,
    model: config.ollama.model,
    timeoutMs: config.ollama.timeoutMs
  });

  const tutor = new TutorEngine({
    db,
    llm,
    summaryEveryNMessages: config.summaryEveryNMessages,
    maxHistoryMessages: config.maxHistoryMessages,
    maxResponseChars: config.maxResponseChars
  });

  const rateLimiter = new PerUserRateLimiter({
    windowMs: config.rateLimitWindowMs,
    maxMessages: config.rateLimitMaxMessages,
    minSecondsBetweenReplies: config.minSecondsBetweenReplies
  });
  const loopGuard = new LoopGuard();

  console.log(`[app] OpenTutor starting`);
  console.log(`[app] Ollama: ${config.ollama.baseUrl} model=${config.ollama.model}`);
  console.log(`[app] STT: ${config.stt.baseUrl}`);
  console.log(`[app] TTS Piper model: ${config.tts.piperModel}`);
  console.log(`[app] DB: ${config.dbPath}`);

  if (llm.healthCheck) {
    const ok = await llm.healthCheck();
    console.log(`[app] Ollama health: ${ok ? "ok" : "unreachable (will retry on first message)"}`);
  }

  const client = createWhatsAppClient({
    sessionDir: config.sessionDir,
    headless: true
  });

  client.on("message", (msg) => {
    void processMessage(msg, { config, db, tutor, rateLimiter, loopGuard });
  });

  process.on("SIGINT", () => {
    console.log("[app] shutting down");
    try {
      db.close();
    } catch {
      // ignore
    }
    void client.destroy().finally(() => process.exit(0));
  });

  await client.initialize();
}

void main().catch((error) => {
  console.error("[app] fatal error:", error);
  process.exit(1);
});
