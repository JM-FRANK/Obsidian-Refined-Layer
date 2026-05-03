export interface ProposalSection {
  id: string;
  heading: string;
  content: string;
}

export interface RawRefinedProposal {
  workflowProfileId: "raw-refined";
  title?: string;
  summary?: string;
  frontmatter?: Record<string, unknown>;
  tags?: string[];
  sections: ProposalSection[];
  warnings?: string[];
}
