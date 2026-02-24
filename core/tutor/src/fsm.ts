import type { TutorMode } from "@opentutor/db";

export type TutorFsmState = "IDLE" | "LESSON_INTRO" | "PRACTICE" | "FEEDBACK";

export interface FsmTransitionInput {
  currentState: TutorFsmState;
  mode: TutorMode;
  userText: string;
}

export interface FsmTransitionResult {
  nextState: TutorFsmState;
  currentTask: string;
  turnIncrement: number;
}

export function normalizeFsmState(value: string): TutorFsmState {
  if (value === "LESSON_INTRO" || value === "PRACTICE" || value === "FEEDBACK" || value === "IDLE") {
    return value;
  }
  return "IDLE";
}

export function transitionFsm(input: FsmTransitionInput): FsmTransitionResult {
  const text = input.userText.toLowerCase();

  if (input.mode === "chat") {
    return {
      nextState: "IDLE",
      currentTask: "Free conversation in the target language.",
      turnIncrement: 1
    };
  }

  if (input.mode === "exam") {
    return {
      nextState: "FEEDBACK",
      currentTask: "Assess learner response, give limited hints, then ask next question.",
      turnIncrement: 1
    };
  }

  if (input.currentState === "IDLE") {
    return {
      nextState: "LESSON_INTRO",
      currentTask: "Introduce a micro-topic and model one example.",
      turnIncrement: 1
    };
  }

  if (input.currentState === "LESSON_INTRO") {
    return {
      nextState: "PRACTICE",
      currentTask: input.mode === "drill" ? "Run a short drill with repetition." : "Prompt learner to produce original sentences.",
      turnIncrement: 1
    };
  }

  if (input.currentState === "PRACTICE") {
    if (/\b(done|finished|next|continue)\b/.test(text)) {
      return {
        nextState: "LESSON_INTRO",
        currentTask: "Start the next micro-topic.",
        turnIncrement: 1
      };
    }
    return {
      nextState: "FEEDBACK",
      currentTask: "Give concise feedback and one follow-up prompt.",
      turnIncrement: 1
    };
  }

  return {
    nextState: "PRACTICE",
    currentTask: "Continue guided practice with one question at a time.",
    turnIncrement: 1
  };
}
