import type { ApplyPlan } from "../core/apply/ApplyPlan";
import type { ABlockConfig, BBlockConfig } from "../core/profile/BlockConfig";
import type { RawRefinedProposal, RawRefinedProposalV2 } from "../core/proposal/Proposal";
import type { TokenUsageReport } from "../core/proposal/TokenUsageReport";
import type { UserDecision, UserDecisionV2 } from "../core/review/UserDecision";

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

// ── v0.2.0 session / cache types ──

export interface ProposalSessionV2 {
  id: string;
  workflowProfileId: "raw-refined";
  schemaVersion: "0.2";
  createdAt: string;
  updatedAt: string;

  notePath: string;
  noteTitle: string;

  baseFileHash: string;
  baseFrontmatterHash?: string;
  baseBBlockHash: string;

  blockConfigSnapshot: {
    protectH1: boolean;
    aBlocks: ABlockConfig[];
    bBlock: BBlockConfig;
    tagWhitelist: string[];
  };

  proposal: RawRefinedProposalV2;
  validation: ProposalValidationResult;
  tokenUsage?: TokenUsageReport;

  status: "generated" | "reviewing" | "applied" | "saved_as_draft" | "discarded" | "conflicted";
  decision?: UserDecisionV2;

  source: {
    provider: string;
    model: string;
    attemptsUsed: number;
  };
}

export interface ProposalValidationResult {
  status: "valid" | "partial" | "invalid";
  acceptedFields: string[];
  rejectedFields: Array<{
    field: string;
    reason: string;
    value?: unknown;
  }>;
  warnings: string[];
  tagNormalizationApplied: boolean;
}

export interface FailedAttemptRecord {
  id: string;
  errorSessionId: string;
  attemptIndex: 1 | 2 | 3;
  createdAt: string;

  provider: string;
  model: string;
  workflowProfileId: "raw-refined";
  schemaVersion: "0.2";

  notePath: string;
  noteTitle: string;

  blockConfigSnapshot: {
    protectH1: boolean;
    aBlocks: ABlockConfig[];
    bBlock: BBlockConfig;
    tagWhitelist: string[];
  };

  requestSnapshot: {
    messages: Array<{ role: "system" | "user"; content: string }>;
    schemaName: string;
    schemaVersion: string;
    metadata: Record<string, unknown>;
  };

  responseSnapshot?: {
    rawText?: string;
    extractedJsonText?: string;
    parsedJson?: unknown;
    usage?: TokenUsageReport;
  };

  validationSnapshot?: {
    jsonExtractionError?: string;
    zodError?: unknown;
    normalizationReport?: unknown;
    policyErrors?: unknown;
  };

  errorSummary: string;
}

export interface SessionCacheSettings {
  limit: number;
}

export interface ErrorSessionCacheSettings {
  enabled: boolean;
  limit: number;
}

// ── v0.2.0 persisted types ──

export interface PersistedProposalSessionV2 {
  id: string;
  workflowProfileId: "raw-refined";
  schemaVersion: "0.2";
  createdAt: string;
  updatedAt: string;

  notePath: string;
  noteTitle: string;

  baseFileHash: string;
  baseFrontmatterHash?: string;
  baseBBlockHash: string;

  blockConfigSnapshot: {
    protectH1: boolean;
    aBlocks: ABlockConfig[];
    bBlock: BBlockConfig;
    tagWhitelist: string[];
  };

  proposal: RawRefinedProposalV2;
  validation: ProposalValidationResult;
  tokenUsage?: TokenUsageReport;

  status: ProposalSessionV2["status"];
  decision?: UserDecisionV2;

  source: {
    provider: string;
    model: string;
    attemptsUsed: number;
  };
}

export interface PersistedFailedAttemptRecord {
  id: string;
  errorSessionId: string;
  attemptIndex: 1 | 2 | 3;
  createdAt: string;

  provider: string;
  model: string;
  workflowProfileId: "raw-refined";
  schemaVersion: "0.2";

  notePath: string;
  noteTitle: string;

  blockConfigSnapshot: {
    protectH1: boolean;
    aBlocks: ABlockConfig[];
    bBlock: BBlockConfig;
    tagWhitelist: string[];
  };

  requestSnapshot: {
    messages: Array<{ role: "system" | "user"; content: string }>;
    schemaName: string;
    schemaVersion: string;
    metadata: Record<string, unknown>;
  };

  responseSnapshot?: {
    rawText?: string;
    extractedJsonText?: string;
    parsedJson?: unknown;
    usage?: TokenUsageReport;
  };

  validationSnapshot?: {
    jsonExtractionError?: string;
    zodError?: unknown;
    normalizationReport?: unknown;
    policyErrors?: unknown;
  };

  errorSummary: string;
}
