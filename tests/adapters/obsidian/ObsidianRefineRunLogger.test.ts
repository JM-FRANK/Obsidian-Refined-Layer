import { describe, expect, it } from "vitest";

import {
  ObsidianRefineRunLogger,
  REFINE_RUN_LOG_PATH,
} from "../../../src/adapters/obsidian/ObsidianRefineRunLogger";

class MemoryVaultAdapter {
  files = new Map<string, string>();
  directories = new Set<string>();
  appendCalls = 0;
  readCalls = 0;

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  async mkdir(path: string): Promise<void> {
    this.directories.add(path);
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async append(path: string, content: string): Promise<void> {
    this.appendCalls += 1;
    this.files.set(path, `${this.files.get(path) ?? ""}${content}`);
  }

  async read(path: string): Promise<string> {
    this.readCalls += 1;
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

describe("ObsidianRefineRunLogger", () => {
  it("appends JSONL events without read-and-rewrite churn", async () => {
    const adapter = new MemoryVaultAdapter();
    const logger = new ObsidianRefineRunLogger(makePlugin(adapter), "refine-run-test");

    await logger.write({
      runId: "refine-run-test",
      timestamp: "2026-05-07T00:00:00.000Z",
      event: "run-start",
      elapsedMs: 0,
      deltaMs: 0,
      provider: "mock",
      model: "mock",
      profileId: "default",
      profileName: "Default",
      resultKind: "started",
    });
    await logger.write({
      runId: "refine-run-test",
      timestamp: "2026-05-07T00:00:01.000Z",
      event: "run-end",
      elapsedMs: 1000,
      deltaMs: 1000,
      provider: "mock",
      model: "mock",
      profileId: "default",
      profileName: "Default",
      resultKind: "created-v2",
    });

    const written = adapter.files.get(`${REFINE_RUN_LOG_PATH}/refine-run-test.jsonl`);
    expect(written?.trim().split("\n")).toHaveLength(2);
    expect(adapter.appendCalls).toBe(1);
    expect(adapter.readCalls).toBe(0);
  });
});
