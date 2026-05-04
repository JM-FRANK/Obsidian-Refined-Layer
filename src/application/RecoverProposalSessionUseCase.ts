import type { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import type { ProposalSession } from "../runtime/ProposalSession";
import type { ActiveNoteRepository } from "./CheckEligibilityUseCase";
import type { NoteFilePort } from "./ports/NoteFilePort";
import { hashText } from "../core/protected-region/hash";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import { rawRefinedProfile } from "../core/profile/rawRefinedProfile";

export type RecoveryResult =
  | { kind: "fresh"; session: ProposalSession }
  | { kind: "stale"; session: ProposalSession; reason: "file-changed" | "region-changed" | "note-unavailable" };

export class RecoverProposalSessionUseCase {
  private readonly extractor = new ProtectedRegionExtractor();

  constructor(
    private readonly sessionStore: ProposalSessionStore,
    private readonly noteRepository: ActiveNoteRepository & NoteFilePort,
  ) {}

  async execute(sessionId: string): Promise<RecoveryResult | null> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) return null;

    const activeNote = await this.noteRepository.getActiveNote();

    if (activeNote.kind !== "markdown") {
      return { kind: "stale", session, reason: "note-unavailable" };
    }

    if (activeNote.note.path !== session.notePath) {
      return { kind: "stale", session, reason: "note-unavailable" };
    }

    const currentContent = activeNote.note.content;
    const currentFileHash = hashText(currentContent);

    if (currentFileHash !== session.baseFileHash) {
      return { kind: "stale", session, reason: "file-changed" };
    }

    if (session.baseProtectedRegionHash) {
      const region = this.extractor.extract(
        currentContent,
        rawRefinedProfile.protectedRegions.definitions[0],
      );
      if (region.ok) {
        const currentRegionHash = hashText(region.region.text);
        if (currentRegionHash !== session.baseProtectedRegionHash) {
          return { kind: "stale", session, reason: "region-changed" };
        }
      } else {
        return { kind: "stale", session, reason: "region-changed" };
      }
    }

    return { kind: "fresh", session };
  }
}
