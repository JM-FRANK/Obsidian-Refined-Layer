import { describe, expect, it } from "vitest";

import { SaveDraftUseCase } from "../../src/application/SaveDraftUseCase";
import type { NoteFilePort } from "../../src/application/ports/NoteFilePort";
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
      warnings: ["warn-1"],
    },
    tokenUsage: {
      provider: "mock-llm",
      model: "mock-gpt",
      countingMode: "actual",
      totalTokens: 200,
      generatedAt: "2026-05-04T00:00:00.000Z",
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
    notePath: "10_Raw/v2.md",
    noteTitle: "v2",
    baseFileHash: "file",
    baseBBlockHash: "b",
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
        { id: "reasoning", content: "Reasoning with sk-secret-value." },
      ],
      tagSuggestion: {
        selectedTags: ["#ai/generated"],
        newTagSuggestions: ["#new/idea"],
      },
    },
    validation: {
      status: "partial",
      acceptedFields: ["blocks.summary"],
      rejectedFields: [
        { field: "tagSuggestion.selectedTags", reason: "Moved unknown tag to suggestions." },
      ],
      warnings: ["tag warning"],
      tagNormalizationApplied: true,
    },
    tokenUsage: {
      provider: "mock-llm",
      model: "mock-gpt",
      countingMode: "actual",
      totalTokens: 200,
      generatedAt: "2026-05-06T00:00:00.000Z",
    },
    status: "generated",
    source: {
      provider: "mock-llm",
      model: "mock-gpt",
      attemptsUsed: 2,
    },
    ...overrides,
  };
}

function createSessionCacheV2(sessions: ProposalSessionV2[]): SessionCacheV2Store & { saved: ProposalSessionV2[] } {
  const saved: ProposalSessionV2[] = [];
  return {
    saved,
    async save(session: ProposalSessionV2) {
      saved.push(session);
    },
    async loadAll() {
      return sessions;
    },
    async getLatestForNote() {
      return sessions[0] ?? null;
    },
  };
}

describe("SaveDraftUseCase", () => {
  it("writes an independent draft file with proposal metadata", async () => {
    const store = new ProposalSessionStore(5);
    await store.save(createSession());
    let draftPath = "";
    let draftContent = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return null;
      },
      async writeNote() {
        throw new Error("not used");
      },
      async writeDraft(path, content) {
        draftPath = path;
        draftContent = content;
      },
    };

    const useCase = new SaveDraftUseCase(store, noteFilePort, {
      draftFolder: "80_Runtime/refine-drafts",
    });
    const result = await useCase.execute("session-1", "file-changed");

    expect(result).toEqual({
      saved: true,
      draftPath: draftPath,
    });
    expect(draftPath).toContain("80_Runtime/refine-drafts/example-session-1.md");
    expect(draftContent).toContain("source note path: 10_Raw/example.md");
    expect(draftContent).toContain("workflow id: raw-refined");
    expect(draftContent).toContain("token usage: actual");
    expect(draftContent).toContain("conflict reason: file-changed");
    await expect(store.get("session-1")).resolves.toMatchObject({
      status: "saved_as_draft",
    });
  });

  it("writes a v2 draft with A blocks, tag suggestions, validation, and attemptsUsed", async () => {
    const store = new ProposalSessionStore(5);
    const cache = createSessionCacheV2([createSessionV2()]);
    let draftPath = "";
    let draftContent = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return null;
      },
      async writeNote() {
        throw new Error("not used");
      },
      async writeDraft(path, content) {
        draftPath = path;
        draftContent = content;
      },
    };

    const useCase = new SaveDraftUseCase(store, noteFilePort, {
      draftFolder: "80_Runtime/refine-drafts",
    }, cache);
    const result = await useCase.executeV2("session-v2", {
      acceptBlocks: { summary: true },
      acceptFrontmatter: {},
      acceptTags: { add: ["#ai/generated"] },
      saveAsDraftOnly: true,
    });

    expect(result).toEqual({
      saved: true,
      draftPath,
    });
    expect(draftPath).toContain("80_Runtime/refine-drafts/v2-session-v2.md");
    expect(draftContent).toContain("schema version: 0.2");
    expect(draftContent).toContain("attempts used: 2");
    expect(draftContent).toContain("## Proposed A Blocks");
    expect(draftContent).toContain("accepted in review: yes");
    expect(draftContent).toContain("## Selected Tags");
    expect(draftContent).toContain("#ai/generated (accepted)");
    expect(draftContent).toContain("## New Tag Suggestions");
    expect(draftContent).toContain("#new/idea");
    expect(draftContent).toContain("tagNormalizationApplied: true");
    expect(draftContent).toContain("tagSuggestion.selectedTags: Moved unknown tag to suggestions.");
    expect(draftContent).not.toContain("sk-secret-value");
    expect(draftContent).toContain("[REDACTED]");
    expect(cache.saved[0].status).toBe("saved_as_draft");
  });

  it("can save a cached v2 session as draft without reading or writing the source note", async () => {
    const store = new ProposalSessionStore(5);
    const cache = createSessionCacheV2([createSessionV2({ id: "cached-session" })]);
    let wroteSourceNote = false;
    let draftContent = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        throw new Error("should not read source note");
      },
      async writeNote() {
        wroteSourceNote = true;
      },
      async writeDraft(_path, content) {
        draftContent = content;
      },
    };

    const useCase = new SaveDraftUseCase(store, noteFilePort, {
      draftFolder: "80_Runtime/refine-drafts",
    }, cache);

    await expect(useCase.executeV2("cached-session")).resolves.toMatchObject({
      saved: true,
    });
    expect(wroteSourceNote).toBe(false);
    expect(draftContent).toContain("source note path: 10_Raw/v2.md");
  });
});
