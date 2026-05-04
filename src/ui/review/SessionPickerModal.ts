import { Modal } from "obsidian";

import type { RecoverableSession } from "../../application/ListRecoverableSessionsUseCase";
import type { UiLanguage } from "../i18n";
import { t } from "../i18n";

export interface SessionPickerCallbacks {
  onContinue(sessionId: string): void;
  onSaveDraft(sessionId: string): void;
  onManualCopy(sessionId: string): void;
  onRegenerate(): void;
  onDiscard(sessionId: string): void;
  onCancel(): void;
}

export class SessionPickerModal extends Modal {
  private completed = false;

  constructor(
    app: Modal["app"],
    private readonly sessions: RecoverableSession[],
    private readonly noteTitle: string,
    private readonly notePath: string | null,
    private readonly language: UiLanguage,
    private readonly callbacks: SessionPickerCallbacks,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText(t(this.language, "sessionPicker.title"));
    contentEl.empty();
    contentEl.addClass("obsidian-refined-layer-session-picker");

    if (this.notePath) {
      contentEl.createEl("p", {
        cls: "obsidian-refined-layer-meta",
        text: t(this.language, "review.noteMeta", {
          title: this.noteTitle,
          path: this.notePath,
        }),
      });
    }

    if (this.sessions.length === 0) {
      contentEl.createEl("p", {
        cls: "obsidian-refined-layer-empty",
        text: t(this.language, "sessionPicker.empty"),
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

  private renderSessionItem(container: HTMLElement, session: RecoverableSession): void {
    const item = container.createDiv("obsidian-refined-layer-session-item");

    const header = item.createDiv("obsidian-refined-layer-session-header");
    header.createEl("strong", { text: session.summary });

    const meta = item.createDiv("obsidian-refined-layer-session-meta");

    const countingMode = session.tokenUsage?.countingMode ?? "unavailable";
    meta.createSpan({
      text: t(this.language, "sessionPicker.sessionMeta", {
        createdAt: session.createdAt.slice(0, 10),
        status: session.status,
        mode: countingMode,
      }),
    });

    const freshness = item.createDiv("obsidian-refined-layer-session-freshness");
    freshness.createSpan({
      text: t(this.language, `sessionPicker.freshness.${session.freshness}`),
      cls: `obsidian-refined-layer-freshness-${session.freshness}`,
    });

    const actions = item.createDiv("obsidian-refined-layer-session-actions");

    if (session.freshness === "fresh") {
      const continueBtn = actions.createEl("button", {
        text: t(this.language, "sessionPicker.button.continue"),
      });
      continueBtn.addEventListener("click", () => {
        this.completed = true;
        this.callbacks.onContinue(session.id);
        this.close();
      });
    } else {
      const conflictMsg = actions.createDiv("obsidian-refined-layer-conflict-msg");
      conflictMsg.createSpan({
        text: t(this.language, "sessionPicker.conflict", {
          reason: session.freshness,
        }),
      });

      const draftBtn = actions.createEl("button", {
        text: t(this.language, "review.button.saveDraft"),
      });
      draftBtn.addEventListener("click", () => {
        this.completed = true;
        this.callbacks.onSaveDraft(session.id);
        this.close();
      });

      const manualBtn = actions.createEl("button", {
        text: t(this.language, "sessionPicker.button.manualCopy"),
      });
      manualBtn.addEventListener("click", () => {
        this.completed = true;
        this.callbacks.onManualCopy(session.id);
        this.close();
      });
    }

    const regenerateBtn = actions.createEl("button", {
      text: t(this.language, "sessionPicker.button.regenerate"),
    });
    regenerateBtn.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onRegenerate();
      this.close();
    });

    const discardBtn = actions.createEl("button", {
      text: t(this.language, "sessionPicker.button.discard"),
    });
    discardBtn.addEventListener("click", () => {
      this.callbacks.onDiscard(session.id);
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
