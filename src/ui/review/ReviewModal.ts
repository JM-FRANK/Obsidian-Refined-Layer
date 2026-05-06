import { Modal, TextAreaComponent } from "obsidian";

import type { RefinedSectionKey } from "../../core/apply/RefinedBodyFormatter";
import type { UserDecision, UserDecisionV2 } from "../../core/review/UserDecision";
import type { RefinedSections } from "../../core/proposal/Proposal";
import type { UiLanguage } from "../i18n";
import { t } from "../i18n";
import type { EditableRefinedSection, ReviewABlockViewModel, ReviewViewModel, ReviewViewModelV2 } from "./ReviewViewModel";

export interface ReviewModalCallbacks {
  onApply(decision: UserDecision): void;
  onSaveDraft(decision: UserDecision): void;
  onCloseWithoutDecision(): void;
}

export interface ReviewModalV2Callbacks {
  onApply(decision: UserDecisionV2): void;
  onSaveDraft(decision: UserDecisionV2): void;
  onCloseWithoutDecision(): void;
}

export interface ReviewModalV2Options {
  applyDisabled?: boolean;
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

    for (const editableSection of this.viewModel.editableRefinedSections) {
      this.renderEditableSection(section, editableSection);
    }
  }

  private renderEditableSection(container: HTMLElement, editableSection: EditableRefinedSection): void {
    const field = container.createDiv("obsidian-refined-layer-editable-section");
    field.createEl("label", {
      cls: "obsidian-refined-layer-editable-label",
      text: `${editableSection.heading}${editableSection.required ? " *" : ""}`,
    });

    const textArea = new TextAreaComponent(field);
    textArea.inputEl.rows = editableSection.required ? 4 : 3;
    textArea.inputEl.addClass("obsidian-refined-layer-editable-textarea");
    textArea.setValue(editableSection.content);
    this.setEditedSection(editableSection.key, editableSection.content);
    textArea.onChange((value) => {
      this.setEditedSection(editableSection.key, value);
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

  private setEditedSection(key: RefinedSectionKey, value: string): void {
    this.decision.editedRefinedSections = {
      ...(this.decision.editedRefinedSections ?? {}),
      [key]: value,
    } as RefinedSections;
  }
}

export class ReviewModalV2 extends Modal {
  private decision: UserDecisionV2;
  private completed = false;

  constructor(
    app: Modal["app"],
    private readonly viewModel: ReviewViewModelV2,
    private readonly language: UiLanguage,
    private readonly callbacks: ReviewModalV2Callbacks,
    private readonly options: ReviewModalV2Options = {},
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

    contentEl.createEl("p", {
      cls: "obsidian-refined-layer-meta",
      text: t(this.language, "review.meta.attemptsUsed", {
        attemptsUsed: String(this.viewModel.attemptsUsed),
      }),
    });

    this.renderBlocksSection(contentEl);
    this.renderFrontmatterSection(contentEl);
    this.renderSelectedTagsSection(contentEl);
    this.renderNewTagSuggestionsSection(contentEl);
    this.renderTokenUsageSection(contentEl);
    this.renderValidationSection(contentEl);
    this.renderActionRow(contentEl);
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.completed) {
      this.callbacks.onCloseWithoutDecision();
    }
  }

  private renderBlocksSection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.body") });

    if (this.viewModel.blocks.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }

    for (const block of this.viewModel.blocks) {
      this.renderBlock(section, block);
    }
  }

  private renderBlock(container: HTMLElement, block: ReviewABlockViewModel): void {
    const blockEl = container.createDiv("obsidian-refined-layer-v2-block");
    const row = this.createCheckboxRow(blockEl, t(this.language, "review.toggle.block", { heading: block.heading }), false, (checked) => {
      this.decision.acceptBlocks[block.id] = checked;
    });
    row.addClass("obsidian-refined-layer-toggle");

    blockEl.createEl(`h${Math.min(Math.max(block.headingLevel, 1), 6)}` as keyof HTMLElementTagNameMap, {
      cls: "obsidian-refined-layer-v2-block-heading",
      text: block.heading,
    });
    blockEl.createEl("pre", {
      cls: "obsidian-refined-layer-preview",
      text: block.content,
    });

    if (block.warnings.length > 0) {
      const list = blockEl.createEl("ul", { cls: "obsidian-refined-layer-warning-list" });
      for (const warning of block.warnings) {
        list.createEl("li", { text: warning });
      }
    }
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

  private renderSelectedTagsSection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.tags") });

    if (this.viewModel.selectedTags.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }

    for (const item of this.viewModel.selectedTags) {
      this.createCheckboxRow(section, t(this.language, "review.toggle.tag.add", { tag: item.tag }), false, (checked) => {
        const next = new Set(this.decision.acceptTags.add);
        checked ? next.add(item.tag) : next.delete(item.tag);
        this.decision.acceptTags.add = [...next];
      });
    }
  }

  private renderNewTagSuggestionsSection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.newTagSuggestions") });

    if (this.viewModel.newTagSuggestions.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }

    section.createEl("p", {
      cls: "obsidian-refined-layer-meta",
      text: t(this.language, "review.notice.newTagSuggestions"),
    });

    const textArea = new TextAreaComponent(section);
    textArea.inputEl.rows = Math.min(Math.max(this.viewModel.newTagSuggestions.length, 2), 6);
    textArea.inputEl.addClass("obsidian-refined-layer-readonly-textarea");
    textArea.setValue(this.viewModel.newTagSuggestions.join("\n"));
    textArea.inputEl.readOnly = true;
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

  private renderValidationSection(container: HTMLElement): void {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.validation") });

    const items: string[] = [];
    if (this.viewModel.tagNormalizationApplied) {
      items.push(t(this.language, "review.notice.tagNormalizationApplied"));
    }
    items.push(...this.viewModel.validationWarnings);
    for (const rejected of this.viewModel.rejectedFields) {
      items.push(`${rejected.field}: ${rejected.reason}`);
    }

    if (items.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }

    const list = section.createEl("ul", { cls: "obsidian-refined-layer-warning-list" });
    for (const item of items) {
      list.createEl("li", { text: item });
    }
  }

  private renderActionRow(container: HTMLElement): void {
    const row = container.createDiv("obsidian-refined-layer-actions");

    const applyButton = row.createEl("button", { text: t(this.language, "review.button.apply") });
    applyButton.disabled = this.options.applyDisabled === true;
    applyButton.addEventListener("click", () => {
      if (this.options.applyDisabled) return;
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
