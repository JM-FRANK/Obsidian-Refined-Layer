import { Notice, Plugin } from "obsidian";

import { CreateProposalUseCase } from "./application/CreateProposalUseCase";
import type { CheckEligibilityResult } from "./application/CheckEligibilityUseCase";
import { ObsidianNoteRepository } from "./adapters/obsidian/ObsidianNoteRepository";
import { MockLlmProvider } from "./adapters/llm/MockLlmProvider";
import { rawRefinedProfile } from "./core/profile/rawRefinedProfile";
import { ProposalSessionStore } from "./runtime/ProposalSessionStore";

const REFINE_COMMAND_ID = "refine-current-note";
const REOPEN_LAST_PROPOSAL_COMMAND_ID = "reopen-last-proposal-for-current-note";

export default class ObsidianRefinedLayerPlugin extends Plugin {
  private readonly sessionStore = new ProposalSessionStore(5);

  async onload(): Promise<void> {
    console.log("Obsidian Refined Layer loaded");

    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        const noteRepository = new ObsidianNoteRepository(this.app);
        const createProposalUseCase = new CreateProposalUseCase(
          noteRepository,
          rawRefinedProfile,
          new MockLlmProvider(),
          this.sessionStore,
        );
        const result = await createProposalUseCase.execute();

        new Notice(formatCreateProposalMessage(result), 8000);
      },
    });

    this.addCommand({
      id: REOPEN_LAST_PROPOSAL_COMMAND_ID,
      name: "Reopen last proposal for current note",
      callback: async () => {
        const noteRepository = new ObsidianNoteRepository(this.app);
        const activeNote = await noteRepository.getActiveNote();

        if (activeNote.kind !== "markdown") {
          new Notice(formatEligibilityMessage({
            hasActiveMarkdownNote: false,
            reason: activeNote.kind,
            ...(activeNote.kind === "non-markdown-file"
              ? { notePath: activeNote.path, extension: activeNote.extension }
              : {}),
          }), 6000);
          return;
        }

        const session = await this.sessionStore.getLatestSessionForNote(activeNote.note.path);
        if (!session) {
          new Notice(`Refined Layer: no saved proposal session for ${activeNote.note.path}.`, 6000);
          return;
        }

        const tokenUsage = session.tokenUsage?.countingMode ?? "unavailable";
        new Notice(
          `Refined Layer: reopened ${session.id} for ${session.noteTitle} (${session.notePath}), token usage ${tokenUsage}.`,
          8000,
        );
      },
    });
  }

  onunload(): void {
    console.log("Obsidian Refined Layer unloaded");
  }
}

function formatEligibilityMessage(result: CheckEligibilityResult): string {
  if (!result.hasActiveMarkdownNote) {
    if (result.reason === "non-markdown-file") {
      const extension = result.extension ?? "unknown";
      const notePath = result.notePath ?? "(unknown path)";

      return `Refined Layer: active file is not Markdown (${extension}) - ${notePath}`;
    }

    return "Refined Layer: no active note is open.";
  }

  if (!result.eligible) {
    const reasons = result.failureReasons?.join(", ") ?? "unknown";
    return `Refined Layer: note is not eligible (${reasons}) - ${result.notePath}`;
  }

  return `Refined Layer: ${result.noteTitle} (${result.notePath}), raw content length ${result.rawContentLength ?? 0}.`;
}

function formatCreateProposalMessage(result: Awaited<ReturnType<CreateProposalUseCase["execute"]>>): string {
  if (result.kind === "eligibility-failed") {
    return formatEligibilityMessage(result.eligibility);
  }

  if (result.kind === "validation-failed") {
    const detail = result.errors.map((error) => `${error.layer}:${error.code}`).join(", ");
    return `Refined Layer: proposal validation failed (${detail}).`;
  }

  const tokenUsage = result.session.tokenUsage?.totalTokens ?? "unavailable";
  return `Refined Layer: mock proposal created for ${result.session.noteTitle}, session ${result.session.id}, tokens ${tokenUsage}.`;
}
