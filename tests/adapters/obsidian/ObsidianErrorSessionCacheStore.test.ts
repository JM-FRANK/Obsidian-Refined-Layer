import { describe, expect, it } from "vitest";

import type { FailedAttemptRecord } from "../../../src/runtime/ProposalSession";
import type { ErrorSessionCacheStore } from "../../../src/runtime/ErrorSessionCacheStore";
import { containsSecretPattern } from "../../../src/adapters/obsidian/ObsidianErrorSessionCacheStore";

// ── In-memory adapter for interface contract testing ──

class InMemoryErrorSessionCacheStore implements ErrorSessionCacheStore {
  private attempts: FailedAttemptRecord[] = [];
  readonly limit: number;

  constructor(limit = 30) {
    this.limit = limit;
  }

  async save(attempt: FailedAttemptRecord): Promise<void> {
    this.attempts.unshift(attempt);
    this.attempts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (this.attempts.length > this.limit) {
      this.attempts = this.attempts.slice(this.attempts.length - this.limit);
    }
  }

  async loadAll(): Promise<FailedAttemptRecord[]> {
    return [...this.attempts];
  }

  async getCount(): Promise<number> {
    return this.attempts.length;
  }
}

// ── Helpers ──

function makeAttempt(overrides: Partial<FailedAttemptRecord> = {}): FailedAttemptRecord {
  const idx = overrides.attemptIndex ?? 1;
  return {
    id: overrides.id ?? `fa-${idx}`,
    errorSessionId: overrides.errorSessionId ?? `es-${idx}`,
    attemptIndex: idx as 1 | 2 | 3,
    createdAt: overrides.createdAt ?? `2026-05-06T0${idx}:00:00.000Z`,
    provider: overrides.provider ?? "mock-llm",
    model: overrides.model ?? "mock-gpt",
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    notePath: overrides.notePath ?? "A/note.md",
    noteTitle: overrides.noteTitle ?? "Test",
    blockConfigSnapshot: overrides.blockConfigSnapshot ?? {
      protectH1: true,
      aBlocks: [],
      bBlock: { id: "original-content", name: "原始内容", heading: "原始内容", headingLevel: 2, required: true },
      tagWhitelist: [],
    },
    requestSnapshot: overrides.requestSnapshot ?? {
      messages: [{ role: "system" as const, content: "system" }],
      schemaName: "RawRefinedProposalV2",
      schemaVersion: "0.2",
      metadata: {},
    },
    responseSnapshot: overrides.responseSnapshot,
    validationSnapshot: overrides.validationSnapshot,
    errorSummary: overrides.errorSummary ?? "Mock error.",
  };
}

describe("ErrorSessionCacheStore (in-memory)", () => {
  it("saves and loads a single attempt", async () => {
    const store = new InMemoryErrorSessionCacheStore();
    const attempt = makeAttempt({ id: "fa-1", attemptIndex: 1 });

    await store.save(attempt);
    const all = await store.loadAll();

    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("fa-1");
    expect(await store.getCount()).toBe(1);
  });

  it("preserves full attempt snapshot data", async () => {
    const store = new InMemoryErrorSessionCacheStore();
    const attempt = makeAttempt({
      id: "fa-1",
      attemptIndex: 1,
      responseSnapshot: {
        rawText: "raw response text",
        parsedJson: { foo: "bar" },
      },
      validationSnapshot: {
        zodError: { issues: [] },
        normalizationReport: { status: "partial" },
      },
    });

    await store.save(attempt);
    const all = await store.loadAll();

    expect(all[0].responseSnapshot?.rawText).toBe("raw response text");
    expect(all[0].responseSnapshot?.parsedJson).toEqual({ foo: "bar" });
    expect(all[0].validationSnapshot?.zodError).toBeDefined();
  });

  it("trims oldest attempts when limit is exceeded", async () => {
    const store = new InMemoryErrorSessionCacheStore(3);

    for (let i = 1; i <= 5; i++) {
      await store.save(makeAttempt({
        id: `fa-${i}`,
        attemptIndex: 1,
        createdAt: `2026-05-0${i}T00:00:00.000Z`,
      }));
    }

    const all = await store.loadAll();
    expect(all).toHaveLength(3);
    // Oldest (fa-1, fa-2) should be gone
    const ids = all.map((a) => a.id);
    expect(ids).not.toContain("fa-1");
    expect(ids).not.toContain("fa-2");
    expect(ids).toContain("fa-3");
    expect(ids).toContain("fa-4");
    expect(ids).toContain("fa-5");
  });

  it("saves multiple attempts from different error sessions", async () => {
    const store = new InMemoryErrorSessionCacheStore();

    await store.save(makeAttempt({ id: "fa-1", errorSessionId: "es-a", attemptIndex: 1, createdAt: "2026-05-01T00:00:00.000Z" }));
    await store.save(makeAttempt({ id: "fa-2", errorSessionId: "es-a", attemptIndex: 2, createdAt: "2026-05-02T00:00:00.000Z" }));
    await store.save(makeAttempt({ id: "fa-3", errorSessionId: "es-b", attemptIndex: 1, createdAt: "2026-05-03T00:00:00.000Z" }));

    const all = await store.loadAll();
    expect(all).toHaveLength(3);
    expect(all.map((a) => a.id)).toEqual(["fa-1", "fa-2", "fa-3"]);
  });

  it("returns empty array when no attempts saved", async () => {
    const store = new InMemoryErrorSessionCacheStore();
    expect(await store.loadAll()).toEqual([]);
    expect(await store.getCount()).toBe(0);
  });
});

describe("containsSecretPattern (error cache)", () => {
  it("blocks payload containing apiKey field", () => {
    const json = JSON.stringify({
      attempts: [{
        id: "fa-1",
        apiKey: "sk-secret-123",
      }],
    });
    expect(containsSecretPattern(json)).toBe(true);
  });

  it("blocks payload containing authorization field", () => {
    const json = JSON.stringify({
      attempts: [{
        id: "fa-1",
        authorization: "Bearer token",
      }],
    });
    expect(containsSecretPattern(json)).toBe(true);
  });

  it("blocks payload containing secret field nested in responseSnapshot", () => {
    const json = JSON.stringify({
      attempts: [{
        id: "fa-1",
        responseSnapshot: {
          secret: "hidden-key",
        },
      }],
    });
    expect(containsSecretPattern(json)).toBe(true);
  });

  it("allows payload without secret keywords", () => {
    const json = JSON.stringify({
      attempts: [{
        id: "fa-1",
        notePath: "A/note.md",
        requestSnapshot: {
          messages: [{ role: "system", content: "system prompt" }],
        },
        errorSummary: "Zod validation failed",
      }],
    });
    expect(containsSecretPattern(json)).toBe(false);
  });

  it("allows token usage fields (safe keys)", () => {
    const json = JSON.stringify({
      attempts: [{
        id: "fa-1",
        responseSnapshot: {
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
            countingMode: "actual",
          },
        },
      }],
    });
    expect(containsSecretPattern(json)).toBe(false);
  });
});
