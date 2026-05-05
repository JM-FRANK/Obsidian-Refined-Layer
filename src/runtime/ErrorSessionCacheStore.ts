import type { FailedAttemptRecord } from "./ProposalSession";

export interface ErrorSessionCacheStore {
  save(attempt: FailedAttemptRecord): Promise<void>;
  loadAll(): Promise<FailedAttemptRecord[]>;
  getCount(): Promise<number>;
}
