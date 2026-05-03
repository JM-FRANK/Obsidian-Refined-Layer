import type { ApplyPlan } from "../core/apply/ApplyPlan";
import type { ProposalSession, ProposalSessionSummary } from "../runtime/ProposalSession";
import type { CheckEligibilityResult } from "./CheckEligibilityUseCase";

export interface EligibilityRequest {
  notePath?: string;
}

export interface CreateProposalRequest {
  notePath: string;
}

export interface ReviewRequest {
  sessionId: string;
}

export interface ReviewResult {
  accepted: boolean;
}

export interface BuildApplyPlanRequest {
  sessionId: string;
}

export interface ApplyDecisionRequest {
  sessionId: string;
}

export interface ApplyResult {
  applied: boolean;
}

export interface SaveAsDraftRequest {
  sessionId: string;
}

export interface DraftSaveResult {
  saved: boolean;
  draftPath?: string;
}

export interface RefinedLayerToolPort {
  checkEligibility(request: EligibilityRequest): Promise<CheckEligibilityResult>;
  createProposal(request: CreateProposalRequest): Promise<ProposalSessionSummary>;
  getProposalSession(sessionId: string): Promise<ProposalSession>;
  requestReview(request: ReviewRequest): Promise<ReviewResult>;
  buildApplyPlan(request: BuildApplyPlanRequest): Promise<ApplyPlan>;
  applyDecision(request: ApplyDecisionRequest): Promise<ApplyResult>;
  saveAsDraft(request: SaveAsDraftRequest): Promise<DraftSaveResult>;
}
