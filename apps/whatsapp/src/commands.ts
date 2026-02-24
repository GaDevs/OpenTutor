import type { CorrectionsMode, OpenTutorDatabase, TutorMode, UserSettings } from "@opentutor/db";

export interface CommandResult {
  handled: boolean;
  reply?: string;
}

function usageHelp(): string {
  return [
    "OpenTutor commands:",
    "/start - onboarding",
    "/help - show commands",
    "/mode chat|lesson|drill|exam",
    "/level <A1|A2|B1|B2|C1|C2 or custom>",
    "/goal <your goal>",
    "/corrections off|light|strict",
    "/language <en|es|fr|de|it|...>",
    "/voice on|off"
  ].join("\n");
}

function parseCommandLine(input: string): { command: string; args: string[]; rawArgs: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) {
    return { command: trimmed.slice(1).toLowerCase(), args: [], rawArgs: "" };
  }
  const command = trimmed.slice(1, firstSpace).toLowerCase();
  const rawArgs = trimmed.slice(firstSpace + 1).trim();
  const args = rawArgs ? rawArgs.split(/\s+/) : [];
  return { command, args, rawArgs };
}

function settingsSummary(settings: UserSettings): string {
  return [
    `Mode: ${settings.mode}`,
    `Target language: ${settings.targetLanguage}`,
    `Level: ${settings.level}`,
    `Goal: ${settings.goal || "(not set)"}`,
    `Corrections: ${settings.corrections}`,
    `Voice: ${settings.voiceEnabled ? "on" : "off"}`
  ].join("\n");
}

export function handleCommand(db: OpenTutorDatabase, chatId: string, text: string, displayName = ""): CommandResult {
  const parsed = parseCommandLine(text);
  if (!parsed) return { handled: false };

  db.ensureUser(chatId, displayName);
  db.appendMessage(chatId, "user", "command", text.slice(0, 500));

  const { command, args, rawArgs } = parsed;
  const replyPrefix = "OpenTutor";

  if (command === "start") {
    const settings = db.getUserSettings(chatId);
    const reply = [
      `${replyPrefix} is ready.`,
      "I am your language tutor on WhatsApp (text + voice).",
      "Set your target language and preferences, then send a message or audio.",
      "",
      "Recommended setup:",
      "/language en",
      "/mode lesson",
      "/level A1",
      "/corrections light",
      "/voice on",
      "",
      settingsSummary(settings),
      "",
      "Type /help for all commands."
    ].join("\n");
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  if (command === "help") {
    const reply = usageHelp();
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  if (command === "mode") {
    const value = (args[0] ?? "").toLowerCase() as TutorMode;
    if (!["chat", "lesson", "drill", "exam"].includes(value)) {
      return { handled: true, reply: "Usage: /mode chat|lesson|drill|exam" };
    }
    const settings = db.updateUserSettings(chatId, { mode: value });
    db.updateSessionState(chatId, { fsmState: "IDLE", currentTask: "", turnInState: 0 });
    const reply = `Mode updated to ${settings.mode}.`;
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  if (command === "level") {
    if (!rawArgs) return { handled: true, reply: "Usage: /level A1|A2|B1|B2|C1|C2 (or custom)" };
    const value = rawArgs.slice(0, 20);
    db.updateUserSettings(chatId, { level: value });
    const reply = `Level updated to ${value}.`;
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  if (command === "goal") {
    if (!rawArgs) return { handled: true, reply: "Usage: /goal <your learning goal>" };
    const value = rawArgs.slice(0, 240);
    db.updateUserSettings(chatId, { goal: value });
    const reply = `Goal saved: ${value}`;
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  if (command === "corrections") {
    const value = (args[0] ?? "").toLowerCase() as CorrectionsMode;
    if (!["off", "light", "strict"].includes(value)) {
      return { handled: true, reply: "Usage: /corrections off|light|strict" };
    }
    db.updateUserSettings(chatId, { corrections: value });
    const reply = `Corrections mode set to ${value}.`;
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  if (command === "language") {
    const value = (args[0] ?? "").toLowerCase();
    if (!/^[a-z]{2,8}(-[a-z]{2,8})?$/i.test(value)) {
      return { handled: true, reply: "Usage: /language <en|es|fr|de|it|pt-BR...>" };
    }
    db.updateUserSettings(chatId, { targetLanguage: value });
    const reply = `Target language set to ${value}.`;
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  if (command === "voice") {
    const value = (args[0] ?? "").toLowerCase();
    if (!["on", "off"].includes(value)) {
      return { handled: true, reply: "Usage: /voice on|off" };
    }
    db.updateUserSettings(chatId, { voiceEnabled: value === "on" });
    const reply = `Voice replies ${value}.`;
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  if (command === "settings") {
    const settings = db.getUserSettings(chatId);
    const reply = settingsSummary(settings);
    db.appendMessage(chatId, "assistant", "text", reply);
    return { handled: true, reply };
  }

  return {
    handled: true,
    reply: `Unknown command: /${command}\n\n${usageHelp()}`
  };
}
