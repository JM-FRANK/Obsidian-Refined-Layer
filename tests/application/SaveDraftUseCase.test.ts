import { describe, expect, it } from "vitest";

import { SaveDraftUseCase } from "../../src/application/SaveDraftUseCase";
import type { NoteFilePort } from "../../src/application/ports/NoteFilePort";
import type { ProposalSession } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";

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
});
