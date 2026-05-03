import { App, TFile } from "obsidian";

import type { ActiveNoteLookupResult, ActiveNoteRepository } from "../../application/CheckEligibilityUseCase";

export class ObsidianNoteRepository implements ActiveNoteRepository {
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
}
