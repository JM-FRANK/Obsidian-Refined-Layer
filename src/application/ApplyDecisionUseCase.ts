import { applyFrontmatterChanges, applyTagChanges, appendTags } from "../core/apply/FrontmatterTagApplier";
import type { ApplyPlan } from "../core/apply/ApplyPlan";
import { MarkdownAssembler, type AcceptedABlock } from "../core/markdown/MarkdownAssembler";
import { BlockExtractor } from "../core/markdown/BlockExtractor";
import { hashText } from "../core/protected-region/hash";
import { parseFrontmatter } from "../core/profile/FrontmatterParser";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";
import type { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import type { SessionCacheV2Store } from "../runtime/SessionCacheV2Store";
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
  private readonly blockExtractor = new BlockExtractor();
  private readonly markdownAssembler = new MarkdownAssembler();

  constructor(
    private readonly profile: WorkflowProfile,
    private readonly sessionStore: ProposalSessionStore,
    private readonly noteFilePort: NoteFilePort,
    private readonly sessionCacheV2?: SessionCacheV2Store,
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

  async executeV2(plan: ApplyPlan): Promise<ApplyDecisionResult> {
    const session = await this.findSessionV2(plan.sessionId);
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
      await this.sessionCacheV2?.save(session);
      return this.conflict("file-changed");
    }

    const bBlock = this.blockExtractor.extract(note.content, session.blockConfigSnapshot.bBlock);
    if (!bBlock.ok) {
      return {
        kind: "failed",
        code: bBlock.error.code,
        message: bBlock.error.message,
      };
    }

    if (hashText(bBlock.block.text) !== session.baseBBlockHash) {
      session.status = "conflicted";
      session.updatedAt = new Date().toISOString();
      await this.sessionCacheV2?.save(session);
      return this.conflict("protected-region-changed");
    }

    let nextContent = note.content;

    for (const operation of plan.operations) {
      switch (operation.type) {
        case "replace-refined-blocks":
          nextContent = this.replaceRefinedBlocks(nextContent, operation.blocks, bBlock.block.text, session);
          break;
        case "update-frontmatter":
          nextContent = applyFrontmatterChanges(nextContent, operation.changes);
          break;
        case "append-tags": {
          const allowed = this.filterAppendTags(operation.tags, session);
          nextContent = appendTags(nextContent, allowed);
          break;
        }
        case "replace-refined-body":
        case "update-tags":
          return {
            kind: "failed",
            code: "unsupported-v2-operation",
            message: `Apply operation ${operation.type} is not supported by the v0.2 apply path.`,
          };
      }
    }

    const postApplyBBlock = this.blockExtractor.extract(nextContent, session.blockConfigSnapshot.bBlock);
    if (!postApplyBBlock.ok) {
      return {
        kind: "failed",
        code: postApplyBBlock.error.code,
        message: `Apply aborted: ${postApplyBBlock.error.message}`,
      };
    }
    if (postApplyBBlock.block.text !== bBlock.block.text) {
      return {
        kind: "failed",
        code: "b-block-corrupted",
        message: "Apply aborted: B block changed during assembly.",
      };
    }

    await this.noteFilePort.writeNote(plan.notePath, nextContent);

    session.status = "applied";
    session.updatedAt = new Date().toISOString();
    await this.sessionCacheV2?.save(session);

    return {
      kind: "applied",
      notePath: plan.notePath,
    };
  }

  private replaceRefinedBlocks(
    currentContent: string,
    blocks: Array<{ id: string; content: string }>,
    bBlockText: string,
    session: NonNullable<Awaited<ReturnType<ApplyDecisionUseCase["findSessionV2"]>>>,
  ): string {
    const configById = new Map(session.blockConfigSnapshot.aBlocks.map((config) => [config.id, config]));
    const acceptedABlocks: AcceptedABlock[] = blocks
      .map((block) => {
        const config = configById.get(block.id);
        return config ? { config, content: block.content } : null;
      })
      .filter(Boolean) as AcceptedABlock[];

    const assembledBody = this.markdownAssembler.assemble({
      acceptedABlocks,
      bBlockText,
      firstH1Text: getFirstH1Text(currentContent),
      protectH1: session.blockConfigSnapshot.protectH1,
    });

    return replaceMarkdownBody(currentContent, assembledBody);
  }

  private filterAppendTags(tags: string[], session: NonNullable<Awaited<ReturnType<ApplyDecisionUseCase["findSessionV2"]>>>): string[] {
    const selectedTags = new Set(session.proposal.tagSuggestion?.selectedTags ?? []);
    const whitelist = new Set(session.blockConfigSnapshot.tagWhitelist);
    return [...new Set(tags.filter((tag) => selectedTags.has(tag) && whitelist.has(tag)))];
  }

  private async findSessionV2(sessionId: string) {
    const sessions = await this.sessionCacheV2?.loadAll();
    return sessions?.find((session) => session.id === sessionId) ?? null;
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

function replaceMarkdownBody(markdown: string, nextBody: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parsed = parseFrontmatter(normalized);
  if (!parsed.hasFrontmatter) {
    return nextBody;
  }

  return `---\n${serializeFrontmatterForApply(parsed.frontmatter)}\n---\n${nextBody.replace(/^\n+/, "")}`;
}

function getFirstH1Text(markdown: string): string | undefined {
  const parsed = parseFrontmatter(markdown.replace(/\r\n/g, "\n"));
  const body = parsed.hasFrontmatter ? parsed.body : markdown;
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1];
}

function serializeFrontmatterForApply(frontmatter: Record<string, string | string[]>): string {
  return Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) return `${key}: []`;
        return `${key}:\n${value.map((item) => `  - ${item}`).join("\n")}`;
      }
      return `${key}: ${value}`;
    })
    .join("\n");
}
