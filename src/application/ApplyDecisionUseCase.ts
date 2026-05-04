import { applyFrontmatterChanges, applyTagChanges } from "../core/apply/FrontmatterTagApplier";
import type { ApplyPlan } from "../core/apply/ApplyPlan";
import { hashText } from "../core/protected-region/hash";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";
import type { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import type { NoteFilePort } from "./ports/NoteFilePort";

export interface ConflictResult {
  kind: "conflict";
  reason: "file-changed" | "protected-region-changed";
  options: Array<"save-draft" | "regenerate" | "manual-copy" | "discard">;
}

export interface ApplySuccessResult {
  kind: "applied";
  notePath: string;
}

export interface ApplyFailureResult {
  kind: "failed";
  code: string;
  message: string;
}

export type ApplyDecisionResult = ApplySuccessResult | ConflictResult | ApplyFailureResult;

export class ApplyDecisionUseCase {
  private readonly extractor = new ProtectedRegionExtractor();

  constructor(
    private readonly profile: WorkflowProfile,
    private readonly sessionStore: ProposalSessionStore,
    private readonly noteFilePort: NoteFilePort,
  ) {}

  async execute(plan: ApplyPlan): Promise<ApplyDecisionResult> {
    const session = await this.sessionStore.get(plan.sessionId);
    if (!session) {
      return {
        kind: "failed",
        code: "missing-session",
        message: `Proposal session ${plan.sessionId} was not found.`,
      };
    }

    const note = await this.noteFilePort.readNoteByPath(plan.notePath);
    if (!note) {
      return {
        kind: "failed",
        code: "missing-note",
        message: `Target note ${plan.notePath} was not found.`,
      };
    }

    if (hashText(note.content) !== session.baseFileHash) {
      session.status = "conflicted";
      session.updatedAt = new Date().toISOString();
      await this.sessionStore.save(session);
      return this.conflict("file-changed");
    }

    const protectedRegion = this.extractor.extract(
      note.content,
      this.profile.protectedRegions.definitions[0],
    );
    if (!protectedRegion.ok) {
      return {
        kind: "failed",
        code: protectedRegion.error.code,
        message: protectedRegion.error.message,
      };
    }

    if (hashText(protectedRegion.region.text) !== session.baseProtectedRegionHash) {
      session.status = "conflicted";
      session.updatedAt = new Date().toISOString();
      await this.sessionStore.save(session);
      return this.conflict("protected-region-changed");
    }

    let nextContent = note.content;

    for (const operation of plan.operations) {
      switch (operation.type) {
        case "replace-refined-body":
          nextContent = mergeBodyIntoMarkdown(nextContent, operation.body);
          break;
        case "update-frontmatter":
          nextContent = applyFrontmatterChanges(nextContent, operation.changes);
          break;
        case "update-tags":
          nextContent = applyTagChanges(nextContent, operation.add, operation.remove, this.profile);
          break;
      }
    }

    await this.noteFilePort.writeNote(plan.notePath, nextContent);

    session.status = "applied";
    session.updatedAt = new Date().toISOString();
    session.applyPlan = plan;
    await this.sessionStore.save(session);

    return {
      kind: "applied",
      notePath: plan.notePath,
    };
  }

  private conflict(reason: ConflictResult["reason"]): ConflictResult {
    return {
      kind: "conflict",
      reason,
      options: ["save-draft", "regenerate", "manual-copy", "discard"],
    };
  }
}

function mergeBodyIntoMarkdown(markdown: string, body: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const hasFrontmatter = normalized.startsWith("---\n") || normalized.startsWith("---\r\n");

  if (!hasFrontmatter) {
    return body;
  }

  const closingMarkerIndex = normalized.indexOf("\n---\n", 4);
  if (closingMarkerIndex === -1) {
    return body;
  }

  const frontmatterBlock = normalized.slice(0, closingMarkerIndex + 5);
  return `${frontmatterBlock}${body.startsWith("\n") ? "" : "\n"}${body}`;
}
