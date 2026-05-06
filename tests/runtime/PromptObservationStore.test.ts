import { describe, expect, it } from "vitest";

import { InMemoryPromptObservationStore } from "../../src/runtime/PromptObservationStore";

describe("InMemoryPromptObservationStore", () => {
  it("redacts prompt debug snapshots before keeping the latest copy", () => {
    const store = new InMemoryPromptObservationStore();

    store.save({
      updatedAt: "2026-05-06T00:00:00.000Z",
      provider: "mock-llm",
      model: "mock-gpt",
      requestSnapshot: {
        provider: "mock-llm",
        model: "mock-gpt",
        messages: [
          { role: "system", content: "system prompt" },
          { role: "user", content: "Authorization: Bearer sk-secret-value" },
        ],
        schemaName: "RawRefinedProposalV2",
        schemaVersion: "0.2",
        metadata: {
          workflowProfileId: "raw-refined",
          requestId: "req-1",
          aBlockIds: ["summary"],
          tagWhitelist: ["#ai/generated"],
          notePath: "10_Raw/example.md",
          noteTitle: "Example",
        },
      },
      responseSnapshot: {
        rawText: "raw response with sk-secret-value",
        parsedJson: { ok: true },
      },
      validationSnapshot: {
        zodResult: "success",
        normalizationReport: { status: "valid" },
      },
    });

    const serialized = JSON.stringify(store.getLatest());

    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("sk-secret-value");
    expect(serialized).not.toContain("Bearer");
  });
});
