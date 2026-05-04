import { hashText } from "../core/protected-region/hash";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import { rawRefinedProfile } from "../core/profile/rawRefinedProfile";
import type { ActiveNoteRepository } from "./CheckEligibilityUseCase";
import type { NoteFilePort } from "./ports/NoteFilePort";
import type { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import type { TokenUsageReport } from "../core/proposal/TokenUsageReport";

export interface RecoverableSession {
  id: string;
  notePath: string;
  noteTitle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  workflowProfileId: string;
  tokenUsage?: TokenUsageReport;
  warnings?: string[];
  summary: string;
  currentConclusion: string;
  freshness: "fresh" | "stale-file" | "stale-region" | "unknown";
}

export class ListRecoverableSessionsUseCase {
  private readonly extractor = new ProtectedRegionExtractor();

  constructor(
    private readonly sessionStore: ProposalSessionStore,
    private readonly noteRepository: ActiveNoteRepository & NoteFilePort,
  ) {}

  async execute(): Promise<{
    sessions: RecoverableSession[];
    notePath: string | null;
  }> {
    const activeNote = await this.noteRepository.getActiveNote();

    if (activeNote.kind !== "markdown") {
      return { sessions: [], notePath: null };
    }

    const sessions = await this.sessionStore.listSessionsForNote(activeNote.note.path);

    const recoverable: RecoverableSession[] = [];
    for (const summary of sessions) {
      const session = await this.sessionStore.get(summary.id);
      if (!session) continue;

      if (session.status === "discarded") continue;

      const freshness = this.computeFreshness(session, activeNote.note.content);

      recoverable.push({
        id: session.id,
        notePath: session.notePath,
        noteTitle: session.noteTitle,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        workflowProfileId: session.workflowProfileId,
        tokenUsage: session.tokenUsage,
        warnings: session.proposal.warnings,
        summary: session.proposal.refinedSections.summary,
        currentConclusion: session.proposal.refinedSections.currentConclusion,
        freshness,
      });
    }

    return {
      sessions: recoverable,
      notePath: activeNote.note.path,
    };
  }

  private computeFreshness(
    session: { baseFileHash: string; baseProtectedRegionHash?: string },
    currentContent: string,
  ): RecoverableSession["freshness"] {
    const currentFileHash = hashText(currentContent);
    if (currentFileHash !== session.baseFileHash) {
      return "stale-file";
    }

    if (session.baseProtectedRegionHash) {
      const region = this.extractor.extract(
        currentContent,
        rawRefinedProfile.protectedRegions.definitions[0],
      );
      if (region.ok) {
        const currentRegionHash = hashText(region.region.text);
        if (currentRegionHash !== session.baseProtectedRegionHash) {
          return "stale-region";
        }
      }
    }

    return "fresh";
  }
}
