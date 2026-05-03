import type { RefinedSections } from "../core/proposal/Proposal";
import type { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import type { PluginSettings } from "../settings/PluginSettings";
import type { NoteFilePort } from "./ports/NoteFilePort";

export interface SaveDraftResult {
  saved: boolean;
  draftPath?: string;
  message?: string;
}

export class SaveDraftUseCase {
  constructor(
    private readonly sessionStore: ProposalSessionStore,
    private readonly noteFilePort: NoteFilePort,
    private readonly settings: Pick<PluginSettings, "draftFolder">,
  ) {}

  async execute(
    sessionId: string,
    conflictReason?: string,
    editedRefinedSections?: RefinedSections,
  ): Promise<SaveDraftResult> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return {
        saved: false,
        message: `Proposal session ${sessionId} was not found.`,
      };
    }

    const fileName = `${sanitizeFileName(session.noteTitle)}-${session.id}.md`;
    const draftPath = `${this.settings.draftFolder}/${fileName}`;
    const refinedSections = editedRefinedSections ?? session.proposal.refinedSections;
    const content = [
      `# Refined Layer Draft`,
      ``,
      `- source note path: ${session.notePath}`,
      `- workflow id: ${session.workflowProfileId}`,
      `- created time: ${session.createdAt}`,
      `- token usage: ${session.tokenUsage?.countingMode ?? "unavailable"}`,
      ...(conflictReason ? [`- conflict reason: ${conflictReason}`] : []),
      ``,
      `## Proposed Sections`,
      ``,
      ...Object.entries(refinedSections).flatMap(([key, value]) => value ? [`### ${key}`, String(value), ``] : []),
      `## Warnings`,
      ``,
      ...(session.proposal.warnings?.length ? session.proposal.warnings : ["none"]),
      ``,
    ].join("\n");

    await this.noteFilePort.writeDraft(draftPath, content);
    session.status = "saved_as_draft";
    session.updatedAt = new Date().toISOString();
    await this.sessionStore.save(session);

    return {
      saved: true,
      draftPath,
    };
  }
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "-");
}
