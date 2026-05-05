import { describe, expect, it } from "vitest";

import { PromptBuilder } from "../../../src/core/prompt/PromptBuilder";
import { DEFAULT_A_BLOCKS, DEFAULT_TAG_WHITELIST } from "../../../src/settings/PluginSettings";

describe("PromptBuilder", () => {
  const builder = new PromptBuilder();
  const enabledABlocks = DEFAULT_A_BLOCKS.filter((b) => b.enabled);

  const baseInput = {
    provider: "mock-llm",
    model: "mock-gpt",
    notePath: "10_Raw/example.md",
    noteTitle: "Example Note",
    noteContent: "# Title\n\n## 原始内容\nprotected text\n",
    aBlocks: enabledABlocks,
    tagWhitelist: DEFAULT_TAG_WHITELIST,
    tagPrompt: "Select appropriate tags.",
  };

  // ── LlmRequest structure ──

  it("builds LlmRequest with correct structure", () => {
    const { request } = builder.build(baseInput);

    expect(request.provider).toBe("mock-llm");
    expect(request.model).toBe("mock-gpt");
    expect(request.schemaName).toBe("RawRefinedProposalV2");
    expect(request.schemaVersion).toBe("0.2");
    expect(request.metadata.workflowProfileId).toBe("raw-refined");
    expect(request.metadata.requestId).toMatch(/^req-\d+-[a-z0-9]+$/);
  });

  it("builds messages array with system and user roles", () => {
    const { request } = builder.build(baseInput);

    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].role).toBe("user");
    expect(request.messages[0].content.length).toBeGreaterThan(0);
    expect(request.messages[1].content.length).toBeGreaterThan(0);
  });

  // ── A block prompts ──

  it("includes all enabled A blocks in user prompt", () => {
    const { request } = builder.build(baseInput);
    const userContent = request.messages[1].content;

    for (const block of enabledABlocks) {
      expect(userContent).toContain(`Block: "${block.id}"`);
      expect(userContent).toContain(`- Heading: ${"#".repeat(block.headingLevel)} ${block.heading}`);
      expect(userContent).toContain(`- Prompt: ${block.prompt}`);
    }
  });

  it("does not include disabled A blocks", () => {
    const blocks = [
      { ...enabledABlocks[0], id: "enabled-1", enabled: true },
      { ...enabledABlocks[1], id: "disabled-1", enabled: false },
    ];
    const { request } = builder.build({ ...baseInput, aBlocks: blocks.filter((b) => b.enabled) });

    const userContent = request.messages[1].content;
    expect(userContent).toContain("enabled-1");
    expect(userContent).not.toContain("disabled-1");
  });

  // ── Tag whitelist and prompt ──

  it("includes tagWhitelist in user prompt", () => {
    const { request } = builder.build(baseInput);
    const userContent = request.messages[1].content;

    expect(userContent).toContain("Tag whitelist:");
    for (const tag of DEFAULT_TAG_WHITELIST) {
      expect(userContent).toContain(tag);
    }
  });

  it("includes tagPrompt in user prompt", () => {
    const input = { ...baseInput, tagPrompt: "Custom tag selection instruction." };
    const { request } = builder.build(input);
    const userContent = request.messages[1].content;

    expect(userContent).toContain("Tag prompt: Custom tag selection instruction.");
  });

  // ── Schema instruction ──

  it("includes schema instruction in system prompt", () => {
    const { request } = builder.build(baseInput);
    const systemContent = request.messages[0].content;

    // schemaName is on the request object, not in the prompt text
    expect(request.schemaName).toBe("RawRefinedProposalV2");
    // Schema structure is in the prompt text
    expect(systemContent).toContain("selectedTags");
    expect(systemContent).toContain("newTagSuggestions");
    expect(systemContent).toContain("must be strictly separate");
    expect(systemContent).toContain("tagWhitelist");
  });

  it("instructs LLM to use only whitelisted tags for selectedTags", () => {
    const { request } = builder.build(baseInput);
    const systemContent = request.messages[0].content;

    expect(systemContent).toContain("ONLY use tags from the supplied tagWhitelist");
  });

  // ── Note content ──

  it("includes note content in user prompt", () => {
    const { request } = builder.build(baseInput);
    const userContent = request.messages[1].content;

    expect(userContent).toContain("## Note Content");
    expect(userContent).toContain("protected text");
  });

  it("includes note metadata in user prompt", () => {
    const { request } = builder.build(baseInput);
    const userContent = request.messages[1].content;

    expect(userContent).toContain("Note path: 10_Raw/example.md");
    expect(userContent).toContain("Note title: Example Note");
  });

  // ── PromptDebugSnapshot ──

  it("produces PromptDebugSnapshot without secrets", () => {
    const { debugSnapshot } = builder.build(baseInput);

    expect(debugSnapshot.provider).toBe("mock-llm");
    expect(debugSnapshot.model).toBe("mock-gpt");
    expect(debugSnapshot.messages).toHaveLength(2);
    expect(debugSnapshot.schemaName).toBe("RawRefinedProposalV2");
    expect(debugSnapshot.schemaVersion).toBe("0.2");
    expect(debugSnapshot.metadata.aBlockIds).toEqual(enabledABlocks.map((b) => b.id));
    expect(debugSnapshot.metadata.tagWhitelist).toEqual(DEFAULT_TAG_WHITELIST);
    expect(debugSnapshot.metadata.notePath).toBe("10_Raw/example.md");
    expect(debugSnapshot.metadata.noteTitle).toBe("Example Note");

    // Must NOT contain secret-like fields
    const serialized = JSON.stringify(debugSnapshot);
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("secret");
  });

  // ── requestId ──

  it("uses provided requestId when given", () => {
    const { request } = builder.build({ ...baseInput, requestId: "custom-123" });

    expect(request.metadata.requestId).toBe("custom-123");
  });

  it("generates unique requestIds when not provided", () => {
    const { request: r1 } = builder.build(baseInput);
    const { request: r2 } = builder.build(baseInput);

    expect(r1.metadata.requestId).not.toBe(r2.metadata.requestId);
  });

  // ── Provider/model passthrough ──

  it("passes provider and model through to snapshot", () => {
    const input = { ...baseInput, provider: "deepseek", model: "deepseek-v4-flash" };
    const { request, debugSnapshot } = builder.build(input);

    expect(request.provider).toBe("deepseek");
    expect(request.model).toBe("deepseek-v4-flash");
    expect(debugSnapshot.provider).toBe("deepseek");
    expect(debugSnapshot.model).toBe("deepseek-v4-flash");
  });
});
