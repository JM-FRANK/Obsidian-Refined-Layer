import type { ABlockConfig } from "../profile/BlockConfig";

export interface AcceptedABlock {
  config: ABlockConfig;
  content: string;
}

export interface MarkdownAssemblyInput {
  acceptedABlocks: AcceptedABlock[];
  bBlockText: string;
  firstH1Text?: string;
  protectH1: boolean;
}

export class MarkdownAssembler {
  assemble(input: MarkdownAssemblyInput): string {
    const parts: string[] = [];

    // 1. Preserve first H1 when protectH1 is enabled
    if (input.protectH1 && input.firstH1Text) {
      parts.push(`# ${input.firstH1Text}`);
    }

    // 2. Accepted A blocks, sorted by order
    const sorted = [...input.acceptedABlocks].sort(
      (a, b) => a.config.order - b.config.order,
    );

    for (const block of sorted) {
      const heading = `${"#".repeat(block.config.headingLevel)} ${block.config.heading}`;
      parts.push(`${heading}\n\n${block.content.trimEnd()}`);
    }

    // 3. B block byte-for-byte (includes its own heading from BlockExtractor)
    parts.push(input.bBlockText);

    return parts.join("\n\n") + "\n";
  }
}
