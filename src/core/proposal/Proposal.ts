export interface RawRefinedProposal {
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
    [key: string]: unknown;
  };
  tagSuggestion?: {
    add?: string[];
    remove?: string[];
  };
  warnings?: string[];
}
