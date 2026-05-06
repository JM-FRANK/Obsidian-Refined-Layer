import type { TokenUsageReport } from "../core/proposal/TokenUsageReport";
import type { ProposalSessionV2 } from "../runtime/ProposalSession";
import type { SessionCacheV2Store } from "../runtime/SessionCacheV2Store";

export interface CachedProposalSessionSummary {
  id: string;
  notePath: string;
  noteTitle: string;
  createdAt: string;
  updatedAt: string;
  status: ProposalSessionV2["status"];
  provider: string;
  model: string;
  attemptsUsed: number;
  tokenUsage?: TokenUsageReport;
}

export class OpenCachedSessionUseCase {
  constructor(private readonly sessionCache: SessionCacheV2Store) {}

  async list(): Promise<CachedProposalSessionSummary[]> {
    const sessions = await this.sessionCache.loadAll();
    return [...sessions]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((session) => ({
        id: session.id,
        notePath: session.notePath,
        noteTitle: session.noteTitle,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: session.status,
        provider: session.source.provider,
        model: session.source.model,
        attemptsUsed: session.source.attemptsUsed,
        tokenUsage: session.tokenUsage,
      }));
  }

  async open(sessionId: string): Promise<ProposalSessionV2 | null> {
    const sessions = await this.sessionCache.loadAll();
    return sessions.find((session) => session.id === sessionId) ?? null;
  }
}
