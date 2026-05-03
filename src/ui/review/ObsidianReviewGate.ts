import type { App } from "obsidian";

import type { ReviewGate, ReviewGateResult } from "../../application/RequestReviewUseCase";
import type { UserDecision } from "../../core/review/UserDecision";
import type { ProposalSession } from "../../runtime/ProposalSession";
import type { UiLanguage } from "../i18n";
import { ReviewModal } from "./ReviewModal";
import { createReviewViewModel } from "./ReviewViewModel";

export class ObsidianReviewGate implements ReviewGate {
  constructor(
    private readonly app: App,
    private readonly language: UiLanguage,
    private readonly handlers?: {
      onApplyNotice?: (decision: UserDecision) => Promise<void> | void;
      onSaveDraftNotice?: (decision: UserDecision) => Promise<void> | void;
      onCancelNotice?: () => Promise<void> | void;
    },
  ) {}

  async requestReview(session: ProposalSession): Promise<ReviewGateResult> {
    const viewModel = createReviewViewModel(session);

    return new Promise<ReviewGateResult>((resolve) => {
      const modal = new ReviewModal(this.app, viewModel, this.language, {
        onApply: (decision: UserDecision) => {
          void this.handlers?.onApplyNotice?.(decision);
          resolve({ action: "apply", decision });
        },
        onSaveDraft: (decision: UserDecision) => {
          void this.handlers?.onSaveDraftNotice?.(decision);
          resolve({ action: "save-draft", decision });
        },
        onCloseWithoutDecision: () => {
          void this.handlers?.onCancelNotice?.();
          resolve({ action: "cancel" });
        },
      });

      modal.open();
    });
  }
}
