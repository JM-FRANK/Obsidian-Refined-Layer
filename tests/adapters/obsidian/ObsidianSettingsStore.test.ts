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
      },
      promptOverrides: {},
    });
  });
});
