import { describe, expect, it, vi } from "vitest";

import type { LlmProvider, LlmResponse } from "../../src/adapters/llm/LlmProvider";
import type { LlmRequestV2 } from "../../src/core/prompt/PromptDebugSnapshot";
import { resolveRefineProfile } from "../../src/core/profile/RefineProfile";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
import type { ErrorSessionCacheStore } from "../../src/runtime/ErrorSessionCacheStore";
import type { FailedAttemptRecord, ProposalSessionV2 } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";
import type { SessionCacheV2Store } from "../../src/runtime/SessionCacheV2Store";
import { DEFAULT_PLUGIN_SETTINGS } from "../../src/settings/PluginSettings";
import type { ActiveNoteRepository } from "../../src/application/CheckEligibilityUseCase";
import { CreateProposalUseCase } from "../../src/application/CreateProposalUseCase";

const defaultSettings = resolveRefineProfile(DEFAULT_PLUGIN_SETTINGS.rawRefined);

const mockV2Settings = {
  ...defaultSettings,
  aBlocks: defaultSettings.aBlocks.filter((b) =>
    ["summary", "coreQuestion", "currentConclusion", "reasoning"].includes(b.id),
  ),
};

const noteContent = "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello world";

// ── In-memory test doubles ──

function createInMemoryErrorCache(): ErrorSessionCacheStore & { saved: FailedAttemptRecord[] } {
  const saved: FailedAttemptRecord[] = [];
  return {
    saved,
    async save(attempt: FailedAttemptRecord) {
      saved.push(attempt);
    },
    async loadAll() {
      return [...saved];
    },
    async getCount() {
      return saved.length;
    },
  };
}

function createInMemorySessionCacheV2(): SessionCacheV2Store & { saved: ProposalSessionV2[] } {
  const saved: ProposalSessionV2[] = [];
  return {
    saved,
    async save(session: ProposalSessionV2) {
      saved.push(session);
    },
    async loadAll() {
      return [...saved];
    },
    async getLatestForNote(notePath: string) {
      const forNote = saved.filter((s) => s.notePath === notePath);
      forNote.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return forNote[0] ?? null;
    },
  };
}

function createMarkdownRepository(content: string, path = "10_Raw/example.md"): ActiveNoteRepository {
  return {
    async getActiveNote() {
      return {
        kind: "markdown" as const,
        note: { path, title: "example", content },
      };
    },
  };
}

// Provider factory: succeeds on attempt N
function providerThatSucceedsOn(
  succeedOnIndex: number,
): { provider: LlmProvider; callCount: { count: number } } {
  const callCount = { count: 0 };
  const provider: LlmProvider = {
    providerId: "mock-llm",
    model: "mock-gpt",
    generateProposal: vi.fn(),
    async generateProposalV2(_request: LlmRequestV2): Promise<LlmResponse> {
      callCount.count++;
      if (callCount.count < succeedOnIndex) {
        throw new Error("Simulated provider failure attempt " + callCount.count);
      }
      return {
        rawText: JSON.stringify({
          workflowProfileId: "raw-refined",
          schemaVersion: "0.2",
          blocks: [
            { id: "summary", content: "Summary on attempt " + callCount.count + "." },
            { id: "coreQuestion", content: "Core question." },
            { id: "currentConclusion", content: "Conclusion." },
            { id: "reasoning", content: "Reasoning." },
          ],
        }),
        usage: {
          provider: "mock-llm", model: "mock-gpt",
          totalTokens: 200, countingMode: "actual" as const,
          generatedAt: new Date().toISOString(),
        },
      };
    },
  };
  return { provider, callCount };
}

// ── Tests ──

