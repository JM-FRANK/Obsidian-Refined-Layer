import type { ProposalSessionV2 } from "./ProposalSession";

export interface SessionCacheV2Store {
  save(session: ProposalSessionV2): Promise<void>;
  loadAll(): Promise<ProposalSessionV2[]>;
  getLatestForNote(notePath: string): Promise<ProposalSessionV2 | null>;
}
