import type { LlmGenerateRequest, LlmGenerateResponse, LlmProvider } from "./provider";

export interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

interface OllamaGenerateApiResponse {
  model?: string;
  response?: string;
  done?: boolean;
  done_reason?: string;
}

export class OllamaProvider implements LlmProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: OllamaProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          prompt: request.prompt,
          system: request.system,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.5,
            num_predict: request.maxTokens
          }
        })
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Ollama /api/generate failed (${res.status}): ${body}`);
      }

      const data = (await res.json()) as OllamaGenerateApiResponse;
      return {
        text: (data.response ?? "").trim(),
        model: data.model ?? this.model,
        raw: data
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
