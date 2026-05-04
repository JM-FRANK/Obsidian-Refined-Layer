import { describe, expect, it } from "vitest";

import { HeadingParser } from "../../../src/core/markdown/HeadingParser";

describe("HeadingParser", () => {
  const parser = new HeadingParser();

  // ── H1-H6 recognition ──

  it("parses H1 through H6 ATX headings", () => {
    const result = parser.parse(
      "# H1 Title\n## H2 Title\n### H3 Title\n#### H4 Title\n##### H5 Title\n###### H6 Title\n"
    );

    expect(result.headings).toHaveLength(6);
    expect(result.headings[0]).toMatchObject({ level: 1, text: "H1 Title" });
    expect(result.headings[1]).toMatchObject({ level: 2, text: "H2 Title" });
    expect(result.headings[2]).toMatchObject({ level: 3, text: "H3 Title" });
    expect(result.headings[3]).toMatchObject({ level: 4, text: "H4 Title" });
    expect(result.headings[4]).toMatchObject({ level: 5, text: "H5 Title" });
    expect(result.headings[5]).toMatchObject({ level: 6, text: "H6 Title" });
  });

  it("trims heading text", () => {
    const result = parser.parse("##   padded title   \n");

    expect(result.headings).toHaveLength(1);
    expect(result.headings[0]).toMatchObject({ level: 2, text: "padded title" });
  });

  it("strips closing # sequences", () => {
    const result = parser.parse("## My Title ##\n### Another ###\n");

    expect(result.headings).toHaveLength(2);
    expect(result.headings[0]).toMatchObject({ level: 2, text: "My Title" });
    expect(result.headings[1]).toMatchObject({ level: 3, text: "Another" });
  });

  it("rejects headings without space after #", () => {
    const result = parser.parse("##NoSpace\n");

    expect(result.headings).toHaveLength(0);
  });

  it("rejects empty heading text (# followed by nothing)", () => {
    const result = parser.parse("# \n");

    expect(result.headings).toHaveLength(0);
  });

  it("rejects 7+ # characters (not a heading)", () => {
    const result = parser.parse("####### not a heading\n");

    expect(result.headings).toHaveLength(0);
  });

  // ── Setext headings are NOT supported ──

  it("does not parse Setext headings", () => {
    const result = parser.parse("Setext Title\n=============\nSetext H2\n---------\n");

    // Only ATX headings are recognized; Setext lines are not headings
    expect(result.headings).toHaveLength(0);
  });

  // ── First H1 after frontmatter ──

  it("identifies first H1 after frontmatter", () => {
    const result = parser.parse(
      "---\nstatus: raw\n---\n\n# Note Title\n\n## A section\ntext\n"
    );

    expect(result.firstH1).toBeDefined();
    expect(result.firstH1).toMatchObject({ level: 1, text: "Note Title" });
  });

  it("firstH1 is undefined when no H1 exists", () => {
    const result = parser.parse("## Just an H2\ncontent\n");

    expect(result.firstH1).toBeUndefined();
  });

  it("firstH1 skips H1 inside frontmatter content", () => {
    const result = parser.parse(
      "---\n# Not a real heading inside frontmatter\n---\n\n# Real H1\n"
    );

    expect(result.firstH1).toBeDefined();
    expect(result.firstH1).toMatchObject({ level: 1, text: "Real H1" });
  });

  it("firstH1 uses first H1 when multiple H1s exist after frontmatter", () => {
    const result = parser.parse("# First H1\n\n# Second H1\n");

    expect(result.firstH1).toBeDefined();
    expect(result.firstH1).toMatchObject({ level: 1, text: "First H1" });
  });

  // ── No frontmatter case ──

  it("works when no frontmatter is present", () => {
    const result = parser.parse("# Title\n\n## Section\ncontent\n");

    expect(result.headings).toHaveLength(2);
    expect(result.firstH1).toBeDefined();
    expect(result.firstH1).toMatchObject({ level: 1, text: "Title" });
  });

  // ── Empty input ──

  it("returns empty for empty input", () => {
    const result = parser.parse("");

    expect(result.headings).toHaveLength(0);
    expect(result.firstH1).toBeUndefined();
  });

  // ── Duplicate headings are allowed (parser doesn't enforce uniqueness) ──

  it("parses duplicate heading text without error", () => {
    const result = parser.parse("## Same\n## Same\n");

    expect(result.headings).toHaveLength(2);
    expect(result.headings[0].text).toBe("Same");
    expect(result.headings[1].text).toBe("Same");
  });

  // ── CRLF line endings ──

  it("parses H1-H6 from CRLF input", () => {
    const result = parser.parse(
      "# H1\r\n## H2\r\n### H3\r\n#### H4\r\n##### H5\r\n###### H6\r\n"
    );

    expect(result.headings).toHaveLength(6);
    expect(result.headings[0]).toMatchObject({ level: 1, text: "H1" });
    expect(result.headings[5]).toMatchObject({ level: 6, text: "H6" });
  });

  it("identifies first H1 after frontmatter in CRLF input", () => {
    const result = parser.parse(
      "---\r\nstatus: raw\r\n---\r\n\r\n# Note Title\r\n\r\n## A section\r\ntext\r\n"
    );

    expect(result.firstH1).toBeDefined();
    expect(result.firstH1).toMatchObject({ level: 1, text: "Note Title" });
  });

  it("does not include \\r in heading text from CRLF input", () => {
    const result = parser.parse("## Clean Text\r\n");

    expect(result.headings).toHaveLength(1);
    expect(result.headings[0].text).toBe("Clean Text");
    expect(result.headings[0].text).not.toContain("\r");
  });

  it("preserves correct charStart/charEnd offsets with CRLF input", () => {
    // "# H1\r\n## H2\r\n"
    // positions: 0=#, 1=' ', 2=H, 3=1, 4=\r, 5=\n, 6=#, 7=#, 8=' ', 9=H, 10=2, 11=\r
    // H1: charStart=0, charEnd=4 (\n at 5, lineEnd=5, line="# H1\r")
    // H2: charStart=6, charEnd=11 (\n at 12, lineEnd=12, line="## H2\r")
    const result = parser.parse("# H1\r\n## H2\r\n");

    expect(result.headings).toHaveLength(2);
    // charStart is position of '#' on the original line
    expect(result.headings[0].charStart).toBe(0);
    expect(result.headings[1].charStart).toBe(6);
  });

  it("LF tests are not regressed by CRLF fix", () => {
    // Re-run a basic LF test to confirm no regression
    const result = parser.parse("# Title\n## Section\n### Sub\n");

    expect(result.headings).toHaveLength(3);
    expect(result.headings[0]).toMatchObject({ level: 1, text: "Title" });
    expect(result.headings[1]).toMatchObject({ level: 2, text: "Section" });
    expect(result.headings[2]).toMatchObject({ level: 3, text: "Sub" });
  });

  // ── Mixed content ──

  it("does not filter headings inside code fences (line-based parser)", () => {
    // HeadingParser is line-based; it does NOT understand code fences.
    // # inside code fences will be parsed as headings.
    const result = parser.parse(
      "Some text\n```\n# code comment, not heading\n```\n## Real Heading\n"
    );

    expect(result.headings).toHaveLength(2);
    expect(result.headings[0]).toMatchObject({ level: 1, text: "code comment, not heading" });
    expect(result.headings[1]).toMatchObject({ level: 2, text: "Real Heading" });
  });
});
