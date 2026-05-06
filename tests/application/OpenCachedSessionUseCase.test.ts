import { describe, expect, it } from "vitest";

import { OpenCachedSessionUseCase } from "../../src/application/OpenCachedSessionUseCase";
import type { ProposalSessionV2 } from "../../src/runtime/ProposalSession";
import type { SessionCacheV2Store } from "../../src/runtime/SessionCacheV2Store";

function createSession(id: string, updatedAt: string): ProposalSessionV2 {
  return {
    id,
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    createdAt: updatedAt,
    updatedAt,
    notePath: `10_Raw/${id}.md`,
    noteTitle: id,
    baseFileHash: "file",
    baseBBlockHash: "b",
    blockConfigSnapshot: {
      protectH1: true,
      aBlocks: [],
      bBlock: { id: "original-content", name: "原始内容", heading: "原始内容", headingLevel: 2, required: true },
      tagWhitelist: [],
    },
    proposal: {
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [],
    },
    validation: {
      status: "valid",
      acceptedFields: [],
      rejectedFields: [],
      warnings: [],
      tagNormalizationApplied: false,
    },
    tokenUsage: {
      provider: "mock",
      model: "mock",
      countingMode: "unavailable",
      generatedAt: updatedAt,
    },
    status: "generated",
    source: {
      provider: "mock",
      model: "mock",
      attemptsUsed: 2,
    },
  };
}

function createStore(sessions: ProposalSessionV2[]): SessionCacheV2Store {
  return {
    async save() {
      throw new Error("not used");
    },
    async loadAll() {
      return sessions;
    },
    async getLatestForNote() {
      return sessions[0] ?? null;
    },
  };
}

describe("OpenCachedSessionUseCase", () => {
  it("lists cached sessions sorted by updatedAt descending", async () => {
    const newer = createSession("newer", "2026-05-06T02:00:00.000Z");
    const older = createSession("older", "2026-05-06T01:00:00.000Z");
    const useCase = new OpenCachedSessionUseCase(createStore([older, newer]));

    await expect(useCase.list()).resolves.toMatchObject([
      {
        id: "newer",
        provider: "mock",
        model: "mock",
        attemptsUsed: 2,
      },
      { id: "older" },
    ]);
  });

  it("opens a cached session by id", async () => {
    const session = createSession("session-a", "2026-05-06T01:00:00.000Z");
    const useCase = new OpenCachedSessionUseCase(createStore([session]));

    await expect(useCase.open("session-a")).resolves.toBe(session);
    await expect(useCase.open("missing")).resolves.toBeNull();
  });
});
