import { describe, expect, it } from "vitest";

import { BuildApplyPlanUseCase } from "../../src/application/BuildApplyPlanUseCase";
import type { NoteFilePort } from "../../src/application/ports/NoteFilePort";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
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
