import type { WorkflowProfile } from "./WorkflowProfile";

/**
 * v0.1.0 hardcoded raw-refined profile.
 * v0.2.0: eligibility checks are migrating to RawRefinedWorkflowSettings;
 * this profile is retained for prompt, review, apply, and capabilities policies.
 */
export const rawRefinedProfile: WorkflowProfile = {
  id: "raw-refined",
  name: "Raw Refined",
  version: "0.1.0",
  eligibility: {
    requiredExtension: "md",
    requireFrontmatter: true,
    requiredStatus: "raw",
    requiredHeading: "## 原始内容",
  },
  protectedRegions: {
    definitions: [
      {
        id: "original-content",
        heading: "## 原始内容",
        mode: "from-heading-to-end",
        required: true,
        preserveExactText: true,
      },
    ],
  },
  outputSections: {
    required: ["summary", "coreQuestion", "currentConclusion", "reasoning"],
    optional: ["scope", "nextSteps", "refineNote"],
  },
  frontmatter: {
    allowedFields: ["status", "created", "source", "context"],
    readonlyFields: ["created"],
    confirmRequiredFields: ["status", "source", "context"],
    forbiddenFields: ["ai", "type", "subtype", "domain", "topic", "confidence", "verified", "updated"],
  },
  tags: {
    mode: "allow-list",
    allowedTags: [
      "#ai/generated",
      "#ai/assisted",
      "#ai/reviewed",
      "#ai/suggested",
      "#todo/refine",
      "#todo/link",
      "#todo/review",
      "#flag/core",
      "#flag/sensitive",
    ],
    blockedTags: ["#raw", "#refined", "#self", "#external", "#practice", "#rel/*"],
  },
  prompt: {
    systemPrompt: [
      "You are generating a raw-refined proposal for an Obsidian note.",
      "Return JSON only.",
      "Do not include any text outside JSON.",
      "Never include or rewrite the protected heading ## 原始内容 or any protected-region content.",
      "Use this schema:",
      "{\"workflowProfileId\":\"raw-refined\",\"refinedSections\":{\"summary\":\"string\",\"coreQuestion\":\"string\",\"currentConclusion\":\"string\",\"reasoning\":\"string\",\"scope\":\"string?\",\"nextSteps\":\"string?\",\"refineNote\":\"string?\"},\"frontmatterSuggestion\":{\"status\":\"refined\",\"source\":[\"self|external|practice\"],\"context\":[\"string\"]},\"tagSuggestion\":{\"add\":[\"string\"],\"remove\":[\"string\"]},\"warnings\":[\"string\"]}",
    ].join("\n"),
    userPrompt: [
      "Refine the current note into the approved raw-refined structure.",
      "notePath: {{notePath}}",
      "noteTitle: {{noteTitle}}",
      "noteContent:",
      "{{noteContent}}",
    ].join("\n"),
  },
  proposalSchema: {
    workflowProfileId: "raw-refined",
  },
  review: {
    required: true,
    defaultChannel: "obsidian-ui",
    allowApplyWithoutReview: false,
  },
  apply: {
    requireFreshnessCheck: true,
    preserveProtectedRegions: true,
    requireApplyPlan: true,
    allowPartialApply: true,
    onConflict: "block-and-offer-draft",
  },
  capabilities: {
    body: true,
    frontmatter: true,
    tags: true,
    rename: false,
    move: false,
    links: false,
    moc: false,
    archive: false,
    delete: false,
  },
};
