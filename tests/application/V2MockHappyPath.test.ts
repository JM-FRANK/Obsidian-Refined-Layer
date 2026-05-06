import { describe, expect, it, vi } from "vitest";

import type { LlmProvider } from "../../src/adapters/llm/LlmProvider";
import { CreateProposalUseCase } from "../../src/application/CreateProposalUseCase";
import { BuildApplyPlanUseCase } from "../../src/application/BuildApplyPlanUseCase";
import { ApplyDecisionUseCase } from "../../src/application/ApplyDecisionUseCase";
import { SaveDraftUseCase } from "../../src/application/SaveDraftUseCase";
import { OpenCachedSessionUseCase } from "../../src/application/OpenCachedSessionUseCase";
import type { ActiveNoteRepository } from "../../src/application/CheckEligibilityUseCase";
import type { NoteFilePort } from "../../src/application/ports/NoteFilePort";
import { resolveRefineProfile } from "../../src/core/profile/RefineProfile";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
import type { UserDecisionV2 } from "../../src/core/review/UserDecision";
import type { ProposalSessionV2 } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";
import type { SessionCacheV2Info, SessionCacheV2Store } from "../../src/runtime/SessionCacheV2Store";
import { DEFAULT_PLUGIN_SETTINGS } from "../../src/settings/PluginSettings";
import { createReviewViewModelV2 } from "../../src/ui/review/ReviewViewModel";

class MemorySessionCacheV2 implements SessionCacheV2Store {
  sessions: ProposalSessionV2[] = [];

  async save(session: ProposalSessionV2): Promise<void> {
    this.sessions = [session, ...this.sessions.filter((item) => item.id !== session.id)];
  }

  async loadAll(): Promise<ProposalSessionV2[]> {
    return this.sessions;
  }

  async getLatestForNote(notePath: string): Promise<ProposalSessionV2 | null> {
    return this.sessions.find((session) => session.notePath === notePath) ?? null;
  }

  getCacheInfo(): SessionCacheV2Info {
    return {
      cachePath: "memory/session-cache",
      filePath: "memory/session-cache/sessions.v2.json",
      legacyFilePath: "memory/session-cache/sessions.v1.json",
      compatibilityStrategy: "ignore-v1",
      limit: 5,
    };
  }
}

describe("v0.2 mock happy path", () => {
  it("runs raw note to review decision to apply, preserving B block and appending only selectedTags", async () => {
    const initialContent = "---\nstatus: raw\ntags:\n  - #todo/review\n---\n# Title\n\n## 原始内容\nraw text";
    let currentContent = initialContent;
    const drafts = new Map<string, string>();
    const notePort: NoteFilePort & ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown" as const,
          note: { path: "10_Raw/example.md", title: "example", content: currentContent },
        };
      },
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: currentContent };
      },
      async writeNote(_path, content) {
        currentContent = content;
      },
      async writeDraft(path, content) {
        drafts.set(path, content);
      },
    };
    const provider: LlmProvider = {
      providerId: "mock-llm",
      model: "mock-gpt",
      generateProposal: vi.fn(),
      generateProposalV2: vi.fn(async () => ({
        rawText: JSON.stringify({
          workflowProfileId: "raw-refined",
          schemaVersion: "0.2",
          blocks: [
            { id: "summary", content: "Summary." },
            { id: "reasoning", content: "Reasoning." },
          ],
          tagSuggestion: {
            selectedTags: ["#ai/generated"],
            newTagSuggestions: ["#new/idea"],
          },
        }),
      })),
    };
    const sessionCache = new MemorySessionCacheV2();
    const defaultProfile = resolveRefineProfile(DEFAULT_PLUGIN_SETTINGS.rawRefined);
    const settings = {
      ...defaultProfile,
      aBlocks: defaultProfile.aBlocks.map((block) => ({
        ...block,
        enabled: block.id === "summary" || block.id === "reasoning",
      })),
    };
    const createUseCase = new CreateProposalUseCase(
      notePort,
      rawRefinedProfile,
      provider,
      new ProposalSessionStore(5),
      settings,
      undefined,
      undefined,
      sessionCache,
    );

    const created = await createUseCase.executeV2();
    expect(created.kind).toBe("created-v2");
    if (created.kind !== "created-v2") throw new Error("expected created-v2");

    const viewModel = createReviewViewModelV2(created.session);
    expect(viewModel.blocks.map((block) => block.id)).toEqual(["summary", "reasoning"]);
    expect(viewModel.selectedTags).toEqual([{ tag: "#ai/generated", accepted: false }]);
    expect(viewModel.newTagSuggestions).toEqual(["#new/idea"]);

    const decision: UserDecisionV2 = {
      acceptBlocks: { summary: true, reasoning: true },
      acceptFrontmatter: {},
      acceptTags: { add: ["#ai/generated", "#new/idea"] },
    };
    const planResult = await new BuildApplyPlanUseCase(
      rawRefinedProfile,
      new ProposalSessionStore(5),
      notePort,
      sessionCache,
    ).executeV2(created.session.id, decision);

    expect(planResult.ok).toBe(true);
    if (!planResult.ok) throw new Error("expected apply plan");

    await expect(new ApplyDecisionUseCase(
      rawRefinedProfile,
      new ProposalSessionStore(5),
      notePort,
      sessionCache,
    ).executeV2(planResult.plan)).resolves.toEqual({
      kind: "applied",
      notePath: "10_Raw/example.md",
    });

    expect(currentContent).toContain("## 摘要\n\nSummary.");
    expect(currentContent).toContain("## 依据与推理\n\nReasoning.");
    expect(currentContent).toContain("## 原始内容\nraw text");
    expect(currentContent).toContain("tags:\n  - #todo/review\n  - #ai/generated");
    expect(currentContent).not.toContain("#new/idea");

    const cached = await new OpenCachedSessionUseCase(sessionCache).list();
    expect(cached).toHaveLength(1);

    await expect(new SaveDraftUseCase(
      new ProposalSessionStore(5),
      notePort,
      DEFAULT_PLUGIN_SETTINGS,
      sessionCache,
    ).executeV2(created.session.id, decision)).resolves.toMatchObject({ saved: true });
    expect([...drafts.values()][0]).toContain("New Tag Suggestions");
    expect([...drafts.values()][0]).toContain("#new/idea");
  });
});
