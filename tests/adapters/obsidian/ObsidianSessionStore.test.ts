import { describe, expect, it } from "vitest";

import type { ProposalSession } from "../../../src/runtime/ProposalSession";
import {
  containsSecretPattern,
  ObsidianSessionStore,
  SESSION_FILE_PATH,
} from "../../../src/adapters/obsidian/ObsidianSessionStore";

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

class MemoryVaultAdapter {
  files = new Map<string, string>();
  directories = new Set<string>();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  async mkdir(path: string): Promise<void> {
    this.directories.add(path);
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async read(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error("File not found");
    return content;
  }
}

function makePlugin(adapter: MemoryVaultAdapter) {
  return {
    app: {
      vault: { adapter },
    },
  } as never;
}

describe("ObsidianSessionStore secret scan", () => {
  it("redacts secret-like string values before writing legacy v1 session-cache", async () => {
    const adapter = new MemoryVaultAdapter();
    const store = new ObsidianSessionStore(makePlugin(adapter));
    const session = makeSession({
      proposal: {
        workflowProfileId: "raw-refined",
        refinedSections: {
          summary: "Authorization: Bearer sk-summary-secret",
          coreQuestion: "question",
          currentConclusion: "conclusion",
          reasoning: "reasoning",
        },
        warnings: ["warning has api_key: 'sk-warning-secret'"],
      },
    });

    await store.saveAll(new Map([[session.notePath, [session]]]));

    const written = adapter.files.get(SESSION_FILE_PATH);
    expect(written).toBeDefined();
    expect(written).not.toContain("sk-summary-secret");
    expect(written).not.toContain("sk-warning-secret");
    expect(written).toContain("[REDACTED]");
    expect(containsSecretPattern(written!)).toBe(false);
  });

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
