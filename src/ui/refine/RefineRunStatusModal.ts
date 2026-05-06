import { Notice } from "obsidian";

import type { RefineProfile } from "../../core/profile/RefineProfile";
import type { RefineRunStatus } from "../../application/RefineRunStatus";
import type { UiLanguage } from "../i18n";
import { t } from "../i18n";

export class RefineRunStatusNotice {
  private notice?: Notice;
  private readonly startedAt = Date.now();

  constructor(
    private readonly language: UiLanguage,
    private readonly profile: RefineProfile,
  ) {}

  start(): void {
    this.updateText(t(this.language, "refineRunStatus.stage.checking-eligibility"));
  }

  updateStatus(status: RefineRunStatus): void {
    const stageKey = `refineRunStatus.stage.${status.stage}` as const;
    const stageText = t(this.language, stageKey as never);
    const text = status.attemptIndex && status.maxAttempts
      ? t(this.language, "refineRunStatus.stageWithAttempt", {
          stage: stageText,
          attemptIndex: status.attemptIndex,
          maxAttempts: status.maxAttempts,
        })
      : stageText;
    this.updateText(text);
  }

  finish(): void {
    this.notice?.hide();
    this.notice = undefined;
  }

  private updateText(stageText: string): void {
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - this.startedAt) / 1000));
    this.notice?.hide();
    this.notice = new Notice(t(this.language, "refineRunStatus.notice", {
      profileName: this.profile.name,
      stage: stageText,
      elapsedSeconds,
    }), 0);
  }
}
