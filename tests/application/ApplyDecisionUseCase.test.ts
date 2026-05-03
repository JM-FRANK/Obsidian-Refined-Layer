import { describe, expect, it } from "vitest";

import { ApplyDecisionUseCase } from "../../src/application/ApplyDecisionUseCase";
import type { NoteFilePort } from "../../src/application/ports/NoteFilePort";
import type { ApplyPlan } from "../../src/core/apply/ApplyPlan";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
import { hashText } from "../../src/core/protected-region/hash";
import type { ProposalSession } from "../../src/runtime/ProposalSession";
import { ProposalSessionStore } from "../../src/runtime/ProposalSessionStore";

function createSession(content: string): ProposalSession {
  return {
    id: "session-1",
    workflowProfileId: "raw-refined",
    policySnapshotId: "raw-refined:0.1.0",
    notePath: "10_Raw/example.md",
    noteTitle: "example",
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
    baseFileHash: hashText(content),
    baseProtectedRegionHash: hashText("## 原始内容\nraw text\n"),
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
});
