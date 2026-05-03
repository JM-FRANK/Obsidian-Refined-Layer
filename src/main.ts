import { Notice, Plugin } from "obsidian";

import { CheckEligibilityUseCase, type CheckEligibilityResult } from "./application/CheckEligibilityUseCase";
import { ObsidianNoteRepository } from "./adapters/obsidian/ObsidianNoteRepository";
import { rawRefinedProfile } from "./core/profile/rawRefinedProfile";

const REFINE_COMMAND_ID = "refine-current-note";

export default class ObsidianRefinedLayerPlugin extends Plugin {
  async onload(): Promise<void> {
    console.log("Obsidian Refined Layer loaded");

    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        const noteRepository = new ObsidianNoteRepository(this.app);
        const checkEligibilityUseCase = new CheckEligibilityUseCase(noteRepository, rawRefinedProfile);
        const result = await checkEligibilityUseCase.execute();

        new Notice(formatEligibilityMessage(result), 6000);
      },
    });
  }

  onunload(): void {
    console.log("Obsidian Refined Layer unloaded");
  }
}

function formatEligibilityMessage(result: CheckEligibilityResult): string {
  if (!result.hasActiveMarkdownNote) {
    if (result.reason === "non-markdown-file") {
      const extension = result.extension ?? "unknown";
      const notePath = result.notePath ?? "(unknown path)";

      return `Refined Layer: active file is not Markdown (${extension}) - ${notePath}`;
    }

    return "Refined Layer: no active note is open.";
  }

  if (!result.eligible) {
    const reasons = result.failureReasons?.join(", ") ?? "unknown";
    return `Refined Layer: note is not eligible (${reasons}) - ${result.notePath}`;
  }

  return `Refined Layer: ${result.noteTitle} (${result.notePath}), raw content length ${result.rawContentLength ?? 0}.`;
}
