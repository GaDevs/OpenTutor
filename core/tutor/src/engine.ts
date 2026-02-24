import type { OpenTutorDatabase, TutorContext } from "@opentutor/db";
import type { LlmProvider } from "@opentutor/llm";
import { transitionFsm, normalizeFsmState } from "./fsm";
import { recordLearnerSignals, shouldRefreshSummary } from "./memory";
import { getTutorPolicy } from "./policies";
import { buildSummaryPrompt, buildTutorSystemPrompt, buildTutorUserPrompt } from "./prompts";
import { clampText, sanitizeIncomingText, stripUnsafeControlChars } from "./sanitize";

export interface TutorEngineOptions {
  db: OpenTutorDatabase;
  llm: LlmProvider;
  summaryEveryNMessages?: number;
  maxHistoryMessages?: number;
  maxResponseChars?: number;
}

export interface TutorTurnInput {
  chatId: string;
  userText: string;
  source: "text" | "audio";
  displayName?: string;
}

export interface TutorTurnResult {
  replyText: string;
  userText: string;
  context: TutorContext;
  summaryUpdated: boolean;
}

export class TutorEngine {
  private readonly db: OpenTutorDatabase;
  private readonly llm: LlmProvider;
  private readonly summaryEveryNMessages: number;
  private readonly maxHistoryMessages: number;
  private readonly maxResponseChars: number;

  constructor(options: TutorEngineOptions) {
    this.db = options.db;
    this.llm = options.llm;
    this.summaryEveryNMessages = options.summaryEveryNMessages ?? 8;
    this.maxHistoryMessages = options.maxHistoryMessages ?? 12;
    this.maxResponseChars = options.maxResponseChars ?? 800;
  }

  async handleTurn(input: TutorTurnInput): Promise<TutorTurnResult> {
    const cleanUserText = sanitizeIncomingText(stripUnsafeControlChars(input.userText));
    if (!cleanUserText) {
      throw new Error("Empty user text after sanitization");
    }

    let context = this.db.getTutorContext(input.chatId, input.displayName ?? "", this.maxHistoryMessages);
    this.db.appendMessage(input.chatId, "user", input.source, cleanUserText);

    const normalizedState = normalizeFsmState(context.session.fsmState);
    const fsmResult = transitionFsm({
      currentState: normalizedState,
      mode: context.settings.mode,
      userText: cleanUserText
    });

    this.db.updateSessionState(input.chatId, {
      fsmState: fsmResult.nextState,
      currentTask: fsmResult.currentTask,
      turnInState: context.session.turnInState + fsmResult.turnIncrement
    });

    context = this.db.getTutorContext(input.chatId, input.displayName ?? "", this.maxHistoryMessages);
    const policy = getTutorPolicy(context.settings.mode, context.settings.corrections);
    const prompt = buildTutorUserPrompt({
      context,
      userInput: cleanUserText,
      fsmState: normalizeFsmState(context.session.fsmState),
      currentTask: context.session.currentTask,
      policy
    });

    const llmResponse = await this.llm.generate({
      system: buildTutorSystemPrompt(),
      prompt,
      temperature: policy.temperature,
      maxTokens: 240
    });

    const replyText = clampText(sanitizeIncomingText(stripUnsafeControlChars(llmResponse.text || "")), this.maxResponseChars);
    if (!replyText) {
      throw new Error("LLM returned empty response");
    }

    this.db.appendMessage(input.chatId, "assistant", "text", replyText);
    recordLearnerSignals(this.db, input.chatId, cleanUserText, replyText);

    let summaryUpdated = false;
    const memory = this.db.getUserMemory(input.chatId);
    if (shouldRefreshSummary(memory.messagesSinceSummary, this.summaryEveryNMessages)) {
      summaryUpdated = await this.refreshSummary(input.chatId, input.displayName ?? "");
    }

    const finalContext = this.db.getTutorContext(input.chatId, input.displayName ?? "", this.maxHistoryMessages);
    return {
      replyText,
      userText: cleanUserText,
      context: finalContext,
      summaryUpdated
    };
  }

  private async refreshSummary(chatId: string, displayName: string): Promise<boolean> {
    try {
      const context = this.db.getTutorContext(chatId, displayName, Math.max(20, this.maxHistoryMessages * 2));
      const recentMessages = this.db.getRecentMessages(chatId, Math.max(20, this.maxHistoryMessages * 2));
      const summaryPrompt = buildSummaryPrompt({ context, recentMessages });
      const summary = await this.llm.generate({
        system: summaryPrompt.system,
        prompt: summaryPrompt.prompt,
        temperature: 0.2,
        maxTokens: 180
      });
      const text = clampText(sanitizeIncomingText(summary.text), 800);
      if (text) {
        this.db.setUserSummary(chatId, text);
        this.db.logEvent("info", "memory.summary.updated", { length: text.length }, chatId);
        return true;
      }
    } catch (error) {
      this.db.logEvent("warn", "memory.summary.failed", { error: String(error) }, chatId);
    }
    return false;
  }
}
