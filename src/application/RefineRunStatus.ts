export type RefineRunStage =
  | "checking-eligibility"
  | "building-prompt"
  | "requesting-model"
  | "parsing-response"
  | "validating-proposal"
  | "normalizing-proposal"
  | "saving-session"
  | "opening-review"
  | "failed";

export interface RefineRunStatus {
  runId: string;
  stage: RefineRunStage;
  profileId: string;
  profileName: string;
  attemptIndex?: 1 | 2 | 3;
  maxAttempts?: 3;
  message?: string;
}

export type RefineRunStatusReporter = (status: RefineRunStatus) => void;
