import type { UserDecision } from "../core/review/UserDecision";
import type { ProposalSession } from "../runtime/ProposalSession";

export interface ReviewGateResult {
  action: "apply" | "save-draft" | "cancel";
  decision?: UserDecision;
}

export interface ReviewGate {
  requestReview(session: ProposalSession): Promise<ReviewGateResult>;
}

export class RequestReviewUseCase {
  constructor(private readonly reviewGate: ReviewGate) {}

  async execute(session: ProposalSession): Promise<ReviewGateResult> {
    return this.reviewGate.requestReview(session);
  }
}
