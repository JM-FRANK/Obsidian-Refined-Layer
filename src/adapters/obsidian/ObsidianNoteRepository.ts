import { App, TFile } from "obsidian";

import type { ActiveNoteLookupResult, ActiveNoteRepository } from "../../application/CheckEligibilityUseCase";
import type { MarkdownNoteFile, NoteFilePort } from "../../application/ports/NoteFilePort";

export class ObsidianNoteRepository implements ActiveNoteRepository, NoteFilePort {
  constructor(private readonly app: App) {}

  async getActiveNote(): Promise<ActiveNoteLookupResult> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!activeFile) {
      return {
        kind: "no-active-file",
      };
    }

    if (!(activeFile instanceof TFile) || activeFile.extension !== "md") {
      return {
        kind: "non-markdown-file",
        path: activeFile.path,
        extension: activeFile.extension,
      };
    }

    const content = await this.app.vault.cachedRead(activeFile);

    return {
      kind: "markdown",
      note: {
        path: activeFile.path,
        title: activeFile.basename,
        content,
      },
    };
  }

  async readNoteByPath(path: string): Promise<MarkdownNoteFile | null> {
    const file = this.app.vault.getAbstractFileByPath(path);

    if (!(file instanceof TFile) || file.extension !== "md") {
      return null;
    }

    const content = await this.app.vault.cachedRead(file);

    return {
      path: file.path,
      title: file.basename,
      content,
    };
  }

  async writeNote(path: string, content: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile) || file.extension !== "md") {
      throw new Error(`Markdown note not found: ${path}`);
    }

    await this.app.vault.modify(file, content);
  }

  async writeDraft(path: string, content: string): Promise<void> {
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
      return;
    }

    await ensureFolders(this.app, path);
    await this.app.vault.create(path, content);
  }
}

async function ensureFolders(app: App, filePath: string): Promise<void> {
  const parts = filePath.split("/").slice(0, -1);
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}
