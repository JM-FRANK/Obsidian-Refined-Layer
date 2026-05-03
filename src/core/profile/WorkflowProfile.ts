export type EligibilityFailureReason =
  | "unsupported-file-extension"
  | "missing-frontmatter"
  | "invalid-status"
  | "missing-required-heading";

export interface EligibilityPolicy {
  requiredExtension: "md";
  requireFrontmatter: boolean;
  requiredStatus: "raw";
  requiredHeading: string;
}

export type ProtectedRegionMode = "from-heading-to-end" | "between-headings";

export interface ProtectedRegionDefinition {
  id: string;
  heading: string;
  mode: ProtectedRegionMode;
  required: boolean;
  preserveExactText: boolean;
}

export interface ProtectedRegionPolicy {
  definitions: ProtectedRegionDefinition[];
}

export interface OutputSectionPolicy {
  required: ["summary", "coreQuestion", "currentConclusion", "reasoning"];
  optional: ["scope", "nextSteps", "refineNote"];
}

export interface FrontmatterPolicy {
  allowedFields: ["status", "created", "source", "context"];
  readonlyFields: ["created"];
  confirmRequiredFields: ["status", "source", "context"];
  forbiddenFields: [
    "ai",
    "type",
    "subtype",
    "domain",
    "topic",
    "confidence",
    "verified",
    "updated",
  ];
}

export interface TagPolicy {
  mode: "allow-list";
  allowedTags: readonly string[];
  blockedTags: readonly string[];
}

export interface PromptPolicy {
  systemPrompt: string;
  userPrompt: string;
}

export interface ProposalSchemaPolicy {
  workflowProfileId: "raw-refined";
}

export interface ReviewPolicy {
  required: true;
  defaultChannel: "obsidian-ui";
  allowApplyWithoutReview: false;
}

export interface ApplyPolicy {
  requireFreshnessCheck: true;
  preserveProtectedRegions: true;
  requireApplyPlan: true;
  allowPartialApply: true;
  onConflict: "block-and-offer-draft";
}

export interface ApplyCapabilities {
  body: true;
  frontmatter: true;
  tags: true;
  rename: false;
  move: false;
  links: false;
  moc: false;
  archive: false;
  delete: false;
}

export interface WorkflowProfile {
  id: string;
  name: string;
  version: string;
  eligibility: EligibilityPolicy;
  protectedRegions: ProtectedRegionPolicy;
  outputSections: OutputSectionPolicy;
  frontmatter: FrontmatterPolicy;
  tags: TagPolicy;
  prompt: PromptPolicy;
  proposalSchema: ProposalSchemaPolicy;
  review: ReviewPolicy;
  apply: ApplyPolicy;
  capabilities: ApplyCapabilities;
}
