export interface HeadingInfo {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  lineIndex: number;
  charStart: number;
  charEnd: number;
}

export interface HeadingParseResult {
  headings: HeadingInfo[];
  firstH1?: HeadingInfo;
}

/**
 * Parses ATX headings from Markdown text.
 * Setext headings (underlined with === or ---) are NOT supported.
 * Frontmatter (between --- delimiters) is skipped when locating firstH1.
 */
export class HeadingParser {
  parse(markdown: string): HeadingParseResult {
    const headings: HeadingInfo[] = [];
    let firstH1: HeadingInfo | undefined;

    const frontmatterEnd = this.findFrontmatterEnd(markdown);

    let pos = 0;
    let lineIndex = 0;
    const len = markdown.length;

    while (pos < len) {
      const lineStart = pos;
      const newlineIdx = markdown.indexOf("\n", pos);
      const lineEnd = newlineIdx === -1 ? len : newlineIdx;
      const line = markdown.slice(lineStart, lineEnd);

      const heading = this.parseAtxHeading(line, lineIndex, lineStart, lineEnd);
      if (heading) {
        headings.push(heading);
        if (!firstH1 && heading.level === 1 && lineStart >= frontmatterEnd) {
          firstH1 = heading;
        }
      }

      pos = lineEnd + (newlineIdx === -1 ? 0 : 1);
      lineIndex++;
    }

    return { headings, firstH1 };
  }

  private findFrontmatterEnd(markdown: string): number {
    if (!markdown.startsWith("---")) return 0;

    const closingIdx = markdown.indexOf("\n---", 3);
    if (closingIdx === -1) return 0;

    const nextNewline = markdown.indexOf("\n", closingIdx + 4);
    return nextNewline === -1 ? markdown.length : nextNewline + 1;
  }

  private parseAtxHeading(
    line: string,
    lineIndex: number,
    charStart: number,
    charEnd: number,
  ): HeadingInfo | null {
    const match = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/);
    if (!match) return null;

    const level = match[1].length as HeadingInfo["level"];
    const text = match[2].trim();
    if (text.length === 0) return null;

    return { level, text, lineIndex, charStart, charEnd };
  }
}
