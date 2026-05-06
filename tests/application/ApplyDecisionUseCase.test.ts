import { describe, expect, it } from "vitest";

import { ApplyDecisionUseCase } from "../../src/application/ApplyDecisionUseCase";
import type { NoteFilePort } from "../../src/application/ports/NoteFilePort";
import type { ApplyPlan } from "../../src/core/apply/ApplyPlan";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
import { hashText } from "../../src/core/protected-region/hash";
import type { ProposalSession, ProposalSessionV2 } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";
import type { SessionCacheV2Store } from "../../src/runtime/SessionCacheV2Store";

function createSession(content: string): ProposalSession {
  return createSessionWithProtectedRegion(content, "## 原始内容\nraw text\n");
}

function createSessionWithProtectedRegion(content: string, protectedRegionText: string): ProposalSession {
  return {
    id: "session-1",
    workflowProfileId: "raw-refined",
    policySnapshotId: "raw-refined:0.1.0",
    notePath: "10_Raw/example.md",
    noteTitle: "example",
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
    baseFileHash: hashText(content),
    baseProtectedRegionHash: hashText(protectedRegionText),
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
        add: ["#ai/generated", "#rel/test"],
      },
    },
    status: "generated",
  };
}

function createSessionV2(content: string, overrides: Partial<ProposalSessionV2> = {}): ProposalSessionV2 {
  return {
    id: "session-v2",
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    createdAt: "2026-05-06T00:00:00.000Z",
    updatedAt: "2026-05-06T00:00:00.000Z",
    notePath: "10_Raw/example.md",
    noteTitle: "example",
    baseFileHash: hashText(content),
    baseBBlockHash: hashText("## 原始内容\nraw text"),
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

function createSessionCacheV2(sessions: ProposalSessionV2[]): SessionCacheV2Store & { saved: ProposalSessionV2[] } {
  const saved: ProposalSessionV2[] = [];
  return {
    saved,
    async save(session: ProposalSessionV2) {
      saved.push(session);
      const index = sessions.findIndex((item) => item.id === session.id);
      if (index === -1) sessions.push(session);
      else sessions[index] = session;
    },
    async loadAll() {
      return sessions;
    },
    async getLatestForNote() {
      return sessions[0] ?? null;
    },
  };
}

describe("ApplyDecisionUseCase", () => {
  it("applies body, frontmatter, and allowed tags while preserving the protected region", async () => {
    const initialContent = "---\nstatus: raw\ncreated: 2025-01-01\ncustom: keep\n---\n## 原始内容\nraw text\n";
    const store = new ProposalSessionStore(5);
    await store.save(createSession(initialContent));
    let writtenContent = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return {
          path: "10_Raw/example.md",
          title: "example",
          content: initialContent,
        };
      },
      async writeNote(_path, content) {
        writtenContent = content;
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [
        {
          type: "replace-refined-body",
          targetPath: "10_Raw/example.md",
          body: "## 摘要\nsummary\n\n## 原始内容\nraw text\n",
        },
        {
          type: "update-frontmatter",
          targetPath: "10_Raw/example.md",
          changes: {
            status: "refined",
            source: ["self"],
            context: ["ctx/a"],
          },
        },
        {
          type: "update-tags",
          targetPath: "10_Raw/example.md",
          add: ["#ai/generated", "#rel/test"],
          remove: [],
        },
      ],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    await expect(useCase.execute(plan)).resolves.toEqual({
      kind: "applied",
      notePath: "10_Raw/example.md",
    });
    expect(writtenContent).toContain("status: refined");
    expect(writtenContent).toContain("created: 2025-01-01");
    expect(writtenContent).toContain("custom: keep");
    expect(writtenContent).toContain("tags:\n  - #ai/generated");
    expect(writtenContent).not.toContain("#rel/test");
    expect(writtenContent).toContain("## 原始内容\nraw text\n");
  });

  it("blocks apply when the file has changed since proposal generation", async () => {
    const oldContent = "---\nstatus: raw\n---\n## 原始内容\nraw text\n";
    const changedContent = "---\nstatus: raw\n---\n## 原始内容\nchanged raw text\n";
    const store = new ProposalSessionStore(5);
    await store.save(createSession(oldContent));
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return {
          path: "10_Raw/example.md",
          title: "example",
          content: changedContent,
        };
      },
      async writeNote() {
        throw new Error("should not write on conflict");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute({
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [],
    });

    expect(result).toEqual({
      kind: "conflict",
      reason: "file-changed",
      options: ["save-draft", "regenerate", "manual-copy", "discard"],
    });
    await expect(store.get("session-1")).resolves.toMatchObject({
      status: "conflicted",
    });
  });

  it("preserves the H1 heading when it exists before the protected region", async () => {
    const initialContent = "---\nstatus: raw\n---\n# My Document Title\n\nSome intro text\n\n## 原始内容\nraw text\n";
    const store = new ProposalSessionStore(5);
    await store.save(createSession(initialContent));
    let writtenContent = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: initialContent };
      },
      async writeNote(_path, content) {
        writtenContent = content;
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [
        {
          type: "replace-refined-body",
          targetPath: "10_Raw/example.md",
          body: "## 摘要\nsummary\n\n## 原始内容\nraw text\n",
        },
      ],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute(plan);

    expect(result).toEqual({ kind: "applied", notePath: "10_Raw/example.md" });
    expect(writtenContent).toContain("# My Document Title");
    expect(writtenContent).toContain("## 摘要\nsummary");
    expect(writtenContent).toContain("## 原始内容\nraw text\n");
    const h1Count = [...writtenContent.matchAll(/^# /gm)].length;
    expect(h1Count).toBe(1);
  });

  it("does NOT auto-generate an H1 when the note has no H1", async () => {
    const initialContent = "---\nstatus: raw\n---\n## 原始内容\nraw text\n";
    const store = new ProposalSessionStore(5);
    await store.save(createSession(initialContent));
    let writtenContent = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: initialContent };
      },
      async writeNote(_path, content) {
        writtenContent = content;
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [
        {
          type: "replace-refined-body",
          targetPath: "10_Raw/example.md",
          body: "## 摘要\nsummary\n\n## 原始内容\nraw text\n",
        },
      ],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute(plan);

    expect(result).toEqual({ kind: "applied", notePath: "10_Raw/example.md" });
    expect(writtenContent).not.toMatch(/^# /m);
    expect(writtenContent).toContain("## 摘要\nsummary");
    expect(writtenContent).toContain("## 原始内容\nraw text\n");
  });

  it("preserves the protected region text byte-for-byte including exact newlines", async () => {
    const protectedRegionText = "## 原始内容\nline1\nline2\nline3\n";
    const initialContent = `---\nstatus: raw\n---\n# Title\n\n${protectedRegionText}`;
    const store = new ProposalSessionStore(5);
    await store.save(createSessionWithProtectedRegion(initialContent, protectedRegionText));
    let writtenContent = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: initialContent };
      },
      async writeNote(_path, content) {
        writtenContent = content;
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [
        {
          type: "replace-refined-body",
          targetPath: "10_Raw/example.md",
          body: "## 摘要\nsummary\n\n## 原始内容\nline1\nline2\nline3\n",
        },
      ],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute(plan);

    expect(result).toEqual({ kind: "applied", notePath: "10_Raw/example.md" });
    expect(writtenContent).toContain("## 原始内容\nline1\nline2\nline3\n");
    expect(writtenContent.endsWith("line3\n")).toBe(true);
  });

  it("rejects apply when the protected region heading is missing from the note", async () => {
    const initialContent = "---\nstatus: raw\n---\n# Title\n\nno protected heading here\n";
    const store = new ProposalSessionStore(5);
    await store.save(createSession(initialContent));
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: initialContent };
      },
      async writeNote() {
        throw new Error("should not write");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [
        {
          type: "replace-refined-body",
          targetPath: "10_Raw/example.md",
          body: "## 摘要\nsummary\n\n## 原始内容\nstale\n",
        },
      ],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute(plan);

    expect(result).toMatchObject({
      kind: "failed",
      code: "missing-heading",
    });
  });

  it("rejects apply when the protected heading appears multiple times", async () => {
    const initialContent = "---\nstatus: raw\n---\n## 原始内容\nfirst\n\n## 原始内容\nsecond\n";
    const store = new ProposalSessionStore(5);
    await store.save(createSession(initialContent));
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: initialContent };
      },
      async writeNote() {
        throw new Error("should not write");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [{ type: "replace-refined-body", targetPath: "10_Raw/example.md", body: "## 摘要\ns\n\n## 原始内容\nfirst\n" }],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute(plan);

    expect(result).toMatchObject({
      kind: "failed",
      code: "multiple-heading",
    });
  });

  it("rejects apply when the protected region is empty", async () => {
    const initialContent = "---\nstatus: raw\n---\n## 原始内容\n";
    const store = new ProposalSessionStore(5);
    await store.save(createSession(initialContent));
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: initialContent };
      },
      async writeNote() {
        throw new Error("should not write");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [{ type: "replace-refined-body", targetPath: "10_Raw/example.md", body: "## 摘要\ns\n\n## 原始内容\n" }],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute(plan);

    expect(result).toMatchObject({
      kind: "failed",
      code: "empty-protected-region",
    });
  });

  it("rejects apply when the protected region hash has changed while the file hash is the same", async () => {
    const content = "---\nstatus: raw\n---\n## 原始内容\nprotected text\n";
    const store = new ProposalSessionStore(5);
    // Create a session with a deliberately incorrect baseProtectedRegionHash
    // to simulate a stale session where the protected region was corrupted
    await store.save({
      ...createSessionWithProtectedRegion(content, "## 原始内容\nprotected text\n"),
      baseProtectedRegionHash: hashText("## 原始内容\ndifferent text\n"),
    });
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content };
      },
      async writeNote() {
        throw new Error("should not write on conflict");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-1",
      notePath: "10_Raw/example.md",
      operations: [],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, store, noteFilePort);
    const result = await useCase.execute(plan);

    expect(result).toEqual({
      kind: "conflict",
      reason: "protected-region-changed",
      options: ["save-draft", "regenerate", "manual-copy", "discard"],
    });
  });
});

