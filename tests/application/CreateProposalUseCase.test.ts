import { describe, expect, it, vi } from "vitest";

import { CreateProposalUseCase, renderPromptTemplate } from "../../src/application/CreateProposalUseCase";
import type { ActiveNoteRepository } from "../../src/application/CheckEligibilityUseCase";
import type { LlmProvider } from "../../src/adapters/llm/LlmProvider";
import { MockLlmProvider } from "../../src/adapters/llm/MockLlmProvider";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";
import { DEFAULT_PLUGIN_SETTINGS } from "../../src/settings/PluginSettings";

const defaultSettings = DEFAULT_PLUGIN_SETTINGS.rawRefined;

function createMarkdownRepository(content: string, path = "10_Raw/example.md"): ActiveNoteRepository {
  return {
    async getActiveNote() {
      return {
        kind: "markdown" as const,
        note: {
          path,
          title: "example",
          content,
        },
      };
    },
  };
}

describe("CreateProposalUseCase", () => {
  it("creates a mock proposal session for a valid raw note", async () => {
    const repository = createMarkdownRepository("---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello");
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(async () => ({
        rawText: JSON.stringify({
          workflowProfileId: "raw-refined",
          refinedSections: {
            summary: "summary",
            coreQuestion: "question",
            currentConclusion: "conclusion",
            reasoning: "reasoning",
          },
        }),
        usage: {
          provider: "mock-llm",
          model: "mock-gpt",
          totalTokens: 200,
          countingMode: "actual" as const,
          generatedAt: "2026-05-04T00:00:00.000Z",
        },
      })),
    };
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(repository, rawRefinedProfile, provider, store, defaultSettings);

    const result = await useCase.execute();

    expect(result.kind).toBe("created");
    if (result.kind !== "created") {
      throw new Error("expected created result");
    }

    expect(result.session.notePath).toBe("10_Raw/example.md");
    expect(result.session.baseFileHash).toBeTruthy();
    expect(result.session.baseProtectedRegionHash).toBeTruthy();
    expect(result.session.tokenUsage?.countingMode).toBe("actual");
    await expect(store.getLatestSessionForNote("10_Raw/example.md")).resolves.toMatchObject({
      id: result.session.id,
    });
    expect(provider.generateProposal).toHaveBeenCalledTimes(1);
  });

  it("does not call the provider for an ineligible note", async () => {
    const repository = createMarkdownRepository("# Title\n\n## 原始内容\nhello");
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
    };
    const useCase = new CreateProposalUseCase(
      repository,
      rawRefinedProfile,
      provider,
      new ProposalSessionStore(5),
      defaultSettings,
    );

    const result = await useCase.execute();

    expect(result).toMatchObject({
      kind: "eligibility-failed",
    });
    expect(provider.generateProposal).not.toHaveBeenCalled();
  });

  it("stops when the provider output fails validation", async () => {
    const repository = createMarkdownRepository("---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello");
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(async () => ({
        rawText: JSON.stringify({
          workflowProfileId: "raw-refined",
          refinedSections: {
            summary: "summary",
          },
        }),
      })),
    };
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(repository, rawRefinedProfile, provider, store, defaultSettings);

    const result = await useCase.execute();

    expect(result).toEqual({
      kind: "validation-failed",
      errors: [
        {
          layer: "schema",
          code: "missing-required-section-coreQuestion",
          message: "refinedSections.coreQuestion must be a non-empty string.",
        },
      ],
    });
    await expect(store.getLatestSessionForNote("10_Raw/example.md")).resolves.toBeNull();
  });

  it("returns a provider failure without creating a session", async () => {
    const repository = createMarkdownRepository("---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello");
    const provider: LlmProvider = {
      providerId: "openai-compatible",
      model: "gpt-test",
      generateProposal: vi.fn(async () => {
        throw new Error("Authorization: Bearer sk-secret");
      }),
    };
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(repository, rawRefinedProfile, provider, store, defaultSettings);

    const result = await useCase.execute();

    expect(result).toEqual({
      kind: "provider-failed",
      message: "[REDACTED]",
    });
    await expect(store.getLatestSessionForNote("10_Raw/example.md")).resolves.toBeNull();
  });

  it("stores estimated token usage when provider usage is unavailable", async () => {
    const repository = createMarkdownRepository("---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello");
    const provider: LlmProvider = {
      providerId: "openai-compatible",
      model: "gpt-test",
      generateProposal: vi.fn(async () => ({
        rawText: JSON.stringify({
          workflowProfileId: "raw-refined",
          refinedSections: {
            summary: "summary",
            coreQuestion: "question",
            currentConclusion: "conclusion",
            reasoning: "reasoning",
          },
        }),
      })),
    };
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(repository, rawRefinedProfile, provider, store, defaultSettings);

    const result = await useCase.execute();

    expect(result.kind).toBe("created");
    if (result.kind !== "created") {
      throw new Error("expected created result");
    }
    expect(result.session.tokenUsage?.countingMode).toBe("estimated");
  });
});

