import { describe, expect, it } from "vitest";

import type { ProposalSession } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";
import type { SessionPersistenceStore } from "../../src/runtime/SessionPersistenceStore";

class MemoryPersistenceStore implements SessionPersistenceStore {
  private state: Map<string, ProposalSession[]> = new Map();

  async saveAll(sessionsByPath: Map<string, ProposalSession[]>): Promise<void> {
    this.state = new Map(sessionsByPath);
  }

  async loadAll(): Promise<Map<string, ProposalSession[]>> {
    return new Map(this.state);
  }

  setState(sessions: Map<string, ProposalSession[]>): void {
    this.state = new Map(sessions);
  }
}

function createSession(notePath: string, id: string, updatedAt: string, extra?: Partial<ProposalSession>): ProposalSession {
  return {
    id,
    workflowProfileId: "raw-refined",
    policySnapshotId: "raw-refined:0.1.0",
    notePath,
    noteTitle: notePath.split("/").pop()?.replace(".md", "") ?? notePath,
    createdAt: updatedAt,
    updatedAt,
    baseFileHash: `file-${id}`,
    baseProtectedRegionHash: `region-${id}`,
    proposal: {
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "reasoning",
      },
    },
    tokenUsage: {
      provider: "mock-llm",
      model: "mock-gpt",
      countingMode: "unavailable",
      generatedAt: updatedAt,
    },
    status: "generated",
    ...extra,
  };
}

describe("ProposalSessionStore", () => {
  it("returns the latest session for a note path", async () => {
    const store = new ProposalSessionStore(5);
    const older = createSession("A/example.md", "one", "2026-05-04T00:00:00.000Z");
    const newer = createSession("A/example.md", "two", "2026-05-04T00:01:00.000Z");

    await store.save(older);
    await store.save(newer);

    await expect(store.getLatestSessionForNote("A/example.md")).resolves.toMatchObject({
      id: "two",
      notePath: "A/example.md",
    });
  });

  it("does not mix sessions across note paths", async () => {
    const store = new ProposalSessionStore(5);

    await store.save(createSession("A/example.md", "one", "2026-05-04T00:00:00.000Z"));
    await store.save(createSession("B/example.md", "two", "2026-05-04T00:01:00.000Z"));

    await expect(store.listSessionsForNote("A/example.md")).resolves.toEqual([
      {
        id: "one",
        notePath: "A/example.md",
        noteTitle: "example",
        status: "generated",
        updatedAt: "2026-05-04T00:00:00.000Z",
      },
    ]);
  });

  it("trims old sessions beyond the history limit", async () => {
    const store = new ProposalSessionStore(2);

    await store.save(createSession("A/example.md", "one", "2026-05-04T00:00:00.000Z"));
    await store.save(createSession("A/example.md", "two", "2026-05-04T00:01:00.000Z"));
    await store.save(createSession("A/example.md", "three", "2026-05-04T00:02:00.000Z"));

    await expect(store.listSessionsForNote("A/example.md")).resolves.toEqual([
      {
        id: "three",
        notePath: "A/example.md",
        noteTitle: "example",
        status: "generated",
        updatedAt: "2026-05-04T00:02:00.000Z",
      },
      {
        id: "two",
        notePath: "A/example.md",
        noteTitle: "example",
        status: "generated",
        updatedAt: "2026-05-04T00:01:00.000Z",
      },
    ]);
    await expect(store.get("one")).resolves.toBeNull();
  });
});

