import { Notice, type App } from "obsidian";

import type { ReviewGate, ReviewGateResult } from "../../application/RequestReviewUseCase";
import type { UserDecision } from "../../core/review/UserDecision";
import type { ProposalSession } from "../../runtime/ProposalSession";
import type { UiLanguage } from "../i18n";
import { t } from "../i18n";
import { ReviewModal } from "./ReviewModal";
import { createReviewViewModel } from "./ReviewViewModel";

export class ObsidianReviewGate implements ReviewGate {
  constructor(
    private readonly app: App,
    private readonly language: UiLanguage,
  ) {}

  async requestReview(session: ProposalSession): Promise<ReviewGateResult> {
    const viewModel = createReviewViewModel(session);

    return new Promise<ReviewGateResult>((resolve) => {
      const modal = new ReviewModal(this.app, viewModel, this.language, {
        onApply: (decision: UserDecision) => {
          new Notice(
            t(this.language, "review.placeholder.apply", {
              decision: JSON.stringify(decision),
            }),
            8000,
          );
          resolve({ action: "apply", decision });
        },
        onSaveDraft: (decision: UserDecision) => {
          new Notice(t(this.language, "review.placeholder.saveDraft"), 6000);
          resolve({ action: "save-draft", decision });
        },
        onCloseWithoutDecision: () => {
          new Notice(t(this.language, "review.placeholder.cancel"), 4000);
          resolve({ action: "cancel" });
        },
      });

      modal.open();
    });
  }
}