describe("CreateProposalUseCase retry (D50)", () => {
  // ── Scenario 1: 第 1 次成功 ──

  it("attempt 1 success: saves session to session-cache, no error-cache writes, noticePlan correct", async () => {
    const repository = createMarkdownRepository(noteContent);
    const { provider } = providerThatSucceedsOn(1);
    const store = new ProposalSessionStore(5);
    const errorCache = createInMemoryErrorCache();
    const sessionCache = createInMemorySessionCacheV2();

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
      undefined,
      errorCache,
      sessionCache,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    // Session saved to session-cache
    expect(sessionCache.saved).toHaveLength(1);
    expect(sessionCache.saved[0].id).toBe(result.session.id);
    expect(result.session.source.attemptsUsed).toBe(1);

    // No error cache writes
    expect(errorCache.saved).toHaveLength(0);

    // Notice plan
    expect(result.noticePlan.attemptsUsed).toBe(1);
    expect(result.noticePlan.maxAttempts).toBe(3);
    expect(result.noticePlan.errorCacheWritten).toBe(false);
    expect(result.noticePlan.errorCacheDisabled).toBe(false);
  });

  it("attempt 1 success without injected caches: still returns created-v2 with sensible noticePlan", async () => {
    const repository = createMarkdownRepository(noteContent);
    const { provider } = providerThatSucceedsOn(1);
    const store = new ProposalSessionStore(5);

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    // noticePlan reflects no caches available
    expect(result.noticePlan.errorCacheDisabled).toBe(true);
    expect(result.noticePlan.errorCacheWritten).toBe(false);
    expect(result.noticePlan.attemptsUsed).toBe(1);
  });

  // ── Scenario 2: 第 2 次成功 ──

  it("attempt 2 success: saves 1 failed attempt to error-cache, session to session-cache", async () => {
    const repository = createMarkdownRepository(noteContent);
    const { provider, callCount } = providerThatSucceedsOn(2);
    const store = new ProposalSessionStore(5);
    const errorCache = createInMemoryErrorCache();
    const sessionCache = createInMemorySessionCacheV2();

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
      undefined,
      errorCache,
      sessionCache,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    expect(callCount.count).toBe(2);

    // Session saved
    expect(sessionCache.saved).toHaveLength(1);
    expect(result.session.source.attemptsUsed).toBe(2);

    // 1 failed attempt saved to error cache
    expect(errorCache.saved).toHaveLength(1);
    expect(errorCache.saved[0].attemptIndex).toBe(1);
    expect(errorCache.saved[0].errorSummary).toContain("Provider call failed");

    // Notice plan
    expect(result.noticePlan.attemptsUsed).toBe(2);
    expect(result.noticePlan.errorCacheWritten).toBe(true);
    expect(result.noticePlan.errorCacheDisabled).toBe(false);
  });

  // ── Scenario 3: 第 3 次成功 ──

  it("attempt 3 success: saves 2 failed attempts to error-cache, session to session-cache", async () => {
    const repository = createMarkdownRepository(noteContent);
    const { provider, callCount } = providerThatSucceedsOn(3);
    const store = new ProposalSessionStore(5);
    const errorCache = createInMemoryErrorCache();
    const sessionCache = createInMemorySessionCacheV2();

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
      undefined,
      errorCache,
      sessionCache,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    expect(callCount.count).toBe(3);

    // Session with attemptsUsed=3
    expect(sessionCache.saved).toHaveLength(1);
    expect(result.session.source.attemptsUsed).toBe(3);

    // 2 failed attempts saved to error cache (attempt 1 and 2)
    expect(errorCache.saved).toHaveLength(2);
    expect(errorCache.saved[0].attemptIndex).toBe(1);
    expect(errorCache.saved[1].attemptIndex).toBe(2);

    // All failed attempts share the same errorSessionId
    const errorSessionId = errorCache.saved[0].errorSessionId;
    expect(errorCache.saved[1].errorSessionId).toBe(errorSessionId);

    // Notice plan
    expect(result.noticePlan.attemptsUsed).toBe(3);
    expect(result.noticePlan.errorCacheWritten).toBe(true);
  });

  // ── Scenario 4: 3 次全部失败 ──

  it("all 3 attempts fail: saves 3 failed attempts to error-cache, returns exhausted", async () => {
    const repository = createMarkdownRepository(noteContent);
    const callCount = { count: 0 };
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
      async generateProposalV2(_request: LlmRequestV2): Promise<LlmResponse> {
        callCount.count++;
        throw new Error("Simulated persistent provider failure " + callCount.count);
      },
    };
    const store = new ProposalSessionStore(5);
    const errorCache = createInMemoryErrorCache();
    const sessionCache = createInMemorySessionCacheV2();

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
      undefined,
      errorCache,
      sessionCache,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("exhausted");
    if (result.kind !== "exhausted") return;

    expect(callCount.count).toBe(3);

    // No session in session-cache
    expect(sessionCache.saved).toHaveLength(0);

    // 3 failed attempts in error cache
    expect(errorCache.saved).toHaveLength(3);
    expect(result.failedAttempts).toHaveLength(3);
    expect(errorCache.saved[0].attemptIndex).toBe(1);
    expect(errorCache.saved[1].attemptIndex).toBe(2);
    expect(errorCache.saved[2].attemptIndex).toBe(3);

    // Same errorSessionId for all 3
    const errorSessionId = errorCache.saved[0].errorSessionId;
    expect(errorCache.saved[1].errorSessionId).toBe(errorSessionId);
    expect(errorCache.saved[2].errorSessionId).toBe(errorSessionId);

    // Notice plan
    expect(result.noticePlan.attemptsUsed).toBe(3);
    expect(result.noticePlan.maxAttempts).toBe(3);
    expect(result.noticePlan.errorCacheWritten).toBe(true);
    expect(result.noticePlan.errorCacheDisabled).toBe(false);
  });

  // ── Scenario 5: error-cache disabled ──

  it("error cache disabled: exhausted result shows errorCacheDisabled=true, errorCacheWritten=false", async () => {
    const repository = createMarkdownRepository(noteContent);
    const callCount = { count: 0 };
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
      async generateProposalV2(_request: LlmRequestV2): Promise<LlmResponse> {
        callCount.count++;
        throw new Error("Fail.");
      },
    };
    const store = new ProposalSessionStore(5);
    const sessionCache = createInMemorySessionCacheV2();
    // No error cache injected

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
      undefined,
      undefined, // error cache = undefined
      sessionCache,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("exhausted");
    if (result.kind !== "exhausted") return;

    expect(result.noticePlan.errorCacheDisabled).toBe(true);
    expect(result.noticePlan.errorCacheWritten).toBe(false);
    expect(result.failedAttempts).toHaveLength(3);
  });

  // ── Scenario 6: Zod validation failure → retry ──

  it("zod validation failure triggers retry; success on attempt 2 saves failed attempt with zodError", async () => {
    const repository = createMarkdownRepository(noteContent);
    let attempt = 0;
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
      async generateProposalV2(_request: LlmRequestV2): Promise<LlmResponse> {
        attempt++;
        if (attempt === 1) {
          // Valid JSON but missing required "blocks" field → zod validation failure
          return {
            rawText: JSON.stringify({
              workflowProfileId: "raw-refined",
              schemaVersion: "0.2",
              // no blocks array — zod will reject
            }),
          };
        }
        return {
          rawText: JSON.stringify({
            workflowProfileId: "raw-refined",
            schemaVersion: "0.2",
            blocks: [
              { id: "summary", content: "Summary." },
              { id: "coreQuestion", content: "Core question." },
              { id: "currentConclusion", content: "Conclusion." },
              { id: "reasoning", content: "Reasoning." },
            ],
          }),
          usage: {
            provider: "mock-llm", model: "mock-gpt",
            totalTokens: 100, countingMode: "actual" as const,
            generatedAt: new Date().toISOString(),
          },
        };
      },
    };
    const store = new ProposalSessionStore(5);
    const errorCache = createInMemoryErrorCache();
    const sessionCache = createInMemorySessionCacheV2();

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
      undefined,
      errorCache,
      sessionCache,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    expect(attempt).toBe(2);
    expect(result.session.source.attemptsUsed).toBe(2);

    // Failed attempt 1 has zod error in validation snapshot
    expect(errorCache.saved).toHaveLength(1);
    expect(errorCache.saved[0].attemptIndex).toBe(1);
    expect(errorCache.saved[0].errorSummary).toContain("Zod validation failed");
    expect(errorCache.saved[0].validationSnapshot?.zodError).toBeDefined();

    // Response snapshot preserved
    expect(errorCache.saved[0].responseSnapshot?.rawText).toBeDefined();
  });

  // ── Scenario 7: normalization invalid → retry ──

  it("normalization invalid triggers retry; failed attempt has normalizationReport", async () => {
    const repository = createMarkdownRepository(noteContent);
    let attempt = 0;
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
      async generateProposalV2(_request: LlmRequestV2): Promise<LlmResponse> {
        attempt++;
        // Always return blocks with unknown IDs → normalization always invalid
        return {
          rawText: JSON.stringify({
            workflowProfileId: "raw-refined",
            schemaVersion: "0.2",
            blocks: [
              { id: "unknown-block", content: "Not in config." },
            ],
          }),
        };
      },
    };
    const store = new ProposalSessionStore(5);
    const errorCache = createInMemoryErrorCache();
    const sessionCache = createInMemorySessionCacheV2();

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
      undefined,
      errorCache,
      sessionCache,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("exhausted");
    if (result.kind !== "exhausted") return;

    expect(errorCache.saved).toHaveLength(3);
    expect(errorCache.saved[2].errorSummary).toContain("Normalization invalid");
    expect(errorCache.saved[2].validationSnapshot?.normalizationReport).toBeDefined();

    // No session created
    expect(sessionCache.saved).toHaveLength(0);
  });

  // ── Scenario 8: FailedAttemptRecord structure ──

  it("FailedAttemptRecord has complete structure: request, response, validation snapshots", async () => {
    const repository = createMarkdownRepository(noteContent);
    let attempt = 0;
    const provider: LlmProvider = {
      providerId: "test-provider",
      model: "test-model",
      generateProposal: vi.fn(),
      async generateProposalV2(_request: LlmRequestV2): Promise<LlmResponse> {
        attempt++;
        if (attempt === 1) throw new Error("Network error");
        if (attempt === 2) {
          return {
            rawText: JSON.stringify({
              workflowProfileId: "raw-refined",
              schemaVersion: "0.2",
              blocks: [
                { id: "summary", content: "OK." },
                { id: "coreQuestion", content: "OK." },
                { id: "currentConclusion", content: "OK." },
                { id: "reasoning", content: "OK." },
              ],
            }),
            usage: {
              provider: "test-provider", model: "test-model",
              totalTokens: 300, countingMode: "actual" as const,
              generatedAt: new Date().toISOString(),
            },
          };
        }
        throw new Error("should not reach");
      },
    };
    const store = new ProposalSessionStore(5);
    const errorCache = createInMemoryErrorCache();
    const sessionCache = createInMemorySessionCacheV2();

    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
      undefined,
      errorCache,
      sessionCache,
    );

    const result = await useCase.executeV2();
    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    expect(errorCache.saved).toHaveLength(1);
    const fa = errorCache.saved[0];

    // Identity
    expect(fa.attemptIndex).toBe(1);
    expect(fa.errorSessionId).toMatch(/^error-session-/);
    expect(fa.id).toBe(`${fa.errorSessionId}-attempt-1`);
    expect(fa.provider).toBe("test-provider");
    expect(fa.model).toBe("test-model");
    expect(fa.workflowProfileId).toBe("raw-refined");
    expect(fa.schemaVersion).toBe("0.2");
    expect(fa.notePath).toBe("10_Raw/example.md");
    expect(fa.noteTitle).toBe("example");

    // Request snapshot
    expect(fa.requestSnapshot.messages).toHaveLength(2); // system + user
    expect(fa.requestSnapshot.messages[0].role).toBe("system");
    expect(fa.requestSnapshot.schemaName).toBe("RawRefinedProposalV2");
    expect(fa.requestSnapshot.schemaVersion).toBe("0.2");

    // Response snapshot (not present for provider failure)
    expect(fa.responseSnapshot).toBeUndefined();

    // Validation snapshot (empty for provider failure)
    expect(fa.validationSnapshot?.jsonExtractionError).toBeUndefined();
    expect(fa.validationSnapshot?.zodError).toBeUndefined();

    // Block config snapshot
    expect(fa.blockConfigSnapshot.protectH1).toBe(true);
    expect(fa.blockConfigSnapshot.tagWhitelist).toContain("#ai/generated");
  });
});
