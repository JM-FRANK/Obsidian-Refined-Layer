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

export interface PersistedProposalSession {
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
  proposal: PersistedRawRefinedProposal;
  tokenUsage?: PersistedTokenUsageReport;
  status: ProposalSession["status"];
  decision?: PersistedUserDecision;
}

export interface PersistedRawRefinedProposal {
  workflowProfileId: "raw-refined";
  refinedSections: {
    summary: string;
    coreQuestion: string;
    currentConclusion: string;
    reasoning: string;
    scope?: string;
    nextSteps?: string;
    refineNote?: string;
  };
  frontmatterSuggestion?: {
    status?: "refined";
    source?: Array<"self" | "external" | "practice">;
    context?: string[];
  };
  tagSuggestion?: {
    add?: string[];
    remove?: string[];
  };
  warnings?: string[];
}

export interface PersistedTokenUsageReport {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  countingMode: "actual" | "estimated" | "mixed" | "unavailable";
  generatedAt: string;
}

export interface PersistedUserDecision {
  acceptBody: boolean;
  editedRefinedSections?: {
    summary: string;
    coreQuestion: string;
    currentConclusion: string;
    reasoning: string;
    scope?: string;
    nextSteps?: string;
    refineNote?: string;
  };
  acceptFrontmatter: {
    status?: boolean;
    source?: boolean;
    context?: boolean;
  };
  acceptTags: {
    add?: string[];
    remove?: string[];
  };
  saveAsDraftOnly?: boolean;
}
