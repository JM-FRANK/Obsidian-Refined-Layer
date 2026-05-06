import { describe, expect, it } from "vitest";

import { createReviewViewModel, createReviewViewModelV2 } from "../../../src/ui/review/ReviewViewModel";
import type { ProposalSession, ProposalSessionV2 } from "../../../src/runtime/ProposalSession";

const session: ProposalSession = {
  id: "session-1",
  workflowProfileId: "raw-refined",
  policySnapshotId: "raw-refined:0.1.0",
  notePath: "10_Raw/example.md",
  noteTitle: "example",
  createdAt: "2026-05-04T00:00:00.000Z",
  updatedAt: "2026-05-04T00:00:00.000Z",
  baseFileHash: "file",
  baseProtectedRegionHash: "region",
  proposal: {
    workflowProfileId: "raw-refined",
    refinedSections: {
      summary: "summary",
      coreQuestion: "question",
      currentConclusion: "conclusion",
      reasoning: "reasoning",
      refineNote: "refine note",
    },
    frontmatterSuggestion: {
      status: "refined",
      source: ["self"],
      context: ["ctx/a"],
    },
    tagSuggestion: {
      add: ["#ai/generated"],
      remove: ["#todo/review"],
    },
    warnings: ["warn-1"],
  },
  tokenUsage: {
    provider: "mock-llm",
    model: "mock-gpt",
    totalTokens: 200,
    countingMode: "actual",
    generatedAt: "2026-05-04T00:00:00.000Z",
  },
  status: "generated",
};

describe("createReviewViewModel", () => {
  it("maps a proposal session into a review-friendly view model", () => {
    const viewModel = createReviewViewModel(session);

    expect(viewModel.bodyPreview).toContain("## 摘要");
    expect(viewModel.bodyPreview).toContain("summary");
    expect(viewModel.frontmatterSuggestions).toEqual([
      { field: "status", value: "refined" },
      { field: "source", value: "self" },
      { field: "context", value: "ctx/a" },
    ]);
    expect(viewModel.tagSuggestions).toEqual({
      add: ["#ai/generated"],
      remove: ["#todo/review"],
    });
    expect(viewModel.initialDecision).toEqual({
      acceptBody: false,
      editedRefinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "reasoning",
        refineNote: "refine note",
      },
      acceptFrontmatter: {
        status: false,
        source: false,
        context: false,
      },
      acceptTags: {
        add: [],
        remove: [],
      },
    });
  });
});

const sessionV2: ProposalSessionV2 = {
  id: "session-v2",
  workflowProfileId: "raw-refined",
  schemaVersion: "0.2",
  createdAt: "2026-05-06T00:00:00.000Z",
  updatedAt: "2026-05-06T00:00:00.000Z",
  notePath: "10_Raw/v2.md",
  noteTitle: "v2",
  baseFileHash: "file",
  baseBBlockHash: "b-block",
  blockConfigSnapshot: {
    protectH1: true,
    aBlocks: [
      {
        id: "summary",
        name: "摘要",
        heading: "摘要",
        headingLevel: 2,
        prompt: "Summarize.",
        order: 1,
        enabled: true,
      },
      {
        id: "reasoning",
        name: "推理",
        heading: "推理",
        headingLevel: 2,
        prompt: "Reason.",
        order: 2,
        enabled: true,
      },
    ],
    bBlock: {
      id: "original-content",
      name: "原始内容",
      heading: "原始内容",
      headingLevel: 2,
      required: true,
    },
    tagWhitelist: ["#ai/generated", "#todo/review"],
  },
  proposal: {
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    blocks: [
      { id: "reasoning", content: "Reasoning.", warnings: ["block warning"] },
      { id: "summary", content: "Summary." },
    ],
    frontmatterSuggestion: {
      status: "refined",
      source: ["self"],
      context: ["ctx/v2"],
    },
    tagSuggestion: {
      selectedTags: ["#ai/generated", "#todo/review"],
      newTagSuggestions: ["#new/idea"],
    },
    warnings: ["proposal warning"],
  },
  validation: {
    status: "partial",
    acceptedFields: ["blocks.summary", "blocks.reasoning", "tagSuggestion.selectedTags"],
    rejectedFields: [
      { field: "tagSuggestion.selectedTags", reason: "Moved unknown tag to newTagSuggestions.", value: "#new/idea" },
    ],
    warnings: ["validation warning"],
    tagNormalizationApplied: true,
  },
  tokenUsage: {
    provider: "mock-llm",
    model: "mock-gpt",
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    countingMode: "actual",
    generatedAt: "2026-05-06T00:00:00.000Z",
  },
  status: "generated",
  source: {
    provider: "mock-llm",
    model: "mock-gpt",
    attemptsUsed: 3,
  },
};

describe("createReviewViewModelV2", () => {
  it("maps ProposalSessionV2 into A block review data with unchecked defaults", () => {
    const viewModel = createReviewViewModelV2(sessionV2);

    expect(viewModel.schemaVersion).toBe("0.2");
    expect(viewModel.blocks.map((block) => block.id)).toEqual(["summary", "reasoning"]);
    expect(viewModel.blocks[0]).toMatchObject({
      id: "summary",
      heading: "摘要",
      headingLevel: 2,
      content: "Summary.",
      warnings: [],
      accepted: false,
    });
    expect(viewModel.blocks[1].warnings).toEqual(["block warning"]);
    expect(viewModel.initialDecision.acceptBlocks).toEqual({
      summary: false,
      reasoning: false,
    });
  });

  it("maps selectedTags as unchecked apply candidates and keeps newTagSuggestions read-only", () => {
    const viewModel = createReviewViewModelV2(sessionV2);

    expect(viewModel.selectedTags).toEqual([
      { tag: "#ai/generated", accepted: false },
      { tag: "#todo/review", accepted: false },
    ]);
    expect(viewModel.newTagSuggestions).toEqual(["#new/idea"]);
    expect(viewModel.initialDecision.acceptTags).toEqual({ add: [] });
    expect(viewModel.initialDecision.acceptTags.add).not.toContain("#new/idea");
  });

  it("exposes normalization, validation warnings, rejected fields, attempts used, and token usage", () => {
    const viewModel = createReviewViewModelV2(sessionV2);

    expect(viewModel.tagNormalizationApplied).toBe(true);
    expect(viewModel.validationWarnings).toEqual(["validation warning", "proposal warning"]);
    expect(viewModel.rejectedFields).toEqual(sessionV2.validation.rejectedFields);
    expect(viewModel.attemptsUsed).toBe(3);
    expect(viewModel.tokenUsage?.totalTokens).toBe(150);
  });
});
