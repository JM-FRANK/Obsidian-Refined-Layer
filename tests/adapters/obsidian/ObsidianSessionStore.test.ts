import { describe, expect, it } from "vitest";

import type { ProposalSession } from "../../../src/runtime/ProposalSession";
import { containsSecretPattern } from "../../../src/adapters/obsidian/ObsidianSessionStore";

function makeSession(override: Partial<ProposalSession> = {}): ProposalSession {
  return {
    id: "s1",
    workflowProfileId: "raw-refined",
    policySnapshotId: "raw-refined:0.1.0",
    notePath: "test/note.md",
    noteTitle: "note",
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
    baseFileHash: "abc123",
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
    ...override,
  };
}

function serializeSession(session: ProposalSession): string {
  return JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    sessionsByNotePath: {
      [session.notePath]: [
        {
          id: session.id,
          workflowProfileId: session.workflowProfileId,
          policySnapshotId: session.policySnapshotId,
          notePath: session.notePath,
          noteTitle: session.noteTitle,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          baseFileHash: session.baseFileHash,
          baseFrontmatterHash: session.baseFrontmatterHash,
          baseProtectedRegionHash: session.baseProtectedRegionHash,
          proposal: session.proposal,
          tokenUsage: session.tokenUsage,
          status: session.status,
          decision: session.decision,
        },
      ],
    },
  });
}

describe("ObsidianSessionStore secret scan", () => {
  it("rejects payload containing apiKey field", () => {
    const json = JSON.stringify({
      version: 1,
      updatedAt: "",
      sessionsByNotePath: {},
      apiKey: "sk-secret-value",
    });
    expect(containsSecretPattern(json)).toBe(true);
  });

  it("rejects payload containing authorization field", () => {
    const json = JSON.stringify({
      version: 1,
      updatedAt: "",
      sessionsByNotePath: {},
      authorization: "Bearer token",
    });
    expect(containsSecretPattern(json)).toBe(true);
  });

  it("rejects payload containing secret field", () => {
    const json = JSON.stringify({
      version: 1,
      updatedAt: "",
      sessionsByNotePath: {},
      secret: "my-secret",
    });
    expect(containsSecretPattern(json)).toBe(true);
  });

  it("rejects payload containing rawResponse field", () => {
    const json = JSON.stringify({
      version: 1,
      updatedAt: "",
      sessionsByNotePath: {},
      providerRawResponse: "full llm text here",
    });
    expect(containsSecretPattern(json)).toBe(true);
  });

  it("rejects nested sensitive field in proposal", () => {
    const json = JSON.stringify({
      version: 1,
      updatedAt: "",
      sessionsByNotePath: {
        "note.md": [
          {
            ...makeSession(),
            apiKey: "sk-nested-secret",
          },
        ],
      },
    });
    expect(containsSecretPattern(json)).toBe(true);
  });

  it("allows token usage fields (not mistaken for secrets)", () => {
    const session = makeSession({
      tokenUsage: {
        provider: "test",
        model: "test",
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        countingMode: "actual",
        generatedAt: "2026-05-04T00:00:00.000Z",
      },
    });
    const json = serializeSession(session);
    expect(containsSecretPattern(json)).toBe(false);
  });

  it("allows valid session payload", () => {
    const session = makeSession();
    const json = serializeSession(session);
    expect(containsSecretPattern(json)).toBe(false);
  });

  it("rejects invalid JSON as containing secrets", () => {
    expect(containsSecretPattern("not valid json {{{")).toBe(true);
  });

  it("detects credential field nested in object", () => {
    const json = JSON.stringify({
      version: 1,
      updatedAt: "",
      sessionsByNotePath: {
        "note.md": [
          {
            id: "s1",
            config: {
              credential: "secret-value",
            },
          },
        ],
      },
    });
    expect(containsSecretPattern(json)).toBe(true);
  });
});
