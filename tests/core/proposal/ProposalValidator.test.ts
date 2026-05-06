import { describe, expect, it } from "vitest";

import { rawRefinedProfile } from "../../../src/core/profile/rawRefinedProfile";
import { ProposalValidator } from "../../../src/core/proposal/ProposalValidator";

describe("ProposalValidator v0.2", () => {
  const validator = new ProposalValidator(rawRefinedProfile);

  const validProposal = JSON.stringify({
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    blocks: [
      { id: "summary", content: "summary" },
      { id: "reasoning", content: "reasoning" },
    ],
    frontmatterSuggestion: {
      status: "refined",
      source: ["self"],
      context: ["context/a"],
    },
    tagSuggestion: {
      selectedTags: ["#ai/generated"],
      newTagSuggestions: ["#custom/idea"],
    },
    warnings: ["warn"],
  });

  it("accepts valid RawRefinedProposalV2 JSON", () => {
    const result = validator.validateV2Output(validProposal);

    expect(result).toMatchObject({
      ok: true,
      proposal: {
        workflowProfileId: "raw-refined",
        schemaVersion: "0.2",
        blocks: [
          { id: "summary", content: "summary" },
          { id: "reasoning", content: "reasoning" },
        ],
      },
    });
  });

  it("extracts v0.2 JSON from a fenced code block", () => {
    const result = validator.validateV2Output(`Here is the proposal:\n\`\`\`json\n${validProposal}\n\`\`\``);

    expect(result).toMatchObject({ ok: true });
  });

  it("returns a JSON parse error for non-JSON output", () => {
    expect(validator.validateV2Output("not json")).toEqual({
      ok: false,
      errors: [
        {
          layer: "json",
          code: "invalid-json",
          message: "Model output is not valid JSON.",
        },
      ],
    });
  });

  it("returns zod-validation-failed when required v0.2 blocks are missing", () => {
    const result = validator.validateV2Output(JSON.stringify({
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
    }));

    expect(result).toMatchObject({
      ok: false,
      errors: [
        {
          layer: "schema",
          code: "zod-validation-failed",
          message: "Proposal does not match v0.2 schema.",
        },
      ],
    });
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.zodError).toBeDefined();
  });

  it("rejects invalid v0.2 field types through zod", () => {
    const result = validator.validateV2Output(JSON.stringify({
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [{ id: "summary", content: "summary" }],
      warnings: "bad",
    }));

    expect(result).toMatchObject({
      ok: false,
      errors: [
        {
          layer: "schema",
          code: "zod-validation-failed",
        },
      ],
    });
  });

  it("does not fail the whole v0.2 proposal for unknown selectedTags", () => {
    const result = validator.validateV2Output(JSON.stringify({
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [{ id: "summary", content: "summary" }],
      tagSuggestion: {
        selectedTags: ["#custom/idea", "#rel/test"],
        newTagSuggestions: [],
      },
    }));

    expect(result).toMatchObject({
      ok: true,
      proposal: {
        tagSuggestion: {
          selectedTags: ["#custom/idea", "#rel/test"],
          newTagSuggestions: [],
        },
      },
    });
  });

  it("rejects forbidden legacy capability fields through the v0.2 schema", () => {
    const result = validator.validateV2Output(JSON.stringify({
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [{ id: "summary", content: "summary" }],
      linkOperations: [{ from: "a", to: "b" }],
    }));

    expect(result).toMatchObject({
      ok: false,
      errors: [
        {
          layer: "schema",
          code: "zod-validation-failed",
        },
      ],
    });
  });
});
