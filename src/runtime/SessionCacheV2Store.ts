import type { ProposalSessionV2 } from "./ProposalSession";

export interface SessionCacheV2Info {
  cachePath: string;
  filePath: string;
  legacyFilePath: string;
  compatibilityStrategy: "ignore-v1";
  limit: number;
}

export interface SessionCacheV2Store {
  save(session: ProposalSessionV2): Promise<void>;
  loadAll(): Promise<ProposalSessionV2[]>;
  getLatestForNote(notePath: string): Promise<ProposalSessionV2 | null>;
  setSessionCacheLimit?(limit: number): Promise<void>;
  getCacheInfo?(): SessionCacheV2Info;
}
