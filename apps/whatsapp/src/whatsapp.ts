import qrcode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";

export interface WhatsAppClientOptions {
  sessionDir: string;
  headless?: boolean;
}

export function createWhatsAppClient(options: WhatsAppClientOptions): Client {
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: options.sessionDir
    }),
    puppeteer: {
      headless: options.headless ?? true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    }
  });

  client.on("qr", (qr) => {
    console.log("[whatsapp] QR received. Scan with WhatsApp:");
    qrcode.generate(qr, { small: true });
  });

  client.on("loading_screen", (percent, message) => {
    console.log(`[whatsapp] loading ${percent}% - ${message}`);
  });

  client.on("authenticated", () => {
    console.log("[whatsapp] authenticated");
  });

  client.on("auth_failure", (message) => {
    console.error("[whatsapp] auth failure:", message);
  });

  client.on("ready", () => {
    console.log("[whatsapp] client ready");
  });

  client.on("disconnected", (reason) => {
    console.warn("[whatsapp] disconnected:", reason);
  });

  return client;
}
