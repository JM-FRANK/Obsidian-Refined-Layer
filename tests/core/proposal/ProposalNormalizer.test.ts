import { describe, expect, it } from "vitest";

import type { RefineProfile } from "../../../src/core/profile/RefineProfile";
import type { RawRefinedProposalV2Parsed } from "../../../src/core/proposal/ProposalSchema";
import { ProposalNormalizer } from "../../../src/core/proposal/ProposalNormalizer";

const defaultSettings: RefineProfile = {
  id: "default",
  name: "Default",
  protectH1: true,
  bBlock: {
    id: "original-content",
    name: "原始内容",
    heading: "原始内容",
    headingLevel: 2,
    required: true,
  },
  tagWhitelist: ["#ai/generated", "#ai/assisted"],
  tagPrompt: "Select tags from whitelist.",
  promptObservationEnabled: false,
  aBlocks: [
    {
      id: "summary",
      name: "摘要",
      heading: "摘要",
      headingLevel: 2,
      prompt: "Write a summary.",
      order: 2,
      enabled: true,
    },
    {
      id: "coreQuestion",
      name: "核心问题",
      heading: "核心问题",
      headingLevel: 2,
      prompt: "Core question.",
      order: 1,
      enabled: true,
    },
  ],
};

function makeValidParsed(
  overrides?: Partial<RawRefinedProposalV2Parsed>,
): RawRefinedProposalV2Parsed {
  return {
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    blocks: [
      { id: "summary", content: "Summary content." },
      { id: "coreQuestion", content: "Core question content." },
    ],
    ...overrides,
  };
}

