import { describe, expect, it } from "vitest";

import { BuildApplyPlanUseCase } from "../../src/application/BuildApplyPlanUseCase";
import { SaveDraftUseCase } from "../../src/application/SaveDraftUseCase";
import type { NoteFilePort } from "../../src/application/ports/NoteFilePort";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
import type { ProposalSession } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";

function createSession(): ProposalSession {
  return {
    id: "session-55",
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
    },
    status: "generated",
  };
}

describe("Phase 5.5 editable review body", () => {
  it("builds apply plan from edited refined sections", async () => {
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
    const result = await useCase.execute("session-55", {
      acceptBody: true,
      editedRefinedSections: {
        summary: "edited summary",
        coreQuestion: "edited question",
        currentConclusion: "edited conclusion",
        reasoning: "edited reasoning",
      },
      acceptFrontmatter: {},
      acceptTags: {},
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected apply plan");
    }
    expect(result.plan.operations[0]).toMatchObject({
      type: "replace-refined-body",
    });
    expect((result.plan.operations[0] as any).body).toContain("edited summary");
  });

  it("rejects edited refined sections that include the protected heading", async () => {
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
    await expect(useCase.execute("session-55", {
      acceptBody: true,
      editedRefinedSections: {
        summary: "## 原始内容\nbad",
        coreQuestion: "question",
        currentConclusion: "conclusion",
        reasoning: "reasoning",
      },
      acceptFrontmatter: {},
      acceptTags: {},
    })).resolves.toEqual({
      ok: false,
      code: "protected-heading-in-proposal",
      message: "Proposal must not include the protected heading ## 原始内容.",
    });
  });

  it("saves edited refined sections into draft content", async () => {
    const store = new ProposalSessionStore(5);
    await store.save(createSession());
    let content = "";
    const noteFilePort: NoteFilePort = {
      async readNoteByPath() {
        return null;
      },
      async writeNote() {
        throw new Error("not used");
      },
      async writeDraft(_path, draftContent) {
        content = draftContent;
      },
    };

    const useCase = new SaveDraftUseCase(store, noteFilePort, {
      draftFolder: "80_Runtime/refine-drafts",
    });
    await useCase.execute("session-55", undefined, {
      summary: "edited summary",
      coreQuestion: "edited question",
      currentConclusion: "edited conclusion",
      reasoning: "edited reasoning",
    });

    expect(content).toContain("edited summary");
    expect(content).not.toContain("### summary\nsummary");
  });
});
