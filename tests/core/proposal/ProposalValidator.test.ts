import { describe, expect, it } from "vitest";

import { rawRefinedProfile } from "../../../src/core/profile/rawRefinedProfile";
import { ProposalValidator } from "../../../src/core/proposal/ProposalValidator";

describe("ProposalValidator", () => {
  const validator = new ProposalValidator(rawRefinedProfile);
  const validProposal = JSON.stringify({
    workflowProfileId: "raw-refined",
    refinedSections: {
      summary: "summary",
      coreQuestion: "question",
      currentConclusion: "conclusion",
      reasoning: "reasoning",
    },
    frontmatterSuggestion: {
      status: "refined",
      source: ["self"],
      context: ["context/a"],
    },
    tagSuggestion: {
      add: ["#ai/generated"],
      remove: ["#todo/refine"],
    },
    warnings: ["warn"],
  });

  it("accepts valid raw-refined proposal json", () => {
    const result = validator.validateModelOutput(validProposal);

    expect(result).toMatchObject({
      ok: true,
      proposal: {
        workflowProfileId: "raw-refined",
        refinedSections: {
          summary: "summary",
          coreQuestion: "question",
          currentConclusion: "conclusion",
          reasoning: "reasoning",
        },
      },
    });
  });

  it("extracts JSON from a fenced code block", () => {
    const result = validator.validateModelOutput(`Here is the proposal:\n\`\`\`json\n${validProposal}\n\`\`\``);

    expect(result).toMatchObject({ ok: true });
  });

  it("returns a JSON parse error for non-JSON output", () => {
    expect(validator.validateModelOutput("not json")).toEqual({
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

  it("fails when a required refined section is missing", () => {
    const result = validator.validateModelOutput(JSON.stringify({
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
      },
    }));

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          layer: "schema",
          code: "missing-required-section-reasoning",
          message: "refinedSections.reasoning must be a non-empty string.",
        },
      ],
    });
  });

  it("fails when a field type is invalid", () => {
    const result = validator.validateModelOutput(JSON.stringify({
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "reasoning",
      },
      warnings: "bad",
    }));

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          layer: "schema",
          code: "invalid-warnings",
          message: "warnings must be an array of strings.",
        },
      ],
    });
  });

  it("rejects readonly or unknown frontmatter fields", () => {
    const result = validator.validateModelOutput(JSON.stringify({
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "reasoning",
      },
      frontmatterSuggestion: {
        created: "yesterday",
        topic: "illegal",
      },
    }));

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          layer: "policy",
          code: "readonly-frontmatter-field",
          message: "frontmatterSuggestion.created is readonly.",
        },
        {
          layer: "policy",
          code: "unknown-frontmatter-field",
          message: "frontmatterSuggestion.topic is not allowed.",
        },
      ],
    });
  });

  it("rejects unknown or blocked tags", () => {
    const result = validator.validateModelOutput(JSON.stringify({
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "reasoning",
      },
      tagSuggestion: {
        add: ["#rel/test", "#custom"],
      },
    }));

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          layer: "policy",
          code: "unknown-tag",
          message: "Tag #rel/test is not allowed by the active profile.",
        },
        {
          layer: "policy",
          code: "blocked-tag",
          message: "Tag #rel/test is blocked by the active profile.",
        },
        {
          layer: "policy",
          code: "unknown-tag",
          message: "Tag #custom is not allowed by the active profile.",
        },
      ],
    });
  });

  it("rejects forbidden capability fields", () => {
    const result = validator.validateModelOutput(JSON.stringify({
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "reasoning",
      },
      linkOperations: [{ from: "a", to: "b" }],
    }));

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          layer: "policy",
          code: "forbidden-capability",
          message: "Proposal field linkOperations is forbidden because links capability is disabled.",
        },
      ],
    });
  });

  it("rejects protected-region leakage", () => {
    const result = validator.validateModelOutput(JSON.stringify({
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "## 原始内容\nraw text",
      },
    }), {
      protectedRegionText: "## 原始内容\nraw text",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          layer: "content",
          code: "protected-region-leakage",
          message: "Proposal must not include protected region text.",
        },
        {
          layer: "content",
          code: "protected-heading-in-proposal",
          message: "Proposal must not include the protected heading ## 原始内容.",
        },
      ],
    });
  });
});
