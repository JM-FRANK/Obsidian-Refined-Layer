import { BlockExtractor, type ExtractedBBlock } from "../core/markdown/BlockExtractor";
import { BlockConfigValidator } from "../core/profile/BlockConfigValidator";
import { parseFrontmatter } from "../core/profile/FrontmatterParser";
import type { RefineProfile } from "../core/profile/RefineProfile";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";

export interface ActiveMarkdownNote {
  path: string;
  title: string;
  content: string;
}

export type ActiveNoteLookupResult =
  | {
      kind: "markdown";
      note: ActiveMarkdownNote;
    }
  | {
      kind: "no-active-file";
    }
  | {
      kind: "non-markdown-file";
      path: string;
      extension: string;
    };

export interface ActiveNoteRepository {
  getActiveNote(): Promise<ActiveNoteLookupResult>;
}

export type EligibilityFailureReason =
  // v0.1.0
  | "missingFrontmatter"
  | "invalidStatus"
  | "missingOriginalContentHeading"
  // v0.2.0 B block
  | "missingBBlock"
  | "multipleBBlock"
  | "bBlockLevelMismatch"
  | "emptyBBlock"
  // v0.2.0 A block config
  | "invalidABlockConfig";

export interface CheckEligibilityResult {
  hasActiveMarkdownNote: boolean;
  eligible?: boolean;
  reason?: "no-active-file" | "non-markdown-file";
  failureReasons?: EligibilityFailureReason[];
  notePath?: string;
  noteTitle?: string;
  rawContentLength?: number;
  extension?: string;
  status?: string;
  note?: ActiveMarkdownNote;
  bBlock?: ExtractedBBlock;
}

export class CheckEligibilityUseCase {
  private readonly blockExtractor = new BlockExtractor();
  private readonly blockConfigValidator = new BlockConfigValidator();

  constructor(
    private readonly noteRepository: ActiveNoteRepository,
    private readonly profile: WorkflowProfile,
    private readonly settings: RefineProfile,
  ) {}

  async execute(): Promise<CheckEligibilityResult> {
    const activeNote = await this.noteRepository.getActiveNote();

    if (activeNote.kind === "no-active-file") {
      return {
        hasActiveMarkdownNote: false,
        reason: "no-active-file",
      };
    }

    if (activeNote.kind === "non-markdown-file") {
      return {
        hasActiveMarkdownNote: false,
        reason: "non-markdown-file",
        notePath: activeNote.path,
        extension: activeNote.extension,
      };
    }

    const parsed = parseFrontmatter(activeNote.note.content);
    const failureReasons: EligibilityFailureReason[] = [];
    const statusValue = typeof parsed.frontmatter.status === "string" ? parsed.frontmatter.status : undefined;

    // v0.1.0 checks (retained)
    if (this.profile.eligibility.requireFrontmatter && !parsed.hasFrontmatter) {
      failureReasons.push("missingFrontmatter");
    }

    if (statusValue !== this.profile.eligibility.requiredStatus) {
      failureReasons.push("invalidStatus");
    }

    // v0.2.0 B block check — use BlockExtractor with configurable heading
    const bBlockResult = this.blockExtractor.extract(
      activeNote.note.content,
      this.settings.bBlock,
    );

    if (!bBlockResult.ok) {
      switch (bBlockResult.error.code) {
        case "missing-heading":
          failureReasons.push("missingBBlock");
          break;
        case "multiple-heading":
          failureReasons.push("multipleBBlock");
          break;
        case "heading-level-mismatch":
          failureReasons.push("bBlockLevelMismatch");
          break;
        case "empty-b-block":
          failureReasons.push("emptyBBlock");
          break;
      }
    }

    // v0.2.0 A block config validation
    const enabledABlocks = this.settings.aBlocks.filter((b) => b.enabled);
    const configValidation = this.blockConfigValidator.validate(
      enabledABlocks,
      this.settings.bBlock,
      this.settings.protectH1,
    );

    if (!configValidation.ok) {
      failureReasons.push("invalidABlockConfig");
    }

    return {
      hasActiveMarkdownNote: true,
      eligible: failureReasons.length === 0,
      ...(failureReasons.length > 0 ? { failureReasons } : {}),
      notePath: activeNote.note.path,
      noteTitle: activeNote.note.title,
      rawContentLength: activeNote.note.content.length,
      ...(statusValue ? { status: statusValue } : {}),
      ...(failureReasons.length === 0 ? { note: activeNote.note } : {}),
      ...(bBlockResult.ok && failureReasons.length === 0 ? { bBlock: bBlockResult.block } : {}),
    };
  }
}
