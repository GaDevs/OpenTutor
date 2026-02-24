export interface LlmGenerateRequest {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

export interface LlmGenerateResponse {
  text: string;
  model?: string;
  raw?: unknown;
}

export interface LlmProvider {
  generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse>;
  healthCheck?(): Promise<boolean>;
}
