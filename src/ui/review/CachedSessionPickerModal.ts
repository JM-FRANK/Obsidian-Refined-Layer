import { Modal } from "obsidian";

import type { CachedProposalSessionSummary } from "../../application/OpenCachedSessionUseCase";
import type { UiLanguage } from "../i18n";
import { t } from "../i18n";

export interface CachedSessionPickerCallbacks {
  onOpenSession(sessionId: string): void;
  onCancel(): void;
}

export class CachedSessionPickerModal extends Modal {
  private completed = false;

  constructor(
    app: Modal["app"],
    private readonly sessions: CachedProposalSessionSummary[],
    private readonly language: UiLanguage,
    private readonly callbacks: CachedSessionPickerCallbacks,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText(t(this.language, "cachedSessionPicker.title"));
    contentEl.empty();
    contentEl.addClass("obsidian-refined-layer-session-picker");

    if (this.sessions.length === 0) {
      contentEl.createEl("p", {
        cls: "obsidian-refined-layer-empty",
        text: t(this.language, "cachedSessionPicker.empty"),
      });
      this.renderCloseButton(contentEl);
      return;
    }

    for (const session of this.sessions) {
      this.renderSessionItem(contentEl, session);
    }

    this.renderCloseButton(contentEl);
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.completed) {
      this.callbacks.onCancel();
    }
  }

  private renderSessionItem(container: HTMLElement, session: CachedProposalSessionSummary): void {
    const item = container.createDiv("obsidian-refined-layer-session-item");

    const header = item.createDiv("obsidian-refined-layer-session-header");
    header.createEl("strong", { text: session.noteTitle });

    item.createDiv("obsidian-refined-layer-session-meta").createSpan({
      text: session.notePath,
    });

    const mode = session.tokenUsage?.countingMode ?? "unavailable";
    item.createDiv("obsidian-refined-layer-session-meta").createSpan({
      text: t(this.language, "cachedSessionPicker.sessionMeta", {
        createdAt: session.createdAt.slice(0, 10),
        status: session.status,
        provider: session.provider,
        model: session.model,
        attemptsUsed: String(session.attemptsUsed),
        mode,
      }),
    });

    const actions = item.createDiv("obsidian-refined-layer-session-actions");
    const openButton = actions.createEl("button", {
      text: t(this.language, "cachedSessionPicker.button.open"),
    });
    openButton.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onOpenSession(session.id);
      this.close();
    });
  }

  private renderCloseButton(container: HTMLElement): void {
    const row = container.createDiv("obsidian-refined-layer-actions");
    const closeBtn = row.createEl("button", {
      text: t(this.language, "sessionPicker.button.cancel"),
    });
    closeBtn.addEventListener("click", () => {
      this.close();
    });
  }
}
