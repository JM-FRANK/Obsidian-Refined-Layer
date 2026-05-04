import { describe, expect, it } from "vitest";

import { BlockExtractor } from "../../../src/core/markdown/BlockExtractor";
import { DEFAULT_B_BLOCK } from "../../../src/settings/PluginSettings";

describe("BlockExtractor", () => {
  const extractor = new BlockExtractor();
  const bBlock = DEFAULT_B_BLOCK; // heading="原始内容", headingLevel=2

  // ── Basic extraction ──

  it("extracts B block from heading to next same-level heading", () => {
    const result = extractor.extract(
      "# Title\n\n## 摘要\nsummary text\n\n## 原始内容\n原始 line 1\n原始 line 2\n\n## Next Section\nnext text\n",
      bBlock,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toBe("## 原始内容\n原始 line 1\n原始 line 2");
      expect(result.block.heading).toBe("原始内容");
      expect(result.block.headingLevel).toBe(2);
      expect(result.block.hash).toBeDefined();
      expect(result.block.hash).toHaveLength(64); // SHA256 hex
    }
  });

  it("extracts B block to end of file when no sibling-or-higher heading follows", () => {
    const result = extractor.extract(
      "# Title\n\n## 摘要\nsummary\n\n## 原始内容\nonly b block content\nmore content\n",
      bBlock,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toBe("## 原始内容\nonly b block content\nmore content");
    }
  });

  it("B block is NOT required to be at end of file", () => {
    const result = extractor.extract(
      "# Title\n\n## 原始内容\nb content\n\n## After B\ncontent after\n\n## More\nmore\n",
      bBlock,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toBe("## 原始内容\nb content");
    }
  });

  // ── Nested sub-headings preserved ──

  it("preserves nested sub-headings (level >= bBlock.level+1) inside B block", () => {
    const result = extractor.extract(
      "# Title\n\n## 原始内容\nB intro\n\n### Nested H3\nnested content\n\n#### Deep H4\ndeep content\n\n### Another H3\nmore\n\n## Next Section\noutside\n",
      bBlock,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toContain("### Nested H3");
      expect(result.block.text).toContain("#### Deep H4");
      expect(result.block.text).toContain("### Another H3");
      expect(result.block.text).not.toContain("Next Section");
      expect(result.block.text).not.toContain("outside");
      expect(result.block.text).toContain("B intro");
    }
  });

  it("next higher-level heading ends B block (H1 ends H2 B block)", () => {
    const result = extractor.extract(
      "## 原始内容\nb content\n\n# H1 Ends B Block\nh1 content\n",
      bBlock,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toBe("## 原始内容\nb content");
      expect(result.block.text).not.toContain("H1 Ends B Block");
    }
  });

  it("next same-level heading ends B block", () => {
    const result = extractor.extract(
      "## 原始内容\nb content\n\n## Another H2\nanother content\n",
      bBlock,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toBe("## 原始内容\nb content");
      expect(result.block.text).not.toContain("Another H2");
    }
  });

  // ── Errors ──

  it("returns missing-heading when B heading is absent", () => {
    const result = extractor.extract(
      "# Title\n\n## Other\ncontent\n",
      bBlock,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("missing-heading");
      expect(result.error.message).toContain("原始内容");
    }
  });

  it("returns heading-level-mismatch when heading text exists at wrong level", () => {
    const result = extractor.extract(
      "# Title\n\n### 原始内容\ncontent\n",
      bBlock, // expects level 2
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("heading-level-mismatch");
      expect(result.error.message).toContain("level 3");
    }
  });

  it("returns multiple-heading when B heading appears more than once", () => {
    const result = extractor.extract(
      "## 原始内容\nfirst\n\n## Other\nmiddle\n\n## 原始内容\nsecond\n",
      bBlock,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("multiple-heading");
      expect(result.error.message).toContain("2 times");
    }
  });

  it("returns empty-b-block when B heading has no content", () => {
    const result = extractor.extract(
      "# Title\n\n## 原始内容\n\n## Next\ncontent\n",
      bBlock,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("empty-b-block");
    }
  });

  it("returns empty-b-block when B heading is last line with no content", () => {
    const result = extractor.extract(
      "# Title\n\n## 原始内容",
      bBlock,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("empty-b-block");
    }
  });

  // ── Hash ──

  it("produces deterministic hash for same B block content", () => {
    const md = "# Title\n\n## 原始内容\nb content\n\n## Next\nnext\n";
    const r1 = extractor.extract(md, bBlock);
    const r2 = extractor.extract(md, bBlock);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.block.hash).toBe(r2.block.hash);
    }
  });

  it("produces different hash for different B block content", () => {
    const r1 = extractor.extract("## 原始内容\ncontent A\n", bBlock);
    const r2 = extractor.extract("## 原始内容\ncontent B\n", bBlock);

    if (r1.ok && r2.ok) {
      expect(r1.block.hash).not.toBe(r2.block.hash);
    }
  });

  // ── Configurable heading ──

  it("works with custom B block heading text and level", () => {
    const result = extractor.extract(
      "# Title\n\n### 保护区域\nprotected content here\n\n### Next\nnext content\n",
      {
        id: "original-content",
        name: "保护区域",
        heading: "保护区域",
        headingLevel: 3,
        required: true,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.heading).toBe("保护区域");
      expect(result.block.headingLevel).toBe(3);
      expect(result.block.text).toContain("protected content here");
    }
  });

  // ── Byte-for-byte preservation ──

  it("finds B block heading in CRLF Markdown", () => {
    const input = "# Title\r\n\r\n## 原始内容\r\nline 1\r\nline 2\r\n\r\n## Next\r\nnext\r\n";
    const result = extractor.extract(input, bBlock);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toContain("\r\n");
      expect(result.block.text).toBe("## 原始内容\r\nline 1\r\nline 2");
    }
  });

  it("CRLF extraction does not alter LF behavior", () => {
    const input = "# Title\n\n## 原始内容\nb content\n\n## Next\nnext\n";
    const result = extractor.extract(input, bBlock);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toBe("## 原始内容\nb content");
    }
  });

  it("preserves exact whitespace in B block content", () => {
    const result = extractor.extract(
      "## 原始内容\n  indented line\n\ttab indented\n\n  \n\n## Next\nnext\n",
      bBlock,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.text).toContain("  indented line");
      expect(result.block.text).toContain("\ttab indented");
    }
  });

  // ── Empty input ──

  it("returns missing-heading for empty input", () => {
    const result = extractor.extract("", bBlock);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("missing-heading");
    }
  });
});
