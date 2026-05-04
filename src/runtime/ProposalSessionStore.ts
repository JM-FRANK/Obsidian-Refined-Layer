import type { ProposalSession, ProposalSessionSummary } from "./ProposalSession";
import type { SessionPersistenceStore } from "./SessionPersistenceStore";

const DEFAULT_HISTORY_LIMIT = 5;

export class ProposalSessionStore {
  private historyLimit: number;
  private readonly sessionsById = new Map<string, ProposalSession>();
  private readonly sessionsByNotePath = new Map<string, ProposalSession[]>();
  private readonly persistence?: SessionPersistenceStore;

  constructor(historyLimit = DEFAULT_HISTORY_LIMIT, persistence?: SessionPersistenceStore) {
    this.historyLimit = historyLimit;
    this.persistence = persistence;
  }

  setHistoryLimit(historyLimit: number): void {
    this.historyLimit = historyLimit;

    for (const [notePath, sessions] of this.sessionsByNotePath.entries()) {
      const trimmed = sessions
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, this.historyLimit);

      this.sessionsByNotePath.set(notePath, trimmed);
      const keptIds = new Set(trimmed.map((session) => session.id));
      for (const session of sessions) {
        if (!keptIds.has(session.id)) {
          this.sessionsById.delete(session.id);
        }
      }
    }

    this.persistIfNeeded();
  }

  async save(session: ProposalSession): Promise<void> {
    this.sessionsById.set(session.id, session);

    const existing = this.sessionsByNotePath.get(session.notePath) ?? [];
    const withoutCurrent = existing.filter((item) => item.id !== session.id);
    const next = [session, ...withoutCurrent]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, this.historyLimit);

    this.sessionsByNotePath.set(session.notePath, next);

    const preservedIds = new Set(next.map((item) => item.id));
    for (const previous of withoutCurrent) {
      if (!preservedIds.has(previous.id)) {
        this.sessionsById.delete(previous.id);
      }
    }

    await this.persistIfNeeded();
  }

  async get(sessionId: string): Promise<ProposalSession | null> {
    return this.sessionsById.get(sessionId) ?? null;
  }

  async getLatestSessionForNote(notePath: string): Promise<ProposalSession | null> {
    const sessions = this.sessionsByNotePath.get(notePath) ?? [];
    return sessions[0] ?? null;
  }

  async listSessionsForNote(notePath: string): Promise<ProposalSessionSummary[]> {
    const sessions = this.sessionsByNotePath.get(notePath) ?? [];

    return sessions.map((session) => ({
      id: session.id,
      notePath: session.notePath,
      noteTitle: session.noteTitle,
      status: session.status,
      updatedAt: session.updatedAt,
    }));
  }

  async restoreFromDisk(): Promise<void> {
    if (!this.persistence) return;

    const loaded = await this.persistence.loadAll();

    this.sessionsById.clear();
    this.sessionsByNotePath.clear();

    for (const [notePath, sessions] of loaded.entries()) {
      const trimmed = sessions
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, this.historyLimit);

      this.sessionsByNotePath.set(notePath, trimmed);
      for (const session of trimmed) {
        this.sessionsById.set(session.id, session);
      }
    }
  }

  async updateSessionStatus(sessionId: string, status: ProposalSession["status"]): Promise<void> {
    const session = this.sessionsById.get(sessionId);
    if (!session) return;

    session.status = status;
    session.updatedAt = new Date().toISOString();

    await this.persistIfNeeded();
  }

  async updateSessionDecision(sessionId: string, decision: ProposalSession["decision"]): Promise<void> {
    const session = this.sessionsById.get(sessionId);
    if (!session) return;

    session.decision = decision;
    session.status = "reviewing";
    session.updatedAt = new Date().toISOString();

    await this.persistIfNeeded();
  }

  private async persistIfNeeded(): Promise<void> {
    if (!this.persistence) return;

    try {
      await this.persistence.saveAll(new Map(this.sessionsByNotePath));
    } catch {
      // Persistence failure should not break the runtime flow.
    }
  }
}
