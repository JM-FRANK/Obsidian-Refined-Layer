import type { BBlockConfig } from "../profile/BlockConfig";
import { hashText } from "../protected-region/hash";
import { HeadingParser, type HeadingInfo } from "./HeadingParser";

export type BBlockExtractionErrorCode =
  | "missing-heading"
  | "multiple-heading"
  | "empty-b-block"
  | "heading-level-mismatch";

export interface BBlockExtractionError {
  code: BBlockExtractionErrorCode;
  message: string;
}

export interface ExtractedBBlock {
  heading: string;
  headingLevel: number;
  text: string;
  charStart: number;
  charEnd: number;
  hash: string;
}

export type BBlockExtractionResult =
  | { ok: true; block: ExtractedBBlock }
  | { ok: false; error: BBlockExtractionError };

export class BlockExtractor {
  private readonly headingParser = new HeadingParser();

  extract(markdown: string, config: BBlockConfig): BBlockExtractionResult {
    const { headings } = this.headingParser.parse(markdown);

    // Find matches: heading text + headingLevel must both match BBlockConfig
    const matches = headings.filter(
      (h) => h.text === config.heading && h.level === config.headingLevel,
    );

    if (matches.length === 0) {
      // Check if heading text exists at a different level
      const sameTextDiffLevel = headings.find((h) => h.text === config.heading);
      if (sameTextDiffLevel) {
        return {
          ok: false,
          error: {
            code: "heading-level-mismatch",
            message: `Heading "${config.heading}" found at level ${sameTextDiffLevel.level}, but config expects level ${config.headingLevel}.`,
          },
        };
      }

      return {
        ok: false,
        error: {
          code: "missing-heading",
          message: `Required B block heading "${config.heading}" (level ${config.headingLevel}) was not found.`,
        },
      };
    }

    if (matches.length > 1) {
      return {
        ok: false,
        error: {
          code: "multiple-heading",
          message: `B block heading "${config.heading}" (level ${config.headingLevel}) appears ${matches.length} times.`,
        },
      };
    }

    const bHeading = matches[0];
    return this.extractRange(markdown, bHeading, config);
  }

  private extractRange(
    markdown: string,
    bHeading: HeadingInfo,
    config: BBlockConfig,
  ): BBlockExtractionResult {
    const { headings } = this.headingParser.parse(markdown);

    // Find next sibling-or-higher heading after the B heading
    const nextBoundaryHeading = headings.find(
      (h) =>
        h.lineIndex > bHeading.lineIndex && h.level <= config.headingLevel,
    );

    const blockEnd = nextBoundaryHeading
      ? nextBoundaryHeading.charStart
      : markdown.length;

    const text = markdown.slice(bHeading.charStart, blockEnd);

    // Trim trailing whitespace/newlines from the extracted block text
    const trimmedText = text.replace(/[\s\r\n]+$/, "");

    // Check if B block has no content beyond its heading line
    const headingLine = `${"#".repeat(config.headingLevel)} ${config.heading}`;
    if (trimmedText.trim() === headingLine) {
      return {
        ok: false,
        error: {
          code: "empty-b-block",
          message: `B block heading "${config.heading}" has no content after it.`,
        },
      };
    }

    return {
      ok: true,
      block: {
        heading: config.heading,
        headingLevel: config.headingLevel,
        text: trimmedText,
        charStart: bHeading.charStart,
        charEnd: blockEnd,
        hash: hashText(trimmedText),
      },
    };
  }
}
