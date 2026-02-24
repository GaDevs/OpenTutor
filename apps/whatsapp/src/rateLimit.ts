interface BucketState {
  count: number;
  windowStart: number;
  lastReplyAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs?: number;
  reason?: string;
}

export class PerUserRateLimiter {
  private readonly windowMs: number;
  private readonly maxMessages: number;
  private readonly minSecondsBetweenReplies: number;
  private readonly buckets = new Map<string, BucketState>();

  constructor(options: { windowMs: number; maxMessages: number; minSecondsBetweenReplies?: number }) {
    this.windowMs = options.windowMs;
    this.maxMessages = options.maxMessages;
    this.minSecondsBetweenReplies = options.minSecondsBetweenReplies ?? 1;
  }

  allowIncoming(chatId: string): RateLimitDecision {
    const now = Date.now();
    const bucket = this.buckets.get(chatId);

    if (!bucket || now - bucket.windowStart > this.windowMs) {
      this.buckets.set(chatId, { count: 1, windowStart: now, lastReplyAt: 0 });
      return { allowed: true };
    }

    if (bucket.count >= this.maxMessages) {
      return {
        allowed: false,
        reason: "rate-limit-window",
        retryAfterMs: Math.max(0, this.windowMs - (now - bucket.windowStart))
      };
    }

    bucket.count += 1;
    return { allowed: true };
  }

  allowReply(chatId: string): RateLimitDecision {
    const now = Date.now();
    const bucket = this.buckets.get(chatId) ?? { count: 0, windowStart: now, lastReplyAt: 0 };
    const delta = now - bucket.lastReplyAt;
    const minMs = this.minSecondsBetweenReplies * 1000;
    if (bucket.lastReplyAt > 0 && delta < minMs) {
      return { allowed: false, reason: "reply-spacing", retryAfterMs: minMs - delta };
    }
    bucket.lastReplyAt = now;
    this.buckets.set(chatId, bucket);
    return { allowed: true };
  }
}

interface LoopState {
  hash: string;
  count: number;
  updatedAt: number;
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export class LoopGuard {
  private readonly maxRepeat: number;
  private readonly ttlMs: number;
  private readonly state = new Map<string, LoopState>();

  constructor(options?: { maxRepeat?: number; ttlMs?: number }) {
    this.maxRepeat = options?.maxRepeat ?? 3;
    this.ttlMs = options?.ttlMs ?? 5 * 60_000;
  }

  shouldBlock(chatId: string, outgoingText: string): boolean {
    const now = Date.now();
    const hash = simpleHash(outgoingText.trim().toLowerCase());
    const current = this.state.get(chatId);

    if (!current || now - current.updatedAt > this.ttlMs) {
      this.state.set(chatId, { hash, count: 1, updatedAt: now });
      return false;
    }

    if (current.hash === hash) {
      current.count += 1;
      current.updatedAt = now;
      return current.count > this.maxRepeat;
    }

    this.state.set(chatId, { hash, count: 1, updatedAt: now });
    return false;
  }
}
