import type { RefineRunStage } from "./RefineRunStatus";

export interface RefineRunLogEvent {
  runId: string;
  timestamp: string;
  event: "run-start" | "stage" | "attempt-start" | "attempt-end" | "run-end";
  stage?: RefineRunStage;
  attemptIndex?: 1 | 2 | 3;
  maxAttempts?: 3;
  elapsedMs: number;
  deltaMs: number;
  provider: string;
  model: string;
  profileId: string;
  profileName: string;
  notePath?: string;
  noteTitle?: string;
  noteContentChars?: number;
  protectedBlockChars?: number;
  requestChars?: number;
  systemPromptChars?: number;
  userPromptChars?: number;
  enabledABlockCount?: number;
  tagWhitelistCount?: number;
  responseChars?: number;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    countingMode: "actual" | "estimated" | "mixed" | "unavailable";
  };
  validationStatus?: "valid" | "partial" | "invalid";
  acceptedBlockCount?: number;
  rejectedFieldCount?: number;
  resultKind?: string;
  errorSummary?: string;
}

export interface RefineRunLogger {
  write(event: RefineRunLogEvent): Promise<void>;
}
