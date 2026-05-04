import type { ProposalSession } from "./ProposalSession";

export interface SessionPersistenceStore {
  saveAll(sessionsByPath: Map<string, ProposalSession[]>): Promise<void>;
  loadAll(): Promise<Map<string, ProposalSession[]>>;
}
