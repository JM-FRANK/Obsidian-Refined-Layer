import { describe, expect, it } from "vitest";

import { BodyAssembler } from "../../../src/core/apply/BodyAssembler";
import { rawRefinedProfile } from "../../../src/core/profile/rawRefinedProfile";
import type { ProposalSession } from "../../../src/runtime/ProposalSession";

const protectedRegionDef = rawRefinedProfile.protectedRegions.definitions[0];

function createSession(overrides: Partial<ProposalSession> = {}): ProposalSession {
  return {
    id: "session-1",
    workflowProfileId: "raw-refined",
    policySnapshotId: "raw-refined:0.1.0",
    notePath: "10_Raw/example.md",
    noteTitle: "example",
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
    baseFileHash: "file-hash",
    baseProtectedRegionHash: "region-hash",
    proposal: {
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: "summary text",
        coreQuestion: "question text",
        currentConclusion: "conclusion text",
        reasoning: "reasoning text",
      },
    },
    status: "generated",
    ...overrides,
  };
}

describe("BodyAssembler", () => {
  const assembler = new BodyAssembler();

  it("assembles body with refined sections followed by the protected region text", () => {
    const session = createSession();
    const currentContent = "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nprotected text here\n";
    const result = assembler.assemble(session, protectedRegionDef, currentContent);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected ok");
    }
    expect(result.protectedRegionText).toBe("## 原始内容\nprotected text here\n");
    expect(result.body).toContain("summary text");
    expect(result.body).toContain("question text");
    expect(result.body).toContain("conclusion text");
    expect(result.body).toContain("reasoning text");
    expect(result.body.endsWith("protected text here\n")).toBe(true);
    expect(result.body).toContain("## 原始内容");
  });

  it("uses custom refinedSections when provided", () => {
    const session = createSession();
    const currentContent = "---\nstatus: raw\n---\n## 原始内容\nprotected\n";
    const customSections = {
      summary: "custom summary",
      coreQuestion: "custom question",
      currentConclusion: "custom conclusion",
      reasoning: "custom reasoning",
      scope: "custom scope",
    };
    const result = assembler.assemble(session, protectedRegionDef, currentContent, customSections);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected ok");
    }
    expect(result.body).toContain("custom summary");
    expect(result.body).toContain("custom scope");
    expect(result.body).not.toContain("summary text");
  });

  it("rejects empty protected region text", () => {
    const session = createSession();
    const currentContent = "---\nstatus: raw\n---\n## 原始内容\n\n";
    const result = assembler.assemble(session, protectedRegionDef, currentContent);

    expect(result.ok).toBe(false);
  });

  it("returns error when the protected region heading is missing", () => {
    const session = createSession();
    const currentContent = "---\nstatus: raw\n---\n# no protected heading\n";
    const result = assembler.assemble(session, protectedRegionDef, currentContent);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected error");
    }
    expect(result.error.code).toBe("missing-heading");
  });

  it("preserves the exact protected region text byte-for-byte including newlines", () => {
    const session = createSession();
    const currentContent = "---\nstatus: raw\n---\n## 原始内容\nline1\nline2\nline3\n";
    const result = assembler.assemble(session, protectedRegionDef, currentContent);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected ok");
    }
    expect(result.body.endsWith("line1\nline2\nline3\n")).toBe(true);
  });
});
