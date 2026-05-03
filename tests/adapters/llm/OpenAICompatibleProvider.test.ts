import { afterEach, describe, expect, it, vi } from "vitest";

import { OpenAICompatibleProvider } from "../../../src/adapters/llm/OpenAICompatibleProvider";

const originalFetch = globalThis.fetch;

describe("OpenAICompatibleProvider", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("normalizes actual usage from the provider response", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: "{\"workflowProfileId\":\"raw-refined\",\"refinedSections\":{\"summary\":\"a\",\"coreQuestion\":\"b\",\"currentConclusion\":\"c\",\"reasoning\":\"d\"}}",
              },
            },
          ],
          usage: {
            prompt_tokens: 11,
            completion_tokens: 22,
            total_tokens: 33,
          },
        };
      },
    })) as any;

    const provider = new OpenAICompatibleProvider({
      secretStore: {
        isAvailable: () => true,
        getSecret: () => "sk-test",
        setSecret: () => undefined,
      },
      secretRef: "obsidian-refined-layer-openai",
      model: "gpt-test",
    });

    const response = await provider.generateProposal({
      workflowProfileId: "raw-refined",
      notePath: "note.md",
      noteTitle: "note",
      noteContent: "content",
      systemPrompt: "system",
      userPrompt: "user",
      promptVariables: {
        notePath: "note.md",
        noteTitle: "note",
        noteContent: "content",
      },
    });

    expect(response.usage).toMatchObject({
      countingMode: "actual",
      totalTokens: 33,
    });
  });

  it("redacts provider error messages", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      statusText: "Unauthorized",
      async json() {
        return {
          error: {
            message: "Authorization: Bearer sk-secret",
          },
        };
      },
    })) as any;

    const provider = new OpenAICompatibleProvider({
      secretStore: {
        isAvailable: () => true,
        getSecret: () => "sk-secret",
        setSecret: () => undefined,
      },
      secretRef: "obsidian-refined-layer-openai",
      model: "gpt-test",
    });

    await expect(provider.generateProposal({
      workflowProfileId: "raw-refined",
      notePath: "note.md",
      noteTitle: "note",
      noteContent: "content",
      systemPrompt: "system",
      userPrompt: "user",
      promptVariables: {
        notePath: "note.md",
        noteTitle: "note",
        noteContent: "content",
      },
    })).rejects.toThrow("[REDACTED]");
  });

  it("supports local openai-compatible endpoints without an api key header", async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: "{\"workflowProfileId\":\"raw-refined\",\"refinedSections\":{\"summary\":\"a\",\"coreQuestion\":\"b\",\"currentConclusion\":\"c\",\"reasoning\":\"d\"}}",
              },
            },
          ],
        };
      },
    }));
    globalThis.fetch = fetchSpy as any;

    const provider = new OpenAICompatibleProvider({
      providerId: "local-openai-compatible",
      secretStore: {
        isAvailable: () => true,
        getSecret: () => null,
        setSecret: () => undefined,
      },
      model: "qwen2.5:7b",
      baseUrl: "http://127.0.0.1:11434/v1",
      requiresApiKey: false,
    });

    await provider.generateProposal({
      workflowProfileId: "raw-refined",
      notePath: "note.md",
      noteTitle: "note",
      noteContent: "content",
      systemPrompt: "system",
      userPrompt: "user",
      promptVariables: {
        notePath: "note.md",
        noteTitle: "note",
        noteContent: "content",
      },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/v1/chat/completions",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });
});
