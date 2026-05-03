import { parseFrontmatter } from "../core/profile/FrontmatterParser";
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

export interface CheckEligibilityResult {
  hasActiveMarkdownNote: boolean;
  eligible?: boolean;
  reason?: "no-active-file" | "non-markdown-file";
  failureReasons?: Array<"missingFrontmatter" | "invalidStatus" | "missingOriginalContentHeading">;
  notePath?: string;
  noteTitle?: string;
  rawContentLength?: number;
  extension?: string;
  status?: string;
}

export class CheckEligibilityUseCase {
  constructor(
    private readonly noteRepository: ActiveNoteRepository,
    private readonly profile: WorkflowProfile,
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
    const failureReasons: Array<"missingFrontmatter" | "invalidStatus" | "missingOriginalContentHeading"> = [];
    const statusValue = typeof parsed.frontmatter.status === "string" ? parsed.frontmatter.status : undefined;

    if (this.profile.eligibility.requireFrontmatter && !parsed.hasFrontmatter) {
      failureReasons.push("missingFrontmatter");
    }

    if (statusValue !== this.profile.eligibility.requiredStatus) {
      failureReasons.push("invalidStatus");
    }

    const headingPattern = new RegExp(`^${escapeRegExp(this.profile.eligibility.requiredHeading)}\\s*$`, "m");
    if (!headingPattern.test(activeNote.note.content)) {
      failureReasons.push("missingOriginalContentHeading");
    }

    return {
      hasActiveMarkdownNote: true,
      eligible: failureReasons.length === 0,
      ...(failureReasons.length > 0 ? { failureReasons } : {}),
      notePath: activeNote.note.path,
      noteTitle: activeNote.note.title,
      rawContentLength: activeNote.note.content.length,
      ...(statusValue ? { status: statusValue } : {}),
    };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
