import { Notice, Plugin } from "obsidian";

const REFINE_COMMAND_ID = "refine-current-note";

export default class ObsidianRefinedLayerPlugin extends Plugin {
  async onload(): Promise<void> {
    console.log("Obsidian Refined Layer loaded");

    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: () => {
        new Notice("Refine current note is not implemented yet.");
      },
    });
  }

  onunload(): void {
    console.log("Obsidian Refined Layer unloaded");
  }
}
