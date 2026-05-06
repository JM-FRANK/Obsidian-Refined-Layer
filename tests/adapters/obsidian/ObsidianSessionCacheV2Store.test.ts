import { describe, expect, it } from "vitest";

import {
  containsSecretPattern,
  LEGACY_SESSION_FILE_PATH,
  ObsidianSessionCacheV2Store,
  SESSION_CACHE_PATH,
  SESSION_FILE_PATH,
} from "../../../src/adapters/obsidian/ObsidianSessionCacheV2Store";
import type { ProposalSessionV2 } from "../../../src/runtime/ProposalSession";

class MemoryVaultAdapter {
  files = new Map<string, string>();
  directories = new Set<string>();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  async mkdir(path: string): Promise<void> {
    this.directories.add(path);
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async read(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error("File not found");
    return content;
  }
}

function makePlugin(adapter: MemoryVaultAdapter) {
  return {
    app: {
      vault: { adapter },
    },
  } as never;
}

function makeSession(overrides: Partial<ProposalSessionV2> = {}): ProposalSessionV2 {
  return {
    id: "session-1",
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    createdAt: "2026-05-06T00:00:00.000Z",
    updatedAt: "2026-05-06T00:00:00.000Z",
    notePath: "10_Raw/example.md",
    noteTitle: "example",
    baseFileHash: "file-hash",
    baseBBlockHash: "b-hash",
    blockConfigSnapshot: {
      protectH1: true,
      aBlocks: [],
      bBlock: { id: "original-content", name: "原始内容", heading: "原始内容", headingLevel: 2, required: true },
      tagWhitelist: ["#ai/generated"],
    },
    proposal: {
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [
        { id: "summary", content: "Summary." },
      ],
    },
    validation: {
      status: "valid",
      acceptedFields: ["blocks.summary"],
      rejectedFields: [],
      warnings: [],
      tagNormalizationApplied: false,
    },
    tokenUsage: {
      provider: "mock",
      model: "mock",
      countingMode: "unavailable",
      generatedAt: "2026-05-06T00:00:00.000Z",
    },
    status: "generated",
    source: {
      provider: "mock",
      model: "mock",
      attemptsUsed: 1,
    },
    ...overrides,
  };
}

describe("ObsidianSessionCacheV2Store redaction", () => {
  it("redacts secret-like string values before writing session-cache", async () => {
    const adapter = new MemoryVaultAdapter();
    const store = new ObsidianSessionCacheV2Store(makePlugin(adapter), 5);

    await store.save(makeSession({
      proposal: {
        workflowProfileId: "raw-refined",
        schemaVersion: "0.2",
        blocks: [
          { id: "summary", content: "Summary has Authorization: Bearer sk-body-secret" },
        ],
        tagSuggestion: {
          selectedTags: ["#ai/generated"],
          newTagSuggestions: ["#topic/sk-tag-secret"],
        },
      },
      validation: {
        status: "partial",
        acceptedFields: ["blocks.summary"],
        rejectedFields: [
          { field: "tagSuggestion.selectedTags", reason: "Moved sk-validation-secret to suggestions.", value: "sk-value-secret" },
        ],
        warnings: ["warning mentions Bearer sk-warning-secret"],
        tagNormalizationApplied: true,
      },
    }));

    const written = adapter.files.get(SESSION_FILE_PATH);
    expect(written).toBeDefined();
    expect(written).not.toContain("sk-body-secret");
    expect(written).not.toContain("sk-tag-secret");
    expect(written).not.toContain("sk-validation-secret");
    expect(written).not.toContain("sk-value-secret");
    expect(written).not.toContain("sk-warning-secret");
    expect(written).toContain("[REDACTED]");
  });
});

describe("ObsidianSessionCacheV2Store persistence and compatibility", () => {
  it("saves and restores ProposalSessionV2 records", async () => {
    const adapter = new MemoryVaultAdapter();
    const store = new ObsidianSessionCacheV2Store(makePlugin(adapter), 5);

    await store.save(makeSession({
      id: "session-a",
      notePath: "10_Raw/a.md",
      noteTitle: "A",
    }));

    const all = await store.loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("session-a");
    expect(all[0].schemaVersion).toBe("0.2");
    expect(all[0].proposal.blocks[0].id).toBe("summary");
  });

  it("ignores legacy sessions.v1.json when v2 cache is absent", async () => {
    const adapter = new MemoryVaultAdapter();
    adapter.directories.add(SESSION_CACHE_PATH);
    adapter.files.set(LEGACY_SESSION_FILE_PATH, JSON.stringify({
      version: 1,
      sessionsByNotePath: {
        "legacy.md": [{ id: "legacy-session" }],
      },
    }));
    const store = new ObsidianSessionCacheV2Store(makePlugin(adapter), 5);

    await expect(store.loadAll()).resolves.toEqual([]);
  });

  it("trims oldest sessions when the limit is exceeded", async () => {
    const adapter = new MemoryVaultAdapter();
    const store = new ObsidianSessionCacheV2Store(makePlugin(adapter), 2);

    await store.save(makeSession({ id: "session-1", notePath: "n1.md", updatedAt: "2026-05-01T00:00:00.000Z" }));
    await store.save(makeSession({ id: "session-2", notePath: "n2.md", updatedAt: "2026-05-02T00:00:00.000Z" }));
    await store.save(makeSession({ id: "session-3", notePath: "n3.md", updatedAt: "2026-05-03T00:00:00.000Z" }));

    const ids = (await store.loadAll()).map((session) => session.id);
    expect(ids).toEqual(["session-3", "session-2"]);
  });

  it("setSessionCacheLimit cleans old persisted sessions", async () => {
    const adapter = new MemoryVaultAdapter();
    const store = new ObsidianSessionCacheV2Store(makePlugin(adapter), 5);

    await store.save(makeSession({ id: "session-1", notePath: "n1.md", updatedAt: "2026-05-01T00:00:00.000Z" }));
    await store.save(makeSession({ id: "session-2", notePath: "n2.md", updatedAt: "2026-05-02T00:00:00.000Z" }));
    await store.save(makeSession({ id: "session-3", notePath: "n3.md", updatedAt: "2026-05-03T00:00:00.000Z" }));

    await store.setSessionCacheLimit(1);

    const ids = (await store.loadAll()).map((session) => session.id);
    expect(ids).toEqual(["session-3"]);
    expect(store.getCacheInfo().limit).toBe(1);
  });

  it("exposes cache location and legacy compatibility strategy for Settings UI", () => {
    const adapter = new MemoryVaultAdapter();
    const store = new ObsidianSessionCacheV2Store(makePlugin(adapter), 5);

    expect(store.getCacheInfo()).toEqual({
      cachePath: SESSION_CACHE_PATH,
      filePath: SESSION_FILE_PATH,
      legacyFilePath: LEGACY_SESSION_FILE_PATH,
      compatibilityStrategy: "ignore-v1",
      limit: 5,
    });
  });
});

describe("containsSecretPattern (session cache v2)", () => {
  it("blocks payload containing sensitive key names", () => {
    expect(containsSecretPattern(JSON.stringify({
      version: 2,
      sessions: [{ id: "s1", authorization: "Bearer token" }],
    }))).toBe(true);
  });

  it("allows token usage fields", () => {
    expect(containsSecretPattern(JSON.stringify({
      version: 2,
      sessions: [{
        id: "s1",
        tokenUsage: {
          inputTokens: 1,
          outputTokens: 2,
          totalTokens: 3,
          countingMode: "actual",
        },
      }],
    }))).toBe(false);
  });
});
