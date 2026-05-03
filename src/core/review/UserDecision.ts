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
