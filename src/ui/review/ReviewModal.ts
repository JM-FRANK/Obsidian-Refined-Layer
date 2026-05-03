import { Modal } from "obsidian";

import type { UserDecision } from "../../core/review/UserDecision";
import type { UiLanguage } from "../i18n";
import { t } from "../i18n";
import type { ReviewViewModel } from "./ReviewViewModel";

export interface ReviewModalCallbacks {
  onApply(decision: UserDecision): void;
  onSaveDraft(decision: UserDecision): void;
  onCloseWithoutDecision(): void;
}

export class ReviewModal extends Modal {
  private decision: UserDecision;
  private completed = false;

  constructor(
    app: Modal["app"],
    private readonly viewModel: ReviewViewModel,
    private readonly language: UiLanguage,
    private readonly callbacks: ReviewModalCallbacks,
  ) {
    super(app);
    this.decision = structuredClone(viewModel.initialDecision);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText(t(this.language, "review.title"));
    contentEl.empty();
    contentEl.addClass("obsidian-refined-layer-review");

    contentEl.createEl("p", {
      cls: "obsidian-refined-layer-meta",
      text: t(this.language, "review.noteMeta", {
        title: this.viewModel.noteTitle,
        path: this.viewModel.notePath,
      }),
    });

    this.renderBodySection(contentEl);
    this.renderFrontmatterSection(contentEl);
    this.renderTagSection(contentEl);
    this.renderTokenUsageSection(contentEl);
    this.renderWarningsSection(contentEl);
    this.renderActionRow(contentEl);
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.completed) {
      this.callbacks.onCloseWithoutDecision();
    }
  }

  private renderBodySection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.body") });
    const toggle = this.createCheckboxRow(section, t(this.language, "review.toggle.body"), false, (checked) => {
      this.decision.acceptBody = checked;
    });
    toggle.addClass("obsidian-refined-layer-toggle");
    section.createEl("pre", {
      cls: "obsidian-refined-layer-preview",
      text: this.viewModel.bodyPreview,
    });
  }

  private renderFrontmatterSection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.frontmatter") });

    if (this.viewModel.frontmatterSuggestions.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }

    for (const suggestion of this.viewModel.frontmatterSuggestions) {
      const key = `review.toggle.frontmatter.${suggestion.field}` as const;
      const row = this.createCheckboxRow(section, t(this.language, key), false, (checked) => {
        this.decision.acceptFrontmatter[suggestion.field] = checked;
      });
      row.createEl("code", { text: `${suggestion.field}: ${suggestion.value}` });
    }
  }

  private renderTagSection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.tags") });

    const hasAdd = this.viewModel.tagSuggestions.add.length > 0;
    const hasRemove = this.viewModel.tagSuggestions.remove.length > 0;

    if (!hasAdd && !hasRemove) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }

    for (const tag of this.viewModel.tagSuggestions.add) {
      this.createCheckboxRow(section, t(this.language, "review.toggle.tag.add", { tag }), false, (checked) => {
        const next = new Set(this.decision.acceptTags.add ?? []);
        checked ? next.add(tag) : next.delete(tag);
        this.decision.acceptTags.add = [...next];
      });
    }

    for (const tag of this.viewModel.tagSuggestions.remove) {
      this.createCheckboxRow(section, t(this.language, "review.toggle.tag.remove", { tag }), false, (checked) => {
        const next = new Set(this.decision.acceptTags.remove ?? []);
        checked ? next.add(tag) : next.delete(tag);
        this.decision.acceptTags.remove = [...next];
      });
    }
  }

  private renderTokenUsageSection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.tokenUsage") });

    const usage = this.viewModel.tokenUsage;
    section.createEl("p", {
      text: usage
        ? t(this.language, "review.token.summary", {
            provider: usage.provider,
            model: usage.model,
            mode: usage.countingMode,
            total: usage.totalTokens ?? t(this.language, "review.token.unavailable"),
          })
        : t(this.language, "review.token.unavailable"),
    });
  }

  private renderWarningsSection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.warnings") });

    if (this.viewModel.warnings.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }

    const list = section.createEl("ul");
    for (const warning of this.viewModel.warnings) {
      list.createEl("li", { text: warning });
    }
  }

  private renderActionRow(container: HTMLElement): void {
    const row = container.createDiv("obsidian-refined-layer-actions");

    const applyButton = row.createEl("button", { text: t(this.language, "review.button.apply") });
    applyButton.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onApply(this.decision);
      this.close();
    });

    const draftButton = row.createEl("button", { text: t(this.language, "review.button.saveDraft") });
    draftButton.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onSaveDraft({
        ...this.decision,
        saveAsDraftOnly: true,
      });
      this.close();
    });

    const closeButton = row.createEl("button", { text: t(this.language, "review.button.close") });
    closeButton.addEventListener("click", () => {
      this.close();
    });
  }

  private createCheckboxRow(
    container: HTMLElement,
    labelText: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ): HTMLLabelElement {
    const row = container.createEl("label", { cls: "obsidian-refined-layer-checkbox-row" });
    const checkbox = row.createEl("input", { type: "checkbox" });
    checkbox.checked = checked;
    checkbox.addEventListener("change", () => onChange(checkbox.checked));
    row.createSpan({ text: labelText });
    return row;
  }
}
