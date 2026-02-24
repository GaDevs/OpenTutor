import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import mime from "mime-types";
import { MessageMedia, type Message } from "whatsapp-web.js";

export interface SttConfig {
  baseUrl: string;
  timeoutMs: number;
}

export interface TtsConfig {
  piperBin: string;
  piperModel: string;
  piperConfig?: string;
  ffmpegBin: string;
  tempDir: string;
}

export interface DownloadedMedia {
  inputPath: string;
  mimeType: string;
  cleanup: () => Promise<void>;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function extFromMime(mimeType: string): string {
  const ext = mime.extension(mimeType) || "bin";
  if (typeof ext !== "string") return "bin";
  return ext;
}

async function writeBase64File(filePath: string, base64: string): Promise<void> {
  const buffer = Buffer.from(base64, "base64");
  await fs.writeFile(filePath, buffer);
}

function spawnWithOutput(command: string, args: string[], options?: { stdinText?: string; cwd?: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], cwd: options?.cwd });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
    });

    if (options?.stdinText) {
      child.stdin.write(options.stdinText);
    }
    child.stdin.end();
  });
}

export async function downloadIncomingAudio(message: Message, tempDir: string): Promise<DownloadedMedia> {
  await ensureDir(tempDir);
  const media = await message.downloadMedia();
  if (!media) {
    throw new Error("Could not download media from WhatsApp message");
  }

  const mimeType = media.mimetype || "application/octet-stream";
  const ext = extFromMime(mimeType);
  const inputPath = path.join(tempDir, `${Date.now()}-${randomUUID()}.${ext}`);
  await writeBase64File(inputPath, media.data);

  return {
    inputPath,
    mimeType,
    cleanup: async () => {
      await fs.rm(inputPath, { force: true });
    }
  };
}

export async function transcribeAudio(filePath: string, config: SttConfig, language?: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const fileBytes = await fs.readFile(filePath);
    const form = new FormData();
    form.append("file", new Blob([fileBytes]), path.basename(filePath));
    if (language) form.append("language", language);

    const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/transcribe`, {
      method: "POST",
      body: form,
      signal: controller.signal
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`STT failed (${res.status}): ${body}`);
    }

    const json = (await res.json()) as { text?: string };
    return (json.text ?? "").trim();
  } finally {
    clearTimeout(timeout);
  }
}

export async function synthesizeVoiceNote(text: string, chatId: string, config: TtsConfig): Promise<{ media: MessageMedia; cleanup: () => Promise<void> }> {
  await ensureDir(config.tempDir);
  const baseName = `${Date.now()}-${chatId.replace(/[^\w.-]/g, "_")}-${randomUUID()}`;
  const wavPath = path.join(config.tempDir, `${baseName}.wav`);
  const oggPath = path.join(config.tempDir, `${baseName}.ogg`);

  const piperArgs = ["--model", config.piperModel, "--output_file", wavPath];
  if (config.piperConfig) {
    piperArgs.push("--config", config.piperConfig);
  }

  await spawnWithOutput(config.piperBin, piperArgs, { stdinText: text });
  await spawnWithOutput(config.ffmpegBin, [
    "-y",
    "-i",
    wavPath,
    "-c:a",
    "libopus",
    "-b:a",
    "32k",
    "-vbr",
    "on",
    "-compression_level",
    "10",
    oggPath
  ]);

  const media = MessageMedia.fromFilePath(oggPath);
  return {
    media,
    cleanup: async () => {
      await Promise.allSettled([fs.rm(wavPath, { force: true }), fs.rm(oggPath, { force: true })]);
    }
  };
}
