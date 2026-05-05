import { describe, expect, it, vi } from "vitest";

import {
  RetryAttemptRunner,
  type SingleAttemptResult,
  type AttemptIndex,
} from "../../src/application/RetryAttemptRunner";
import type { FailedAttemptRecord, ProposalSessionV2 } from "../../src/runtime/ProposalSession";

function makeSession(id = "s1"): ProposalSessionV2 {
  return {
    id,
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    createdAt: "2026-05-06T00:00:00.000Z",
    updatedAt: "2026-05-06T00:00:00.000Z",
    notePath: "A/note.md",
    noteTitle: "Test",
    baseFileHash: "aaa",
    baseBBlockHash: "bbb",
    blockConfigSnapshot: {
      protectH1: true,
      aBlocks: [],
      bBlock: { id: "original-content", name: "原始内容", heading: "原始内容", headingLevel: 2, required: true },
      tagWhitelist: [],
    },
    proposal: {
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [{ id: "summary", content: "OK." }],
    },
    validation: {
      status: "valid",
      acceptedFields: ["summary"],
      rejectedFields: [],
      warnings: [],
      tagNormalizationApplied: false,
    },
    status: "generated",
    source: { provider: "mock", model: "mock", attemptsUsed: 1 },
  };
}

function makeFailedAttempt(attemptIndex: AttemptIndex): FailedAttemptRecord {
  return {
    id: `fa-${attemptIndex}`,
    errorSessionId: `es-${attemptIndex}`,
    attemptIndex,
    createdAt: `2026-05-06T0${attemptIndex}:00:00.000Z`,
    provider: "mock-llm",
    model: "mock-gpt",
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    notePath: "A/note.md",
    noteTitle: "Test",
    blockConfigSnapshot: {
      protectH1: true,
      aBlocks: [],
      bBlock: { id: "original-content", name: "原始内容", heading: "原始内容", headingLevel: 2, required: true },
      tagWhitelist: [],
    },
    requestSnapshot: {
      messages: [{ role: "system", content: "system" }],
      schemaName: "RawRefinedProposalV2",
      schemaVersion: "0.2",
      metadata: {},
    },
    errorSummary: `Mock error on attempt ${attemptIndex}`,
  };
}

describe("RetryAttemptRunner", () => {
  const runner = new RetryAttemptRunner();

  it("returns success with attemptsUsed=1 when first attempt succeeds", async () => {
    const session = makeSession();
    const runAttempt = vi.fn(async (_i: AttemptIndex): Promise<SingleAttemptResult> => ({
      success: true,
      session,
    }));

    const result = await runner.run(runAttempt);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.attemptsUsed).toBe(1);
    expect(result.failedAttempts).toHaveLength(0);
    expect(result.session.id).toBe("s1");
    expect(runAttempt).toHaveBeenCalledTimes(1);
  });

  it("returns success with attemptsUsed=2 when second attempt succeeds", async () => {
    const session = makeSession("s2");
    const fail1 = makeFailedAttempt(1);

    let callCount = 0;
    const runAttempt = vi.fn(async (_i: AttemptIndex): Promise<SingleAttemptResult> => {
      callCount++;
      if (callCount === 1) return { success: false, attempt: fail1 };
      return { success: true, session };
    });

    const result = await runner.run(runAttempt);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.attemptsUsed).toBe(2);
    expect(result.session.id).toBe("s2");
    expect(result.failedAttempts).toHaveLength(1);
    expect(result.failedAttempts[0].id).toBe("fa-1");
    expect(runAttempt).toHaveBeenCalledTimes(2);
    // Context passed to attempt 2 was 2
    expect(runAttempt).toHaveBeenLastCalledWith(2);
  });

  it("returns success with attemptsUsed=3 when third attempt succeeds", async () => {
    const session = makeSession("s3");
    const fail1 = makeFailedAttempt(1);
    const fail2 = makeFailedAttempt(2);

    let callCount = 0;
    const runAttempt = vi.fn(async (_i: AttemptIndex): Promise<SingleAttemptResult> => {
      callCount++;
      if (callCount === 1) return { success: false, attempt: fail1 };
      if (callCount === 2) return { success: false, attempt: fail2 };
      return { success: true, session };
    });

    const result = await runner.run(runAttempt);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.attemptsUsed).toBe(3);
    expect(result.session.id).toBe("s3");
    expect(result.failedAttempts).toHaveLength(2);
    expect(result.failedAttempts[0].attemptIndex).toBe(1);
    expect(result.failedAttempts[1].attemptIndex).toBe(2);
    expect(runAttempt).toHaveBeenCalledTimes(3);
  });

  it("returns exhausted when all 3 attempts fail", async () => {
    const fail1 = makeFailedAttempt(1);
    const fail2 = makeFailedAttempt(2);
    const fail3 = makeFailedAttempt(3);

    let callCount = 0;
    const runAttempt = vi.fn(async (_i: AttemptIndex): Promise<SingleAttemptResult> => {
      callCount++;
      if (callCount === 1) return { success: false, attempt: fail1 };
      if (callCount === 2) return { success: false, attempt: fail2 };
      return { success: false, attempt: fail3 };
    });

    const result = await runner.run(runAttempt);

    expect(result.status).toBe("exhausted");
    if (result.status !== "exhausted") return;
    expect(result.failedAttempts).toHaveLength(3);
    expect(result.failedAttempts[0].attemptIndex).toBe(1);
    expect(result.failedAttempts[1].attemptIndex).toBe(2);
    expect(result.failedAttempts[2].attemptIndex).toBe(3);
    expect(runAttempt).toHaveBeenCalledTimes(3);
  });

  it("stops retrying after success even if more attempts are available", async () => {
    const session = makeSession();
    const fail1 = makeFailedAttempt(1);

    let callCount = 0;
    const runAttempt = vi.fn(async (_i: AttemptIndex): Promise<SingleAttemptResult> => {
      callCount++;
      if (callCount === 1) return { success: false, attempt: fail1 };
      return { success: true, session };
    });

    const result = await runner.run(runAttempt);

    expect(result.status).toBe("success");
    expect(runAttempt).toHaveBeenCalledTimes(2);
  });

  it("respects custom maxAttempts (e.g., 1 → fired immediately on first fail)", async () => {
    const shortRunner = new RetryAttemptRunner(1);
    const fail1 = makeFailedAttempt(1);

    const runAttempt = vi.fn(async (_i: AttemptIndex): Promise<SingleAttemptResult> => ({
      success: false,
      attempt: fail1,
    }));

    const result = await shortRunner.run(runAttempt);

    expect(result.status).toBe("exhausted");
    if (result.status !== "exhausted") return;
    expect(result.failedAttempts).toHaveLength(1);
    expect(runAttempt).toHaveBeenCalledTimes(1);
  });
});
