import type { OpenTutorDatabase } from "@opentutor/db";

const STOPWORDS = new Set([
  "the", "and", "for", "you", "are", "with", "that", "this", "have", "your", "but", "not", "was", "what", "when",
  "where", "which", "will", "would", "can", "could", "please", "from", "they", "them", "then", "than", "about"
]);

export function shouldRefreshSummary(messagesSinceSummary: number, threshold: number): boolean {
  return messagesSinceSummary >= threshold;
}

export function extractCandidateVocab(text: string, maxTerms = 8): string[] {
  const matches = text.toLowerCase().match(/[a-zà-ÿ']{3,20}/gi) ?? [];
  const unique: string[] = [];
  for (const token of matches) {
    const normalized = token.toLowerCase();
    if (STOPWORDS.has(normalized)) continue;
    if (!unique.includes(normalized)) unique.push(normalized);
    if (unique.length >= maxTerms) break;
  }
  return unique;
}

export function recordLearnerSignals(db: OpenTutorDatabase, chatId: string, learnerText: string, tutorReply: string): void {
  for (const term of extractCandidateVocab(learnerText)) {
    db.addVocabSeen(chatId, term, learnerText.slice(0, 200));
  }

  const correctionHint = tutorReply.match(/(?:Correction|Correct|Better):\s*(.+)/i);
  if (correctionHint) {
    db.addMistake(chatId, learnerText.slice(0, 300), correctionHint[1].slice(0, 300), "reply-inferred");
  }
}
