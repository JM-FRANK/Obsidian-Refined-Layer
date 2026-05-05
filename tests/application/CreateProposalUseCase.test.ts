import { describe, expect, it, vi } from "vitest";

import { CreateProposalUseCase, renderPromptTemplate } from "../../src/application/CreateProposalUseCase";
import type { ActiveNoteRepository } from "../../src/application/CheckEligibilityUseCase";
import type { LlmProvider } from "../../src/adapters/llm/LlmProvider";
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
