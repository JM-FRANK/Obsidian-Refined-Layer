import { describe, expect, it } from "vitest";

import { DEFAULT_PLUGIN_SETTINGS } from "../../../src/settings/PluginSettings";
import { ObsidianSettingsStore } from "../../../src/adapters/obsidian/ObsidianSettingsStore";

function fullSettings(overrides: Record<string, unknown> = {}) {
  return { ...DEFAULT_PLUGIN_SETTINGS, ...overrides };
}

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
    await store.save(fullSettings({
      provider: {
        type: "openai-compatible" as const,
        model: "gpt-4.1-mini",
        secretRef: "obsidian-refined-layer-openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-secret",
      },
    }));

    expect(JSON.stringify(savedValue)).not.toContain("sk-secret");
    const s = savedValue as Record<string, unknown>;
    const provider = s.provider as Record<string, unknown>;
    expect(provider.apiKey).toBeUndefined();
    expect(provider.api_key).toBeUndefined();
    // Legitimate provider fields pass through
    expect(provider.type).toBe("openai-compatible");
    expect(provider.secretRef).toBe("obsidian-refined-layer-openai");
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
    await store.save(fullSettings({
      provider: {
        type: "local-openai-compatible" as const,
        model: "qwen2.5:7b",
        baseUrl: "http://127.0.0.1:11434/v1",
      },
    }));

    const s = savedValue as Record<string, unknown>;
    const provider = s.provider as Record<string, unknown>;
    expect(provider.type).toBe("local-openai-compatible");
    expect(provider.model).toBe("qwen2.5:7b");
    expect(provider.baseUrl).toBe("http://127.0.0.1:11434/v1");
  });

  it("sanitize includes v0.2.0 fields but blocks secrets", async () => {
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
    await store.save(fullSettings({
      provider: {
        type: "openai-compatible" as const,
        secretRef: "my-key",
        token: "bearer-token-value",
      },
    }));

    const s = savedValue as Record<string, unknown>;
    // v0.2.0 fields present
    expect(s.rawRefined).toBeDefined();
    expect(s.sessionCache).toBeDefined();
    expect(s.errorSessionCache).toBeDefined();
    // Secrets blocked
    expect(JSON.stringify(savedValue)).not.toContain("bearer-token-value");
    const provider = s.provider as Record<string, unknown>;
    expect(provider.token).toBeUndefined();
    expect(provider.apiKey).toBeUndefined();
  });

  it("migrates historyLimit to sessionCache.limit on load", async () => {
    const plugin = {
      async loadData() {
        return { historyLimit: 10 };
      },
      async saveData(_value: unknown) {},
    };

    const store = new ObsidianSettingsStore(plugin as any);
    const loaded = await store.load();

    expect(loaded.sessionCache.limit).toBe(10);
    expect(loaded.historyLimit).toBe(10);
  });

  it("sessionCache in data takes precedence over historyLimit migration", async () => {
    const plugin = {
      async loadData() {
        return { historyLimit: 10, sessionCache: { limit: 7 } };
      },
      async saveData(_value: unknown) {},
    };

    const store = new ObsidianSettingsStore(plugin as any);
    const loaded = await store.load();

    expect(loaded.sessionCache.limit).toBe(7);
  });
});
