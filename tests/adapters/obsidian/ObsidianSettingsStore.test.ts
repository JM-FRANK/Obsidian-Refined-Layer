import { describe, expect, it } from "vitest";

import { ObsidianSettingsStore } from "../../../src/adapters/obsidian/ObsidianSettingsStore";

describe("ObsidianSettingsStore", () => {
  it("does not persist raw secret values into plugin data", async () => {
    let savedValue: unknown;
    const plugin = {
      async loadData() {
        return {};
      },
      async saveData(value: unknown) {
        savedValue = value;
      },
    };

    const store = new ObsidianSettingsStore(plugin as any);
    await store.save({
      language: "zh-CN",
      historyLimit: 5,
      draftFolder: "80_Runtime/refine-drafts",
      provider: {
        type: "openai-compatible",
        model: "gpt-4.1-mini",
        secretRef: "obsidian-refined-layer-openai",
        baseUrl: "https://api.openai.com/v1",
        // @ts-expect-error intentional bypass attempt
        apiKey: "sk-secret",
      },
      promptOverrides: {},
    });

    expect(JSON.stringify(savedValue)).not.toContain("sk-secret");
    expect(savedValue).toEqual({
      language: "zh-CN",
      historyLimit: 5,
      draftFolder: "80_Runtime/refine-drafts",
      provider: {
        type: "openai-compatible",
        model: "gpt-4.1-mini",
        secretRef: "obsidian-refined-layer-openai",
        baseUrl: "https://api.openai.com/v1",
      },
      promptOverrides: {},
    });
  });

  it("persists local provider baseUrl without forcing a secret reference", async () => {
    let savedValue: unknown;
    const plugin = {
      async loadData() {
        return {};
      },
      async saveData(value: unknown) {
        savedValue = value;
      },
    };

    const store = new ObsidianSettingsStore(plugin as any);
    await store.save({
      language: "zh-CN",
      historyLimit: 5,
      draftFolder: "80_Runtime/refine-drafts",
      provider: {
        type: "local-openai-compatible",
        model: "qwen2.5:7b",
        baseUrl: "http://127.0.0.1:11434/v1",
      },
      promptOverrides: {},
    });

    expect(savedValue).toEqual({
      language: "zh-CN",
      historyLimit: 5,
      draftFolder: "80_Runtime/refine-drafts",
      provider: {
        type: "local-openai-compatible",
        model: "qwen2.5:7b",
        baseUrl: "http://127.0.0.1:11434/v1",
      },
      promptOverrides: {},
    });
  });
});