describe("ApplyDecisionUseCase v2", () => {
  it("applies replace-refined-blocks and append-tags while preserving B block byte-for-byte", async () => {
    const initialContent = "---\nstatus: raw\ntags:\n  - #todo/review\n---\n# Title\n\n## 原始内容\nraw text";
    const session = createSessionV2(initialContent);
    const cache = createSessionCacheV2([session]);
    let writtenContent = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: initialContent };
      },
      async writeNote(_path, content) {
        writtenContent = content;
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };
    const plan: ApplyPlan = {
      sessionId: "session-v2",
      notePath: "10_Raw/example.md",
      operations: [
        {
          type: "replace-refined-blocks",
          targetPath: "10_Raw/example.md",
          blocks: [
            { id: "summary", heading: "摘要", headingLevel: 2, content: "Summary." },
            { id: "reasoning", heading: "推理", headingLevel: 2, content: "Reasoning." },
          ],
        },
        {
          type: "append-tags",
          targetPath: "10_Raw/example.md",
          tags: ["#ai/generated", "#todo/review", "#new/idea"],
        },
      ],
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, new ProposalSessionStore(5), noteFilePort, cache);
    await expect(useCase.executeV2(plan)).resolves.toEqual({
      kind: "applied",
      notePath: "10_Raw/example.md",
    });

    expect(writtenContent).toContain("# Title");
    expect(writtenContent).toContain("## 摘要\n\nSummary.");
    expect(writtenContent).toContain("## 推理\n\nReasoning.");
    expect(writtenContent).toContain("## 原始内容\nraw text");
    expect(writtenContent).toContain("tags:\n  - #todo/review\n  - #ai/generated");
    expect(writtenContent).not.toContain("#new/idea");
    expect(cache.saved[0].status).toBe("applied");
  });

  it("returns file-changed conflict before writing when current file hash differs", async () => {
    const initialContent = "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nraw text";
    const changedContent = "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nchanged";
    const session = createSessionV2(initialContent);
    const cache = createSessionCacheV2([session]);
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: changedContent };
      },
      async writeNote() {
        throw new Error("should not write");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, new ProposalSessionStore(5), noteFilePort, cache);
    await expect(useCase.executeV2({ sessionId: "session-v2", notePath: "10_Raw/example.md", operations: [] })).resolves.toEqual({
      kind: "conflict",
      reason: "file-changed",
      options: ["save-draft", "regenerate", "manual-copy", "discard"],
    });
    expect(cache.saved[0].status).toBe("conflicted");
  });

  it("returns protected-region-changed conflict when B block hash differs", async () => {
    const initialContent = "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nraw text";
    const session = createSessionV2(initialContent, {
      baseBBlockHash: hashText("## 原始内容\nother text"),
    });
    const cache = createSessionCacheV2([session]);
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return { path: "10_Raw/example.md", title: "example", content: initialContent };
      },
      async writeNote() {
        throw new Error("should not write");
      },
      async writeDraft() {
        throw new Error("not used");
      },
    };

    const useCase = new ApplyDecisionUseCase(rawRefinedProfile, new ProposalSessionStore(5), noteFilePort, cache);
    await expect(useCase.executeV2({ sessionId: "session-v2", notePath: "10_Raw/example.md", operations: [] })).resolves.toEqual({
      kind: "conflict",
      reason: "protected-region-changed",
      options: ["save-draft", "regenerate", "manual-copy", "discard"],
    });
  });
});
