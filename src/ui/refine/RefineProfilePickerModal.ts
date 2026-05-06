import { Modal } from "obsidian";

import type { RefineProfile } from "../../core/profile/RefineProfile";
import type { UiLanguage } from "../i18n";
import { t } from "../i18n";

export interface RefineProfilePickerCallbacks {
  onChoose(profileId: string): void;
  onCancel(): void;
}

export class RefineProfilePickerModal extends Modal {
  private completed = false;

  constructor(
    app: Modal["app"],
    private readonly profiles: RefineProfile[],
    private readonly language: UiLanguage,
    private readonly callbacks: RefineProfilePickerCallbacks,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText(t(this.language, "refineProfilePicker.title"));
    contentEl.empty();
    contentEl.addClass("obsidian-refined-layer-session-picker");

    for (const profile of this.profiles) {
      const item = contentEl.createDiv("obsidian-refined-layer-session-item");
      item.createEl("strong", { text: profile.name });
      if (profile.description) {
        item.createDiv("obsidian-refined-layer-session-meta").createSpan({ text: profile.description });
      }
      item.createDiv("obsidian-refined-layer-session-meta").createSpan({
        text: t(this.language, "refineProfilePicker.meta", {
          generatedBlocks: String(profile.aBlocks.filter((block) => block.enabled).length),
          protectedBlock: profile.bBlock.name,
        }),
      });

      const actions = item.createDiv("obsidian-refined-layer-session-actions");
      const chooseButton = actions.createEl("button", {
        text: t(this.language, "refineProfilePicker.button.choose"),
      });
      chooseButton.addEventListener("click", () => {
        this.completed = true;
        this.callbacks.onChoose(profile.id);
        this.close();
      });
    }

    const row = contentEl.createDiv("obsidian-refined-layer-actions");
    const cancel = row.createEl("button", { text: t(this.language, "sessionPicker.button.cancel") });
    cancel.addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.completed) {
      this.callbacks.onCancel();
    }
  }
}
