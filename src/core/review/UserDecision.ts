import type { RefinedSections } from "../proposal/Proposal";

export interface UserDecision {
  acceptBody: boolean;
  editedRefinedSections?: RefinedSections;
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

// ── v0.2.0 ──

export interface UserDecisionV2 {
  acceptBlocks: Record<string, boolean>;

  acceptFrontmatter: {
    status?: boolean;
    source?: boolean;
    context?: boolean;
  };

  acceptTags: {
    add: string[];
  };

  saveAsDraftOnly?: boolean;
}
