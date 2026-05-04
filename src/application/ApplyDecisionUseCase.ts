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
          nextContent = mergeBodyIntoMarkdown(nextContent, operation.body, protectedRegion.region.text);
          break;
        case "update-frontmatter":
          nextContent = applyFrontmatterChanges(nextContent, operation.changes);
          break;
        case "update-tags":
          nextContent = applyTagChanges(nextContent, operation.add, operation.remove, this.profile);
          break;
      }
    }

    const postApplyRegion = this.extractor.extract(
      nextContent,
      this.profile.protectedRegions.definitions[0],
    );
    if (!postApplyRegion.ok) {
      return {
        kind: "failed",
        code: postApplyRegion.error.code,
        message: `Apply aborted: ${postApplyRegion.error.message}`,
      };
    }
    if (postApplyRegion.region.text !== protectedRegion.region.text) {
      return {
        kind: "failed",
        code: "protected-region-corrupted",
        message: "Apply aborted: protected region changed during assembly.",
      };
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

function mergeBodyIntoMarkdown(markdown: string, body: string, currentProtectedRegion: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");

  let frontmatterBlock = "";
  let afterFrontmatter = normalized;

  if (normalized.startsWith("---\n") || normalized.startsWith("---\r\n")) {
    const closingIndex = normalized.indexOf("\n---\n", 4);
    if (closingIndex !== -1) {
      frontmatterBlock = normalized.slice(0, closingIndex + 5);
      afterFrontmatter = normalized.slice(closingIndex + 5).replace(/^\n+/, "");
    }
  }

  let h1Line = "";
  const h1Match = afterFrontmatter.match(/^#\s+[^\n]+/);
  if (h1Match) {
    h1Line = h1Match[0];
  }

  const refinedBody = stripProtectedRegionFromBody(body);

  const parts: string[] = [];
  if (frontmatterBlock) parts.push(frontmatterBlock);
  if (h1Line) parts.push(h1Line);
  parts.push(refinedBody);
  parts.push(currentProtectedRegion);

  return parts.join("\n");
}

function stripProtectedRegionFromBody(body: string): string {
  const normalized = body.replace(/\r\n/g, "\n");
  const headingIndex = normalized.indexOf("\n## 原始内容");
  if (headingIndex === -1) {
    return normalized;
  }
  return normalized.slice(0, headingIndex);
}
