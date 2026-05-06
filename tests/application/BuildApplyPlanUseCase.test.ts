import { describe, expect, it } from "vitest";

import { BuildApplyPlanUseCase } from "../../src/application/BuildApplyPlanUseCase";
import type { NoteFilePort } from "../../src/application/ports/NoteFilePort";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
import type { ProposalSession, ProposalSessionV2 } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";
import type { SessionCacheV2Store } from "../../src/runtime/SessionCacheV2Store";

function createSession(): ProposalSession {
  return {
    id: "session-1",
    workflowProfileId: "raw-refined",
    policySnapshotId: "raw-refined:0.1.0",
    notePath: "10_Raw/example.md",
    noteTitle: "example",
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
    baseFileHash: "file",
    baseProtectedRegionHash: "region",
    proposal: {
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "reasoning",
      },
      frontmatterSuggestion: {
        status: "refined",
        source: ["self"],
        context: ["ctx/a"],
      },
      tagSuggestion: {
        add: ["#ai/generated"],
        remove: ["#todo/review"],
      },
    },
    status: "generated",
  };
}

function createSessionV2(overrides: Partial<ProposalSessionV2> = {}): ProposalSessionV2 {
  return {
    id: "session-v2",
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    createdAt: "2026-05-06T00:00:00.000Z",
    updatedAt: "2026-05-06T00:00:00.000Z",
    notePath: "10_Raw/example.md",
    noteTitle: "example",
    baseFileHash: "file",
    baseBBlockHash: "b-block",
    blockConfigSnapshot: {
      protectH1: true,
      aBlocks: [
        { id: "summary", name: "摘要", heading: "摘要", headingLevel: 2, prompt: "summary", order: 1, enabled: true },
        { id: "reasoning", name: "推理", heading: "推理", headingLevel: 2, prompt: "reasoning", order: 2, enabled: true },
      ],
      bBlock: { id: "original-content", name: "原始内容", heading: "原始内容", headingLevel: 2, required: true },
      tagWhitelist: ["#ai/generated", "#todo/review"],
    },
    proposal: {
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [
        { id: "summary", content: "Summary." },
        { id: "reasoning", content: "Reasoning." },
      ],
      frontmatterSuggestion: {
        status: "refined",
        source: ["self"],
        context: ["ctx/a"],
      },
      tagSuggestion: {
        selectedTags: ["#ai/generated", "#todo/review"],
        newTagSuggestions: ["#new/idea"],
      },
    },
    validation: {
      status: "valid",
      acceptedFields: [],
      rejectedFields: [],
      warnings: [],
      tagNormalizationApplied: false,
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

function createSessionCacheV2(sessions: ProposalSessionV2[]): SessionCacheV2Store {
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

function createNoteFilePort(content = "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nraw text\n"): NoteFilePort {
  return {
    async readNoteByPath() {
      return {
        path: "10_Raw/example.md",
        title: "example",
        content,
      };
    },
    async writeNote() {
      throw new Error("not used");
    },
    async writeDraft() {
      throw new Error("not used");
    },
  };
}

describe("BuildApplyPlanUseCase", () => {
  it("generates only the operations accepted by UserDecision", async () => {
    const store = new ProposalSessionStore(5);
    await store.save(createSession());
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return {
          path: "10_Raw/example.md",
          title: "example",
          content: "---\nstatus: raw\n---\n## 原始内容\nraw text\n",
        };
      },
      async writeNote() {
        throw new Error("not used");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };

    const useCase = new BuildApplyPlanUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute("session-1", {
      acceptBody: true,
      acceptFrontmatter: { status: true },
      acceptTags: { add: ["#ai/generated"] },
    });

    expect(result).toMatchObject({
      ok: true,
      plan: {
        sessionId: "session-1",
        notePath: "10_Raw/example.md",
      },
    });
    if (!result.ok) {
      throw new Error("expected plan");
    }
    expect(result.plan.operations.map((item) => item.type)).toEqual([
      "replace-refined-body",
      "update-frontmatter",
      "update-tags",
    ]);
  });

  it("rejects body plan generation when the protected region is missing", async () => {
    const store = new ProposalSessionStore(5);
    await store.save(createSession());
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return {
          path: "10_Raw/example.md",
          title: "example",
          content: "---\nstatus: raw\n---\n# no protected section",
        };
      },
      async writeNote() {
        throw new Error("not used");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };

    const useCase = new BuildApplyPlanUseCase(rawRefinedProfile, store, noteFilePort);
    await expect(useCase.execute("session-1", {
      acceptBody: true,
      acceptFrontmatter: {},
      acceptTags: {},
    })).resolves.toEqual({
      ok: false,
      code: "missing-heading",
      message: "Required heading ## 原始内容 was not found.",
    });
  });
});

describe("BuildApplyPlanUseCase v2", () => {
  it("generates replace-refined-blocks, update-frontmatter, and append-tags from accepted v2 decisions", async () => {
    const store = new ProposalSessionStore(5);
    const session = createSessionV2();
    const useCase = new BuildApplyPlanUseCase(
      rawRefinedProfile,
      store,
      createNoteFilePort(),
      createSessionCacheV2([session]),
    );

    const result = await useCase.executeV2("session-v2", {
      acceptBlocks: { summary: true, reasoning: false },
      acceptFrontmatter: { status: true, source: true },
      acceptTags: { add: ["#ai/generated", "#new/idea"] },
    });

    expect(result).toMatchObject({
      ok: true,
      plan: {
        sessionId: "session-v2",
        notePath: "10_Raw/example.md",
      },
    });
    if (!result.ok) throw new Error("expected plan");

    expect(result.plan.operations).toEqual([
      {
        type: "replace-refined-blocks",
        targetPath: "10_Raw/example.md",
        blocks: [
          { id: "summary", heading: "摘要", headingLevel: 2, content: "Summary." },
        ],
      },
      {
        type: "update-frontmatter",
        targetPath: "10_Raw/example.md",
        changes: { status: "refined", source: ["self"] },
      },
      {
        type: "append-tags",
        targetPath: "10_Raw/example.md",
        tags: ["#ai/generated"],
      },
    ]);
  });

  it("does not create operations for unchecked blocks or unchecked selectedTags", async () => {
    const store = new ProposalSessionStore(5);
    const session = createSessionV2();
    const useCase = new BuildApplyPlanUseCase(
      rawRefinedProfile,
      store,
      createNoteFilePort(),
      createSessionCacheV2([session]),
    );

    const result = await useCase.executeV2("session-v2", {
      acceptBlocks: { summary: false, reasoning: false },
      acceptFrontmatter: {},
      acceptTags: { add: [] },
    });

    expect(result).toEqual({
      ok: true,
      plan: {
        notePath: "10_Raw/example.md",
        sessionId: "session-v2",
        operations: [],
      },
    });
  });

  it("does not generate remove-tags and never applies newTagSuggestions", async () => {
    const store = new ProposalSessionStore(5);
    const session = createSessionV2();
    const useCase = new BuildApplyPlanUseCase(
      rawRefinedProfile,
      store,
      createNoteFilePort(),
      createSessionCacheV2([session]),
    );

    const result = await useCase.executeV2("session-v2", {
      acceptBlocks: {},
      acceptFrontmatter: {},
      acceptTags: { add: ["#new/idea", "#todo/review"] },
    });

    if (!result.ok) throw new Error("expected plan");
    expect(result.plan.operations).toEqual([
      {
        type: "append-tags",
        targetPath: "10_Raw/example.md",
        tags: ["#todo/review"],
      },
    ]);
    expect(result.plan.operations.map((operation) => operation.type)).not.toContain("update-tags");
  });

  it("rejects an accepted A block that contains the current B block text", async () => {
    const store = new ProposalSessionStore(5);
    const session = createSessionV2({
      proposal: {
        ...createSessionV2().proposal,
        blocks: [
          { id: "summary", content: "## 原始内容\nraw text\n" },
        ],
      },
    });
    const useCase = new BuildApplyPlanUseCase(
      rawRefinedProfile,
      store,
      createNoteFilePort(),
      createSessionCacheV2([session]),
    );

    await expect(useCase.executeV2("session-v2", {
      acceptBlocks: { summary: true },
      acceptFrontmatter: {},
      acceptTags: { add: [] },
    })).resolves.toEqual({
      ok: false,
      code: "accepted-block-contains-b-block",
      message: "Accepted block summary contains protected B block content.",
    });
  });
});
