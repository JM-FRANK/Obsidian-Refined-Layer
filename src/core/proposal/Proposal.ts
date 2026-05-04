export interface RefinedSections {
  summary: string;
  coreQuestion: string;
  currentConclusion: string;
  reasoning: string;
  scope?: string;
  nextSteps?: string;
  refineNote?: string;
}

export interface RawRefinedProposal {
  workflowProfileId: "raw-refined";
  refinedSections: RefinedSections;
  frontmatterSuggestion?: {
    status?: "refined";
    source?: Array<"self" | "external" | "practice">;
    context?: string[];
    [key: string]: unknown;
  };
  tagSuggestion?: {
    add?: string[];
    remove?: string[];
  };
  warnings?: string[];
}

// ── v0.2.0 types ──

export interface ABlockProposal {
  id: string;
  content: string;
  warnings?: string[];
}

export interface RawRefinedProposalV2 {
  workflowProfileId: "raw-refined";
  schemaVersion: "0.2";

  blocks: ABlockProposal[];

  frontmatterSuggestion?: {
    status?: "refined";
    source?: Array<"self" | "external" | "practice">;
    context?: string[];
  };

  tagSuggestion?: {
    selectedTags?: string[];
    newTagSuggestions?: string[];
  };

  tagNormalizationApplied?: boolean;
  warnings?: string[];
}