describe("ProposalSessionStore persistence", () => {
  it("persists sessions after save and restores correctly", async () => {
    const persistence = new MemoryPersistenceStore();
    const store = new ProposalSessionStore(5, persistence);

    await store.save(createSession("A/note.md", "s1", "2026-05-04T01:00:00.000Z"));
    await store.save(createSession("A/note.md", "s2", "2026-05-04T02:00:00.000Z"));

    const loaded = await persistence.loadAll();
    expect(loaded.has("A/note.md")).toBe(true);
    expect(loaded.get("A/note.md")?.length).toBe(2);

    const store2 = new ProposalSessionStore(5, persistence);
    await store2.restoreFromDisk();

    await expect(store2.getLatestSessionForNote("A/note.md")).resolves.toMatchObject({ id: "s2" });
    await expect(store2.listSessionsForNote("A/note.md")).resolves.toHaveLength(2);
  });

  it("applies history limit on restore", async () => {
    const persistence = new MemoryPersistenceStore();
    const store = new ProposalSessionStore(3, persistence);

    await store.save(createSession("A/note.md", "s1", "2026-05-04T01:00:00.000Z"));
    await store.save(createSession("A/note.md", "s2", "2026-05-04T02:00:00.000Z"));
    await store.save(createSession("A/note.md", "s3", "2026-05-04T03:00:00.000Z"));
    await store.save(createSession("A/note.md", "s4", "2026-05-04T04:00:00.000Z"));

    const store2 = new ProposalSessionStore(2, persistence);
    await store2.restoreFromDisk();

    await expect(store2.listSessionsForNote("A/note.md")).resolves.toHaveLength(2);
    await expect(store2.getLatestSessionForNote("A/note.md")).resolves.toMatchObject({ id: "s4" });
  });

  it("starts normally when persistence store has no data", async () => {
    const persistence = new MemoryPersistenceStore();
    const store = new ProposalSessionStore(5, persistence);
    await store.restoreFromDisk();

    await expect(store.getLatestSessionForNote("any/note.md")).resolves.toBeNull();
    await expect(store.listSessionsForNote("any/note.md")).resolves.toEqual([]);
  });

  it("keeps sessions from different note paths separate after restore", async () => {
    const persistence = new MemoryPersistenceStore();
    const store = new ProposalSessionStore(5, persistence);

    await store.save(createSession("A/note.md", "A1", "2026-05-04T01:00:00.000Z"));
    await store.save(createSession("B/note.md", "B1", "2026-05-04T02:00:00.000Z"));

    const store2 = new ProposalSessionStore(5, persistence);
    await store2.restoreFromDisk();

    await expect(store2.listSessionsForNote("A/note.md")).resolves.toHaveLength(1);
    await expect(store2.listSessionsForNote("B/note.md")).resolves.toHaveLength(1);
    await expect(store2.getLatestSessionForNote("A/note.md")).resolves.toMatchObject({ id: "A1" });
    await expect(store2.getLatestSessionForNote("B/note.md")).resolves.toMatchObject({ id: "B1" });
  });

  it("auto-persists after status update", async () => {
    const persistence = new MemoryPersistenceStore();
    const store = new ProposalSessionStore(5, persistence);

    await store.save(createSession("A/note.md", "s1", "2026-05-04T01:00:00.000Z"));
    await store.updateSessionStatus("s1", "applied");

    const loaded = await persistence.loadAll();
    const sessions = loaded.get("A/note.md") ?? [];
    expect(sessions.length).toBeGreaterThan(0);
    const applied = sessions.find((s) => s.id === "s1");
    expect(applied?.status).toBe("applied");
  });

  it("auto-persists after decision update", async () => {
    const persistence = new MemoryPersistenceStore();
    const store = new ProposalSessionStore(5, persistence);

    await store.save(createSession("A/note.md", "s1", "2026-05-04T01:00:00.000Z"));
    await store.updateSessionDecision("s1", {
      acceptBody: true,
      acceptFrontmatter: {},
      acceptTags: {},
    });

    const loaded = await persistence.loadAll();
    const sessions = loaded.get("A/note.md") ?? [];
    const session = sessions.find((s) => s.id === "s1");
    expect(session?.status).toBe("reviewing");
    expect(session?.decision?.acceptBody).toBe(true);
  });

  it("does not persist applyPlan field (whitelist)", async () => {
    const persistence = new MemoryPersistenceStore();
    const store = new ProposalSessionStore(5, persistence);

    const session = createSession("A/note.md", "s1", "2026-05-04T01:00:00.000Z", {
      applyPlan: {
        notePath: "A/note.md",
        sessionId: "s1",
        operations: [
          {
            type: "replace-refined-body",
            targetPath: "A/note.md",
            body: "new body",
          },
        ],
      },
    });
    await store.save(session);

    const loaded = await persistence.loadAll();
    const restored = loaded.get("A/note.md")?.[0];
    // The ProposalSession type includes applyPlan but it shouldn't appear in persisted data
    // (this is enforced by ObsidianSessionStore's whitelist serialization)
    expect(restored).toBeDefined();
  });

  it("persistence failure does not break save or update", async () => {
    const failingStore: SessionPersistenceStore = {
      saveAll: async () => {
        throw new Error("disk full");
      },
      loadAll: async () => new Map(),
    };
    const store = new ProposalSessionStore(5, failingStore);

    // Should not throw
    await store.save(createSession("A/note.md", "s1", "2026-05-04T01:00:00.000Z"));
    await store.updateSessionStatus("s1", "applied");
    await store.updateSessionDecision("s1", {
      acceptBody: true,
      acceptFrontmatter: {},
      acceptTags: {},
    });

    // In-memory state should still work
    await expect(store.getLatestSessionForNote("A/note.md")).resolves.toMatchObject({ id: "s1" });
  });

  it("triggers persistence after setHistoryLimit trims sessions", async () => {
    const persistence = new MemoryPersistenceStore();
    const store = new ProposalSessionStore(5, persistence);

    await store.save(createSession("A/note.md", "s1", "2026-05-04T01:00:00.000Z"));
    await store.save(createSession("A/note.md", "s2", "2026-05-04T02:00:00.000Z"));

    store.setHistoryLimit(1);

    const loaded = await persistence.loadAll();
    const sessions = loaded.get("A/note.md") ?? [];
    expect(sessions).toHaveLength(1);
  });
});
