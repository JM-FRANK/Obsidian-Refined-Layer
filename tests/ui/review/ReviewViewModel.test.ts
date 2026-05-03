import { describe, expect, it } from "vitest";

import { createReviewViewModel } from "../../../src/ui/review/ReviewViewModel";
import type { ProposalSession } from "../../../src/runtime/ProposalSession";

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
