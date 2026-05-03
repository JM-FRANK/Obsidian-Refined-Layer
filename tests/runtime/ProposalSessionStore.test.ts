import { describe, expect, it } from "vitest";

import type { ProposalSession } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";

function createSession(notePath: string, id: string, updatedAt: string): ProposalSession {
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
