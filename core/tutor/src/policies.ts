import type { CorrectionsMode, TutorMode } from "@opentutor/db";

export interface CorrectionPolicy {
  mode: CorrectionsMode;
  maxCorrections: number;
  styleInstruction: string;
}

export interface TutorPolicySnapshot {
  correction: CorrectionPolicy;
  responseRules: string[];
  temperature: number;
}

export function getCorrectionPolicy(mode: CorrectionsMode): CorrectionPolicy {
  switch (mode) {
    case "off":
      return {
        mode,
        maxCorrections: 0,
        styleInstruction: "Do not explicitly correct errors unless the learner asks."
      };
    case "strict":
      return {
        mode,
        maxCorrections: 3,
        styleInstruction: "Correct important grammar/wording errors before continuing, but keep it concise."
      };
    case "light":
    default:
      return {
        mode: "light",
        maxCorrections: 2,
        styleInstruction: "Correct at most a couple of high-impact errors and keep the conversation moving."
      };
  }
}

export function getTutorPolicy(mode: TutorMode, corrections: CorrectionsMode): TutorPolicySnapshot {
  const correction = getCorrectionPolicy(corrections);

  const responseRules = [
    "Keep replies short (2-6 lines).",
    "Ask exactly one follow-up question unless in exam mode.",
    "Prefer learner production over long explanations.",
    `Apply corrections policy: ${correction.styleInstruction} Max corrections: ${correction.maxCorrections}.`
  ];

  if (mode === "drill") responseRules.push("Focus on repetition, prompts, and quick checks.");
  if (mode === "exam") responseRules.push("Be stricter and avoid giving the answer too early.");
  if (mode === "lesson") responseRules.push("Teach one micro-topic at a time.");

  const temperature = mode === "exam" ? 0.2 : 0.5;
  return { correction, responseRules, temperature };
}
