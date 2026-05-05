import { describe, expect, it } from "vitest";

import { rawRefinedProposalV2Schema } from "../../../src/core/proposal/ProposalSchema";

const validProposal = {
  workflowProfileId: "raw-refined",
  schemaVersion: "0.2",
  blocks: [
    { id: "summary", content: "A refined summary." },
    { id: "coreQuestion", content: "The core question." },
  ],
  tagSuggestion: {
    selectedTags: ["#ai/generated"],
    newTagSuggestions: ["#my/custom-tag"],
  },
};

describe("rawRefinedProposalV2Schema", () => {
  // ── Valid proposals ──

  it("accepts a minimal valid v0.2 proposal", () => {
    const result = rawRefinedProposalV2Schema.safeParse(validProposal);
    expect(result.success).toBe(true);
  });

  it("accepts proposal with all optional fields", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      frontmatterSuggestion: {
        status: "refined" as const,
        source: ["self" as const, "external" as const],
        context: ["context 1", "context 2"],
      },
      warnings: ["warning 1", "warning 2"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts proposal without tagSuggestion", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [{ id: "summary", content: "Content." }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts block with optional warnings", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      blocks: [
        { id: "summary", content: "Content.", warnings: ["minor issue"] },
      ],
    });
    expect(result.success).toBe(true);
  });

  // ── Missing/invalid blocks ──

  it("rejects proposal with missing blocks", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("blocks"))).toBe(true);
    }
  });

  it("rejects empty blocks array", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects block missing id", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      blocks: [{ content: "Missing id." }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "blocks")).toBe(true);
    }
  });

  it("rejects block missing content", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      blocks: [{ id: "summary" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "blocks")).toBe(true);
    }
  });

  it("rejects block with empty id string", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      blocks: [{ id: "", content: "Content." }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects block with empty content string", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      blocks: [{ id: "summary", content: "" }],
    });

    expect(result.success).toBe(false);
  });

  // ── Invalid workflowProfileId / schemaVersion ──

  it("rejects wrong workflowProfileId", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      workflowProfileId: "other-profile",
    });

    expect(result.success).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      schemaVersion: "0.1",
    });

    expect(result.success).toBe(false);
  });

  // ── tagSuggestion field type errors ──

  it("rejects selectedTags that is not an array of strings", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      tagSuggestion: { selectedTags: "not-an-array" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects newTagSuggestions that is not an array of strings", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      tagSuggestion: { newTagSuggestions: [123, false] },
    });

    expect(result.success).toBe(false);
  });

  it("rejects tagSuggestion with non-array selectedTags", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      tagSuggestion: { selectedTags: 42 },
    });

    expect(result.success).toBe(false);
  });

  // ── Invalid frontmatterSuggestion ──

  it("rejects invalid status in frontmatterSuggestion", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      frontmatterSuggestion: { status: "draft" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid source value in frontmatterSuggestion", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      frontmatterSuggestion: { source: ["invalid"] },
    });

    expect(result.success).toBe(false);
  });

  // ── Invalid warnings ──

  it("rejects warnings that is not an array of strings", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      ...validProposal,
      warnings: "not-an-array",
    });

    expect(result.success).toBe(false);
  });

  // ── Zod error structure ──

  it("produces structured zod error that can be saved to attempt", () => {
    const result = rawRefinedProposalV2Schema.safeParse({
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Verify error structure is serializable (for FailedAttemptRecord)
      const serialized = JSON.stringify(result.error.issues);
      expect(serialized).toContain("blocks");
      expect(serialized.length).toBeGreaterThan(0);
    }
  });

  // ── Non-object input ──

  it("rejects non-object input", () => {
    const result = rawRefinedProposalV2Schema.safeParse("not an object");
    expect(result.success).toBe(false);
  });

  it("rejects null input", () => {
    const result = rawRefinedProposalV2Schema.safeParse(null);
    expect(result.success).toBe(false);
  });
});
