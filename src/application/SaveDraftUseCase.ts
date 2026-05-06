import type { RefinedSections } from "../core/proposal/Proposal";
import type { UserDecisionV2 } from "../core/review/UserDecision";
import type { ProposalSessionV2 } from "../runtime/ProposalSession";
import type { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import { redactSensitiveText } from "../runtime/redaction";
import type { SessionCacheV2Store } from "../runtime/SessionCacheV2Store";
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
    private readonly sessionCacheV2?: SessionCacheV2Store,
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

  async executeV2(
    sessionId: string,
    decision?: UserDecisionV2,
  ): Promise<SaveDraftResult> {
    const session = await this.findSessionV2(sessionId);
    if (!session) {
      return {
        saved: false,
        message: `Proposal session ${sessionId} was not found.`,
      };
    }

    const fileName = `${sanitizeFileName(session.noteTitle)}-${session.id}.md`;
    const draftPath = `${this.settings.draftFolder}/${fileName}`;
    const content = redactSensitiveText(buildV2DraftContent(session, decision));

    await this.noteFilePort.writeDraft(draftPath, content);
    session.status = "saved_as_draft";
    session.updatedAt = new Date().toISOString();
    await this.sessionCacheV2?.save(session);

    return {
      saved: true,
      draftPath,
    };
  }

  private async findSessionV2(sessionId: string): Promise<ProposalSessionV2 | null> {
    const sessions = await this.sessionCacheV2?.loadAll();
    return sessions?.find((session) => session.id === sessionId) ?? null;
  }
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "-");
}

function buildV2DraftContent(session: ProposalSessionV2, decision?: UserDecisionV2): string {
  const selectedTags = session.proposal.tagSuggestion?.selectedTags ?? [];
  const newTagSuggestions = session.proposal.tagSuggestion?.newTagSuggestions ?? [];

  return [
    `# Refined Layer Draft`,
    ``,
    `- source note path: ${session.notePath}`,
    `- workflow id: ${session.workflowProfileId}`,
    `- profile id: ${session.profileSnapshot?.id ?? "default"}`,
    `- profile name: ${session.profileSnapshot?.name ?? "Default"}`,
    `- schema version: ${session.schemaVersion}`,
    `- created time: ${session.createdAt}`,
    `- token usage: ${session.tokenUsage?.countingMode ?? "unavailable"}`,
    `- attempts used: ${session.source.attemptsUsed}`,
    ``,
    `## Proposed A Blocks`,
    ``,
    ...session.proposal.blocks.flatMap((block) => [
      `### ${block.id}`,
      `accepted in review: ${decision?.acceptBlocks[block.id] === true ? "yes" : "no"}`,
      ``,
      block.content,
      ``,
      ...(block.warnings?.length ? [`warnings:`, ...block.warnings.map((warning) => `- ${warning}`), ``] : []),
    ]),
    `## Selected Tags`,
    ``,
    ...(selectedTags.length ? selectedTags.map((tag) => `- ${tag}${decision?.acceptTags.add.includes(tag) ? " (accepted)" : ""}`) : ["none"]),
    ``,
    `## New Tag Suggestions`,
    ``,
    ...(newTagSuggestions.length ? newTagSuggestions.map((tag) => `- ${tag}`) : ["none"]),
    ``,
    `## Validation`,
    ``,
    `- status: ${session.validation.status}`,
    `- tagNormalizationApplied: ${session.validation.tagNormalizationApplied}`,
    ``,
    `### Warnings`,
    ``,
    ...(session.validation.warnings.length ? session.validation.warnings.map((warning) => `- ${warning}`) : ["none"]),
    ``,
    `### Rejected Fields`,
    ``,
    ...(session.validation.rejectedFields.length
      ? session.validation.rejectedFields.map((field) => `- ${field.field}: ${field.reason}`)
      : ["none"]),
    ``,
  ].join("\n");
}
