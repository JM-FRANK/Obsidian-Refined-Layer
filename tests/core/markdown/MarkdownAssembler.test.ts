import { describe, expect, it } from "vitest";

import { MarkdownAssembler, type AcceptedABlock } from "../../../src/core/markdown/MarkdownAssembler";
import type { ABlockConfig } from "../../../src/core/profile/BlockConfig";
import { DEFAULT_A_BLOCKS } from "../../../src/settings/PluginSettings";

function aBlock(overrides: Partial<ABlockConfig> = {}): ABlockConfig {
  return {
    id: "summary",
    name: "摘要",
    heading: "摘要",
    headingLevel: 2,
    prompt: "test",
    order: 1,
    enabled: true,
    ...overrides,
  };
}

function acceptedBlock(overrides: Partial<ABlockConfig> = {}, content?: string): AcceptedABlock {
  return {
    config: aBlock(overrides),
    content: content ?? `Content for ${overrides.id ?? "summary"}`,
  };
}

describe("MarkdownAssembler", () => {
  const assembler = new MarkdownAssembler();

  // ── Basic assembly ──

  it("assembles accepted A blocks in order with B block", () => {
    const result = assembler.assemble({
      acceptedABlocks: [
        acceptedBlock({ id: "summary", heading: "摘要", order: 1 }, "Summary content."),
        acceptedBlock({ id: "reasoning", heading: "依据与推理", order: 4 }, "Reasoning content."),
      ],
      bBlockText: "## 原始内容\nprotected text\n",
      protectH1: false,
    });

    expect(result).toBe(
      "## 摘要\n\nSummary content.\n\n" +
      "## 依据与推理\n\nReasoning content.\n\n" +
      "## 原始内容\nprotected text\n" +
      "\n"
    );
  });

  it("outputs A blocks sorted by order regardless of input order", () => {
    const result = assembler.assemble({
      acceptedABlocks: [
        acceptedBlock({ id: "reasoning", order: 4, heading: "依据与推理" }, "Fourth."),
        acceptedBlock({ id: "summary", order: 1, heading: "摘要" }, "First."),
      ],
      bBlockText: "## 原始内容\nb\n",
      protectH1: false,
    });

    // summary (order 1) should come before reasoning (order 4)
    const summaryIdx = result.indexOf("## 摘要");
    const reasoningIdx = result.indexOf("## 依据与推理");
    expect(summaryIdx).toBeLessThan(reasoningIdx);
  });

  // ── Unaccepted A blocks are NOT output ──

  it("does not output unaccepted A blocks", () => {
    const result = assembler.assemble({
      acceptedABlocks: [
        acceptedBlock({ id: "summary", order: 1 }, "Summary."),
        // reasoning not in list
      ],
      bBlockText: "## 原始内容\nprotected\n",
      protectH1: false,
    });

    expect(result).not.toContain("## 依据与推理");
    expect(result).not.toContain("## 核心问题");
  });

  // ── All A blocks accepted ──

  it("outputs all A blocks when all are accepted", () => {
    const blocks = DEFAULT_A_BLOCKS.filter((b) => b.enabled).map((config) =>
      acceptedBlock(config, `Content for ${config.id}`),
    );

    const result = assembler.assemble({
      acceptedABlocks: blocks,
      bBlockText: "## 原始内容\nb\n",
      protectH1: false,
    });

    // All 7 A blocks should appear
    for (const config of DEFAULT_A_BLOCKS) {
      if (config.enabled) {
        expect(result).toContain(`${"#".repeat(config.headingLevel)} ${config.heading}`);
      }
    }
  });

  // ── No A blocks accepted ──

  it("outputs only B block when no A blocks are accepted", () => {
    const result = assembler.assemble({
      acceptedABlocks: [],
      bBlockText: "## 原始内容\nstandalone protected\n",
      protectH1: false,
    });

    expect(result).toBe("## 原始内容\nstandalone protected\n\n");
  });

  // ── protectH1 ──

  it("preserves H1 before A blocks when protectH1=true", () => {
    const result = assembler.assemble({
      acceptedABlocks: [acceptedBlock({ id: "summary", order: 1 }, "Summary.")],
      bBlockText: "## 原始内容\nb\n",
      firstH1Text: "My Note Title",
      protectH1: true,
    });

    expect(result.startsWith("# My Note Title\n\n")).toBe(true);
    // H1 appears before the first A block
    const h1Idx = result.indexOf("# My Note Title");
    const aIdx = result.indexOf("## 摘要");
    expect(h1Idx).toBeLessThan(aIdx);
  });

  it("does not output H1 when protectH1=false even if firstH1Text is provided", () => {
    const result = assembler.assemble({
      acceptedABlocks: [acceptedBlock({ id: "summary", order: 1 }, "Summary.")],
      bBlockText: "## 原始内容\nb\n",
      firstH1Text: "My Note Title",
      protectH1: false,
    });

    expect(result).not.toContain("# My Note Title");
  });

  it("does not output H1 when protectH1=true but firstH1Text is undefined", () => {
    const result = assembler.assemble({
      acceptedABlocks: [acceptedBlock({ id: "summary", order: 1 }, "Summary.")],
      bBlockText: "## 原始内容\nb\n",
      protectH1: true,
      // firstH1Text is undefined
    });

    expect(result.startsWith("## 摘要")).toBe(true);
  });

  // ── B block byte-for-byte preservation ──

  it("preserves B block text byte-for-byte", () => {
    const bBlockText = "## 原始内容\r\nline 1\r\nline 2\r\n";
    const result = assembler.assemble({
      acceptedABlocks: [acceptedBlock({ id: "summary", order: 1 }, "Summary.")],
      bBlockText,
      protectH1: false,
    });

    expect(result).toContain(bBlockText);
    expect(result.endsWith("\n")).toBe(true);
  });

  it("preserves B block sub-headings and special characters", () => {
    const bBlockText = "## 原始内容\nB content\n\n### Sub heading\nsub content\n\n- list item\n- another\n";
    const result = assembler.assemble({
      acceptedABlocks: [],
      bBlockText,
      protectH1: false,
    });

    expect(result).toContain("### Sub heading");
    expect(result).toContain("- list item");
    expect(result).toContain("B content");
  });

  // ── A block heading levels ──

  it("renders correct heading markers for different levels", () => {
    const result = assembler.assemble({
      acceptedABlocks: [
        acceptedBlock({ id: "h1", heading: "H1 Block", headingLevel: 1, order: 1 }, "H1 content."),
        acceptedBlock({ id: "h3", heading: "H3 Block", headingLevel: 3, order: 2 }, "H3 content."),
        acceptedBlock({ id: "h6", heading: "H6 Block", headingLevel: 6, order: 3 }, "H6 content."),
      ],
      bBlockText: "## B\nb\n",
      protectH1: false,
    });

    expect(result).toContain("# H1 Block\n\nH1 content.");
    expect(result).toContain("### H3 Block\n\nH3 content.");
    expect(result).toContain("###### H6 Block\n\nH6 content.");
  });

  // ── Content whitespace ──

  it("trims trailing whitespace from A block content", () => {
    const result = assembler.assemble({
      acceptedABlocks: [acceptedBlock({ id: "summary", order: 1 }, "  padded content  \n\n")],
      bBlockText: "## B\nb\n",
      protectH1: false,
    });

    // Trailing whitespace/newlines trimmed, but a single \n added before next section
    expect(result).toContain("padded content");
    // Should not have triple newline gap
    expect(result).not.toContain("\n\n\n");
  });

  // ── Empty A block content ──

  it("handles empty A block content", () => {
    const result = assembler.assemble({
      acceptedABlocks: [acceptedBlock({ id: "summary", order: 1 }, "")],
      bBlockText: "## B\nb\n",
      protectH1: false,
    });

    expect(result).toContain("## 摘要\n\n\n\n## B");
  });

  // ── Integration with real BlockExtractor output ──

  it("assembles correctly with B block from BlockExtractor", () => {
    // Simulates the real flow: BlockExtractor extracts B block, MarkdownAssembler assembles
    const bBlockText = "## 原始内容\nprotected line 1\nprotected line 2";
    const result = assembler.assemble({
      acceptedABlocks: [
        acceptedBlock({ id: "summary", order: 1 }, "Refined summary."),
        acceptedBlock({ id: "coreQuestion", heading: "核心问题", order: 2 }, "Refined question."),
      ],
      bBlockText,
      firstH1Text: "Test Note",
      protectH1: true,
    });

    const expected =
      "# Test Note\n\n" +
      "## 摘要\n\nRefined summary.\n\n" +
      "## 核心问题\n\nRefined question.\n\n" +
      "## 原始内容\nprotected line 1\nprotected line 2\n";

    expect(result).toBe(expected);
  });
});
