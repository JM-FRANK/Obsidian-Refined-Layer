import type { PromptDebugSnapshot } from "../core/prompt/PromptDebugSnapshot";
import { redactSensitiveStrings } from "./redaction";

export interface PromptObservationSnapshot {
  updatedAt: string;
  provider: string;
  model: string;
  requestSnapshot: PromptDebugSnapshot;
  responseSnapshot?: {
    rawText?: string;
    parsedJson?: unknown;
  };
  validationSnapshot?: {
    zodResult?: "success" | "failed";
    zodError?: unknown;
    normalizationReport?: unknown;
    errorSummary?: string;
  };
}

export interface PromptObservationStore {
  save(snapshot: PromptObservationSnapshot): void;
  getLatest(): PromptObservationSnapshot | null;
}

export class InMemoryPromptObservationStore implements PromptObservationStore {
  private latest: PromptObservationSnapshot | null = null;

  save(snapshot: PromptObservationSnapshot): void {
    this.latest = redactSensitiveStrings(snapshot);
  }

  getLatest(): PromptObservationSnapshot | null {
    return this.latest;
  }
}
