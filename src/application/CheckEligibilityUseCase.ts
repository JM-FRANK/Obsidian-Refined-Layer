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
  reason?: "no-active-file" | "non-markdown-file";
  notePath?: string;
  noteTitle?: string;
  rawContentLength?: number;
  extension?: string;
}

export class CheckEligibilityUseCase {
  constructor(private readonly noteRepository: ActiveNoteRepository) {}

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

    return {
      hasActiveMarkdownNote: true,
      notePath: activeNote.note.path,
      noteTitle: activeNote.note.title,
      rawContentLength: activeNote.note.content.length,
    };
  }
}
