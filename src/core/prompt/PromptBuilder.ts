import type { ABlockConfig } from "../profile/BlockConfig";
import type { LlmRequestV2, PromptDebugSnapshot } from "./PromptDebugSnapshot";

export interface PromptBuilderInput {
  provider: string;
  model: string;
  notePath: string;
  noteTitle: string;
  noteContent: string;
  aBlocks: ABlockConfig[];
  tagWhitelist: string[];
  tagPrompt: string;
  requestId?: string;
}

export interface BuiltPrompt {
  request: LlmRequestV2;
  debugSnapshot: PromptDebugSnapshot;
}

export class PromptBuilder {
  build(input: PromptBuilderInput): BuiltPrompt {
    const requestId = input.requestId ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    const messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const metadata = {
      workflowProfileId: "raw-refined" as const,
      requestId,
    };

    const request: LlmRequestV2 = {
      provider: input.provider,
      model: input.model,
      messages,
      schemaName: "RawRefinedProposalV2",
      schemaVersion: "0.2",
      metadata,
    };

    const debugSnapshot: PromptDebugSnapshot = {
      provider: input.provider,
      model: input.model,
      messages,
      schemaName: "RawRefinedProposalV2",
      schemaVersion: "0.2",
      metadata: {
        ...metadata,
        aBlockIds: input.aBlocks.map((b) => b.id),
        tagWhitelist: input.tagWhitelist,
        notePath: input.notePath,
        noteTitle: input.noteTitle,
      },
    };

    return { request, debugSnapshot };
  }

  private buildSystemPrompt(): string {
    return [
      "You are a structured refinement assistant for an Obsidian note.",
      "You must return valid JSON only. Do not include any text outside the JSON.",
      "Do not rewrite or include the B block (protected original content) in your output.",
      "",
      "The JSON must conform to this schema:",
      "{",
      '  "workflowProfileId": "raw-refined",',
      '  "schemaVersion": "0.2",',
      '  "blocks": [',
      '    {"id": "string (matches A block id)", "content": "string (refined content)", "warnings": ["string"]}',
      "  ],",
      '  "frontmatterSuggestion": {',
      '    "status": "refined",',
      '    "source": ["self" | "external" | "practice"],',
      '    "context": ["string"]',
      "  },",
      '  "tagSuggestion": {',
      '    "selectedTags": ["string (must be from tagWhitelist only)"],',
      '    "newTagSuggestions": ["string (new tag suggestions not in whitelist)"]',
      "  },",
      '  "warnings": ["string"]',
      "}",
      "",
      "Rules:",
      "- blocks: one entry per A block. Use the provided block ids exactly.",
      "- tagSuggestion.selectedTags: ONLY use tags from the supplied tagWhitelist.",
      "- tagSuggestion.newTagSuggestions: use for tags NOT in the whitelist.",
      "- selectedTags and newTagSuggestions must be strictly separate.",
      "- Never include tags from the blocked tags list (#raw, #refined, #self, #external, #practice, #rel/*).",
    ].join("\n");
  }

  private buildUserPrompt(input: PromptBuilderInput): string {
    const parts: string[] = [];

    // Note metadata
    parts.push(`Note path: ${input.notePath}`);
    parts.push(`Note title: ${input.noteTitle}`);
    parts.push("");

    // A block prompts
    parts.push("## A Block Prompts");
    parts.push("");
    parts.push("For each A block below, generate refined content and return it with the matching block id.");
    parts.push("");

    for (const block of input.aBlocks) {
      parts.push(`### Block: "${block.id}"`);
      parts.push(`- Heading: ${"#".repeat(block.headingLevel)} ${block.heading}`);
      parts.push(`- Prompt: ${block.prompt}`);
      parts.push("");
    }

    // Tag prompt
    parts.push("## Tag Selection");
    parts.push("");
    parts.push(`Tag prompt: ${input.tagPrompt}`);
    parts.push("");
    parts.push("Tag whitelist:");
    parts.push(input.tagWhitelist.join("\n"));
    parts.push("");

    // Note content
    parts.push("## Note Content");
    parts.push("");
    parts.push(input.noteContent);

    return parts.join("\n");
  }
}
