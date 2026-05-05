import { describe, expect, it } from "vitest";

import {
  normalizeTagList,
  normalizeProposalTags,
} from "../../../src/core/proposal/TagNormalizer";

const WHITELIST = [
  "#ai/generated",
  "#ai/assisted",
  "#ai/reviewed",
  "#ai/suggested",
  "#todo/refine",
  "#todo/link",
  "#todo/review",
  "#flag/core",
  "#flag/sensitive",
];

// ── normalizeTagList ──

describe("normalizeTagList", () => {
  it("splits by English comma", () => {
    expect(normalizeTagList("#ai/generated, #todo/refine")).toEqual([
      "#ai/generated",
      "#todo/refine",
    ]);
  });

  it("splits by Chinese comma", () => {
    expect(normalizeTagList("#ai/generated，#todo/refine")).toEqual([
      "#ai/generated",
      "#todo/refine",
    ]);
  });

  it("splits by Chinese dunhao", () => {
    expect(normalizeTagList("#ai/generated、#todo/refine")).toEqual([
      "#ai/generated",
      "#todo/refine",
    ]);
  });

  it("splits by spaces", () => {
    expect(normalizeTagList("#ai/generated #todo/refine")).toEqual([
      "#ai/generated",
      "#todo/refine",
    ]);
  });

  it("splits by newlines", () => {
    expect(normalizeTagList("#ai/generated\n#todo/refine")).toEqual([
      "#ai/generated",
      "#todo/refine",
    ]);
  });

  it("splits by mixed separators", () => {
    expect(
      normalizeTagList(
        "ai/assisted, #todo/refine，flag/core、#flag/sensitive",
      ),
    ).toEqual([
      "#ai/assisted",
      "#todo/refine",
      "#flag/core",
      "#flag/sensitive",
    ]);
  });

  it("prepends missing #", () => {
    expect(normalizeTagList("ai/generated")).toEqual(["#ai/generated"]);
  });

  it("trims whitespace from tags", () => {
    expect(normalizeTagList("  #ai/generated  ")).toEqual(["#ai/generated"]);
  });

  it("removes empty items caused by consecutive separators", () => {
    expect(normalizeTagList("#a,,#b")).toEqual(["#a", "#b"]);
  });

  it("deduplicates, preserving first-occurrence order", () => {
    expect(normalizeTagList("#b, #a, #b, #a")).toEqual(["#b", "#a"]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeTagList("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(normalizeTagList("   ")).toEqual([]);
  });

  it("does NOT normalize case", () => {
    expect(normalizeTagList("#AI/Generated")).toEqual(["#AI/Generated"]);
  });

  it("preserves already-normalized single tag unchanged", () => {
    expect(normalizeTagList("#ai/generated")).toEqual(["#ai/generated"]);
  });

  it("handles tag that is just #", () => {
    // "#" already has #, not empty, kept as-is
    expect(normalizeTagList("#")).toEqual(["#"]);
  });

  it("handles CRLF newlines via \\s", () => {
    expect(normalizeTagList("#a\r\n#b")).toEqual(["#a", "#b"]);
  });
});

// ── normalizeProposalTags ──

describe("normalizeProposalTags", () => {
  it("returns whitelisted tags as selectedTags", () => {
    const result = normalizeProposalTags(
      { selectedTags: ["#ai/generated", "#todo/refine"], newTagSuggestions: [] },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated", "#todo/refine"]);
    expect(result.newTagSuggestions).toEqual([]);
    expect(result.tagNormalizationApplied).toBe(false);
  });

  it("moves non-whitelisted selectedTags to newTagSuggestions", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["#ai/generated", "#my/custom-tag"],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated"]);
    expect(result.newTagSuggestions).toEqual(["#my/custom-tag"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("moves multiple non-whitelisted tags", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["#custom/a", "#custom/b"],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual([]);
    expect(result.newTagSuggestions).toEqual(["#custom/a", "#custom/b"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("preserves newTagSuggestions when no tags are moved", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["#ai/generated"],
        newTagSuggestions: ["#suggested/tag"],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated"]);
    expect(result.newTagSuggestions).toEqual(["#suggested/tag"]);
    expect(result.tagNormalizationApplied).toBe(false);
  });

  it("combines existing newTagSuggestions with moved non-whitelisted tags", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["#ai/generated", "#custom/tag"],
        newTagSuggestions: ["#suggested/tag"],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated"]);
    expect(result.newTagSuggestions).toEqual([
      "#suggested/tag",
      "#custom/tag",
    ]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("splits separator-containing strings in selectedTags", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["ai/assisted, #todo/refine"],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/assisted", "#todo/refine"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("splits separator-containing strings in newTagSuggestions", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: [],
        newTagSuggestions: ["#suggested/a, #suggested/b"],
      },
      WHITELIST,
    );

    expect(result.newTagSuggestions).toEqual([
      "#suggested/a",
      "#suggested/b",
    ]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("moves non-whitelisted tags that result from splitting", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["#ai/generated, #custom/tag"],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated"]);
    expect(result.newTagSuggestions).toEqual(["#custom/tag"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("prepends # during split before whitelist check", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["ai/generated, custom/tag"],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    // After splitting and prepending #: #ai/generated (whitelisted), #custom/tag (not)
    expect(result.selectedTags).toEqual(["#ai/generated"]);
    expect(result.newTagSuggestions).toEqual(["#custom/tag"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("handles empty selectedTags and newTagSuggestions", () => {
    const result = normalizeProposalTags(
      { selectedTags: [], newTagSuggestions: [] },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual([]);
    expect(result.newTagSuggestions).toEqual([]);
    expect(result.tagNormalizationApplied).toBe(false);
  });

  it("deduplicates tags after normalization", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["#ai/generated", "ai/generated"],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("does NOT normalize case in any tag field", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["#AI/Generated"],
        newTagSuggestions: ["#Custom/Tag"],
      },
      ["#AI/Generated", "#Custom/Tag"], // whitelist includes exact case
    );

    expect(result.selectedTags).toEqual(["#AI/Generated"]);
    expect(result.newTagSuggestions).toEqual(["#Custom/Tag"]);
    expect(result.tagNormalizationApplied).toBe(false);
  });

  it("marks applied when trim is needed", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["  #ai/generated  "],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("marks applied when # is prepended", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["ai/generated"],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });

  it("marks applied when empty items are removed", () => {
    const result = normalizeProposalTags(
      {
        selectedTags: ["#ai/generated, ,,#todo/refine"],
        newTagSuggestions: [],
      },
      WHITELIST,
    );

    expect(result.selectedTags).toEqual(["#ai/generated", "#todo/refine"]);
    expect(result.tagNormalizationApplied).toBe(true);
  });
});