// ── v0.2.0 pipeline (executeV2) ──

/** Settings with only the 4 A blocks that MockLlmProvider returns. */
const mockV2Settings = {
  ...defaultSettings,
  aBlocks: defaultSettings.aBlocks.filter((b) =>
    ["summary", "coreQuestion", "currentConclusion", "reasoning"].includes(b.id),
  ),
};

describe("CreateProposalUseCase v0.2 (executeV2)", () => {
  const content = "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello";

  it("creates a v0.2 proposal session with mock provider", async () => {
    const repository = createMarkdownRepository(content);
    const provider = new MockLlmProvider();
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    // Session structure
    expect(result.session.schemaVersion).toBe("0.2");
    expect(result.session.notePath).toBe("10_Raw/example.md");
    expect(result.session.baseFileHash).toBeTruthy();
    expect(result.session.baseBBlockHash).toBeTruthy();
    expect(result.session.status).toBe("generated");

    // Block config snapshot
    expect(result.session.blockConfigSnapshot.protectH1).toBe(true);
    expect(result.session.blockConfigSnapshot.aBlocks).toHaveLength(4);
    expect(result.session.blockConfigSnapshot.bBlock.id).toBe("original-content");
    expect(result.session.blockConfigSnapshot.tagWhitelist).toContain("#ai/generated");

    // Proposal structure
    expect(result.session.proposal.blocks).toHaveLength(4);
    expect(result.session.proposal.blocks[0]).toHaveProperty("id");
    expect(result.session.proposal.blocks[0]).toHaveProperty("content");

    // Validation result — all 4 mock blocks match 4 enabled configs
    expect(result.session.validation.status).toBe("valid");
    expect(result.session.validation.acceptedFields).toHaveLength(4);
    expect(result.session.validation.tagNormalizationApplied).toBe(false);

    // Source
    expect(result.session.source.provider).toBe("mock-llm");
    expect(result.session.source.attemptsUsed).toBe(1);

    // Token usage
    expect(result.session.tokenUsage?.countingMode).toBe("actual");
  });

  it("includes tagNormalizationApplied and warnings when tags need normalization", async () => {
    const repository = createMarkdownRepository(content);
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
      async generateProposalV2() {
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
            tagSuggestion: {
              selectedTags: ["ai/generated, custom-tag"],
              newTagSuggestions: [],
            },
          }),
          usage: {
            provider: "mock-llm", model: "mock-gpt",
            totalTokens: 200, countingMode: "actual" as const,
            generatedAt: new Date().toISOString(),
          },
        };
      },
    };
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, mockV2Settings,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    expect(result.session.validation.tagNormalizationApplied).toBe(true);
    expect(
      result.session.validation.warnings.some((w) =>
        w.includes("Tag normalization applied"),
      ),
    ).toBe(true);
    expect(result.session.validation.status).toBe("valid"); // body blocks valid
  });

  it("returns validation-failed when provider does not support generateProposalV2", async () => {
    const repository = createMarkdownRepository(content);
    const provider: LlmProvider = {
      providerId: "old-mock",
      model: "old",
      generateProposal: vi.fn(),
      // No generateProposalV2
    };
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, defaultSettings,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("validation-failed");
    if (result.kind !== "validation-failed") return;
    expect(result.errors[0].code).toBe("v2-not-supported");
  });

  it("returns eligibility-failed for notes without frontmatter", async () => {
    const repository = createMarkdownRepository("# Title\n\n## 原始内容\nhello");
    const provider = new MockLlmProvider();
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, defaultSettings,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("eligibility-failed");
  });

  it("returns exhausted after 3 retries when all blocks are rejected during normalization", async () => {
    const repository = createMarkdownRepository(content);
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
      async generateProposalV2() {
        return {
          rawText: JSON.stringify({
            workflowProfileId: "raw-refined",
            schemaVersion: "0.2",
            blocks: [
              { id: "nonexistent-block", content: "Not in config." },
            ],
          }),
          usage: {
            provider: "mock-llm", model: "mock-gpt",
            totalTokens: 50, countingMode: "actual" as const,
            generatedAt: new Date().toISOString(),
          },
        };
      },
    };
    const store = new ProposalSessionStore(5);
    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, defaultSettings,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("exhausted");
    if (result.kind !== "exhausted") return;
    expect(result.failedAttempts).toHaveLength(3);
    expect(result.failedAttempts[2].errorSummary).toBe("Normalization invalid: no acceptable blocks after filtering.");
    expect(result.noticePlan.attemptsUsed).toBe(3);
    expect(result.noticePlan.errorCacheDisabled).toBe(true); // no error cache injected
  });

  it("returns partial status when some blocks are missing", async () => {
    const repository = createMarkdownRepository(content);
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
      async generateProposalV2() {
        return {
          rawText: JSON.stringify({
            workflowProfileId: "raw-refined",
            schemaVersion: "0.2",
            blocks: [
              { id: "summary", content: "Only summary." },
              // coreQuestion is missing from enabled blocks
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
    const useCase = new CreateProposalUseCase(
      repository, rawRefinedProfile, provider, store, defaultSettings,
    );

    const result = await useCase.executeV2();

    expect(result.kind).toBe("created-v2");
    if (result.kind !== "created-v2") return;

    expect(result.session.validation.status).toBe("partial");
    expect(
      result.session.validation.warnings.some((w) =>
        w.includes("Missing enabled A block"),
      ),
    ).toBe(true);
  });
});

describe("renderPromptTemplate", () => {
  it("replaces template variables in a single pass", () => {
    const template = "Path: {{notePath}}, Title: {{noteTitle}}, Content: {{noteContent}}";
    const variables = {
      notePath: "10_Raw/test.md",
      noteTitle: "Test Note",
      noteContent: "Some content with {{notePath}} and {{noteTitle}} inside",
    };
    const result = renderPromptTemplate(template, variables);

    expect(result).toBe(
      "Path: 10_Raw/test.md, Title: Test Note, Content: Some content with {{notePath}} and {{noteTitle}} inside",
    );
  });

  it("does not double-substitute when noteContent contains template variable syntax", () => {
    const template = "{{noteContent}}";
    const variables = {
      noteContent: "This has {{notePath}} embedded in it",
      notePath: "/should/not/appear",
    };
    const result = renderPromptTemplate(template, variables);

    expect(result).toBe("This has {{notePath}} embedded in it");
    expect(result).not.toContain("/should/not/appear");
  });

  it("preserves unknown template variables", () => {
    const template = "Hello {{unknown}} and {{noteTitle}}";
    const variables = { noteTitle: "Test" };
    const result = renderPromptTemplate(template, variables);

    expect(result).toBe("Hello {{unknown}} and Test");
  });
});