describe("ProposalNormalizer", () => {
  const normalizer = new ProposalNormalizer();

  describe("A block normalization", () => {
    it("accepts blocks matching enabled A block configs", () => {
      const result = normalizer.normalize(makeValidParsed(), defaultSettings);

      expect(result.blocks).toHaveLength(2);
      expect(result.validation.status).toBe("valid");
      expect(result.validation.acceptedFields).toEqual([
        "summary",
        "coreQuestion",
      ]);
    });

    it("rejects blocks with unknown ids", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          blocks: [
            { id: "summary", content: "Summary." },
            { id: "unknown-block", content: "Unknown." },
          ],
        }),
        defaultSettings,
      );

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe("summary");
      expect(result.validation.status).toBe("partial");
      expect(result.validation.rejectedFields).toHaveLength(1);
      expect(result.validation.rejectedFields[0].field).toBe(
        "block:unknown-block",
      );
      expect(result.validation.rejectedFields[0].reason).toBe(
        "unknown-block-id",
      );
    });

    it("warns when an enabled A block is missing from proposal", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          blocks: [{ id: "summary", content: "Only summary." }],
        }),
        defaultSettings,
      );

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe("summary");
      expect(result.validation.status).toBe("partial");
      expect(
        result.validation.warnings.some((w) =>
          w.includes("Missing enabled A block"),
        ),
      ).toBe(true);
    });

    it("sorts accepted blocks by config order", () => {
      // Config: coreQuestion.order=1, summary.order=2
      // Proposal puts summary first, coreQuestion second
      const result = normalizer.normalize(makeValidParsed(), defaultSettings);

      expect(result.blocks[0].id).toBe("coreQuestion");
      expect(result.blocks[1].id).toBe("summary");
    });

    it("ignores disabled A block configs when checking block validity", () => {
      const settings: RefineProfile = {
        ...defaultSettings,
        aBlocks: [
          {
            id: "summary",
            name: "摘要",
            heading: "摘要",
            headingLevel: 2,
            prompt: "Summary.",
            order: 1,
            enabled: true,
          },
          {
            id: "coreQuestion",
            name: "核心问题",
            heading: "核心问题",
            headingLevel: 2,
            prompt: "Core question.",
            order: 2,
            enabled: false,
          },
        ],
      };

      const result = normalizer.normalize(
        makeValidParsed(),
        settings,
      );

      // coreQuestion is in the proposal but its config is disabled → unknown
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe("summary");
      expect(result.validation.status).toBe("partial");
    });
  });

  describe("status determination", () => {
    it("returns invalid when no blocks are accepted", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          blocks: [{ id: "bogus-block", content: "Nope." }],
        }),
        defaultSettings,
      );

      expect(result.blocks).toHaveLength(0);
      expect(result.validation.status).toBe("invalid");
    });

    it("returns invalid when blocks array is empty", () => {
      const result = normalizer.normalize(
        makeValidParsed({ blocks: [] }),
        defaultSettings,
      );

      expect(result.blocks).toHaveLength(0);
      expect(result.validation.status).toBe("invalid");
    });

    it("returns partial when some blocks rejected and some accepted", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          blocks: [
            { id: "summary", content: "OK." },
            { id: "unknown", content: "Bad." },
          ],
        }),
        defaultSettings,
      );

      expect(result.blocks).toHaveLength(1);
      expect(result.validation.status).toBe("partial");
    });

    it("returns valid when all blocks accepted with no issues", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          blocks: [
            { id: "summary", content: "Summary." },
            { id: "coreQuestion", content: "Core." },
          ],
        }),
        defaultSettings,
      );

      expect(result.validation.status).toBe("valid");
    });
  });

  describe("tag normalization", () => {
    it("normalizes tags and includes result in output", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          tagSuggestion: {
            selectedTags: ["#ai/generated, custom-tag"],
            newTagSuggestions: [],
          },
        }),
        defaultSettings,
      );

      // #ai/generated is whitelisted, custom-tag moves to new
      expect(result.tagSuggestion.selectedTags).toEqual(["#ai/generated"]);
      expect(result.tagSuggestion.newTagSuggestions).toEqual(["#custom-tag"]);
      expect(result.validation.tagNormalizationApplied).toBe(true);
    });

    it("adds tag normalization warning when tags are modified", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          tagSuggestion: {
            selectedTags: ["ai/generated, custom"],
            newTagSuggestions: [],
          },
        }),
        defaultSettings,
      );

      expect(
        result.validation.warnings.some((w) =>
          w.includes("Tag normalization applied"),
        ),
      ).toBe(true);
      expect(result.validation.tagNormalizationApplied).toBe(true);
    });

    it("does not add tag warning when tags need no normalization", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          tagSuggestion: {
            selectedTags: ["#ai/generated"],
            newTagSuggestions: [],
          },
        }),
        defaultSettings,
      );

      expect(
        result.validation.warnings.some((w) =>
          w.includes("Tag normalization applied"),
        ),
      ).toBe(false);
      expect(result.validation.tagNormalizationApplied).toBe(false);
    });

    it("handles missing tagSuggestion gracefully", () => {
      const result = normalizer.normalize(
        makeValidParsed({ tagSuggestion: undefined }),
        defaultSettings,
      );

      expect(result.tagSuggestion.selectedTags).toEqual([]);
      expect(result.tagSuggestion.newTagSuggestions).toEqual([]);
      expect(result.validation.tagNormalizationApplied).toBe(false);
      expect(result.validation.status).toBe("valid");
    });

    it("body is valid even when tags need normalization", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          tagSuggestion: {
            selectedTags: ["custom-tag"],
            newTagSuggestions: [],
          },
        }),
        defaultSettings,
      );

      // Tags non-whitelisted but body fine → still valid (not partial)
      expect(result.validation.status).toBe("valid");
      expect(result.validation.tagNormalizationApplied).toBe(true);
    });
  });

  describe("frontmatter passthrough", () => {
    it("passes frontmatter suggestion through as-is", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          frontmatterSuggestion: {
            status: "refined",
            source: ["self"],
          },
        }),
        defaultSettings,
      );

      expect(result.frontmatterSuggestion).toEqual({
        status: "refined",
        source: ["self"],
      });
    });

    it("handles undefined frontmatterSuggestion", () => {
      const result = normalizer.normalize(
        makeValidParsed({ frontmatterSuggestion: undefined }),
        defaultSettings,
      );

      expect(result.frontmatterSuggestion).toBeUndefined();
    });
  });

  describe("validation result structure", () => {
    it("rejectedFields contains value for rejected blocks", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          blocks: [
            { id: "summary", content: "OK." },
            { id: "unknown-1", content: "Bad 1." },
            { id: "unknown-2", content: "Bad 2." },
          ],
        }),
        defaultSettings,
      );

      expect(result.validation.rejectedFields).toHaveLength(2);
      expect(result.validation.rejectedFields[0].value).toBe("unknown-1");
      expect(result.validation.rejectedFields[1].value).toBe("unknown-2");
    });

    it("warnings include both missing blocks and tag normalization", () => {
      const result = normalizer.normalize(
        makeValidParsed({
          blocks: [{ id: "summary", content: "Only summary." }],
          tagSuggestion: {
            selectedTags: ["custom"],
            newTagSuggestions: [],
          },
        }),
        defaultSettings,
      );

      expect(result.validation.warnings.length).toBeGreaterThanOrEqual(2);
      const missingWarning = result.validation.warnings.find((w) =>
        w.includes("Missing enabled A block"),
      );
      const tagWarning = result.validation.warnings.find((w) =>
        w.includes("Tag normalization applied"),
      );
      expect(missingWarning).toBeTruthy();
      expect(tagWarning).toBeTruthy();
    });
  });
});
