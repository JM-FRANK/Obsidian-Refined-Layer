import type { ApplyPlan } from "../core/apply/ApplyPlan";
import type { RawRefinedProposal } from "../core/proposal/Proposal";
import type { TokenUsageReport } from "../core/proposal/TokenUsageReport";
import type { UserDecision } from "../core/review/UserDecision";

export interface ProposalSession {
  id: string;
  workflowProfileId: "raw-refined";
  policySnapshotId: string;
  notePath: string;
  noteTitle: string;
  createdAt: string;
  updatedAt: string;
  baseFileHash: string;
  baseFrontmatterHash?: string;
  baseProtectedRegionHash?: string;
  proposal: RawRefinedProposal;
  tokenUsage?: TokenUsageReport;
  status:
    | "generated"
    | "reviewing"
    | "applied"
    | "saved_as_draft"
    | "discarded"
    | "conflicted";
  decision?: UserDecision;
  applyPlan?: ApplyPlan;
}

export interface ProposalSessionSummary {
  id: string;
  notePath: string;
  noteTitle: string;
  status: ProposalSession["status"];
  updatedAt: string;
}
