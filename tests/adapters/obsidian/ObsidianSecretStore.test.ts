import { describe, expect, it } from "vitest";

import { ObsidianSecretStore } from "../../../src/adapters/obsidian/ObsidianSecretStore";

function createStore(secrets: Record<string, string> = {}) {
  const app = {
    secretStorage: {
      getSecret: (id: string) => secrets[id] ?? null,
      setSecret: (id: string, value: string) => {
        secrets[id] = value;
      },
    },
  };

  return new ObsidianSecretStore(app as never);
}

describe("ObsidianSecretStore diagnostics", () => {
  it("reports configured Key ID readability without exposing the raw key", () => {
    const store = createStore({
      "obsidian-refined-layer-openai": "sk-secret-value",
    });

    const diagnostics = store.getDiagnostics("obsidian-refined-layer-openai");

    expect(diagnostics.configuredKeyIdPresent).toBe(true);
    expect(diagnostics.canReadConfiguredKey).toBe(true);
    expect(diagnostics.readValueEqualsKeyId).toBe(false);
    expect(diagnostics.readValueLength).toBe("sk-secret-value".length);
    expect(JSON.stringify(diagnostics)).not.toContain("sk-secret-value");
  });

  it("reports the D35 polluted value case where the read value equals the Key ID", () => {
    const store = createStore({
      "obsidian-refined-layer-openai": "obsidian-refined-layer-openai",
    });

    const diagnostics = store.getDiagnostics("obsidian-refined-layer-openai");

    expect(diagnostics.canReadConfiguredKey).toBe(true);
    expect(diagnostics.readValueEqualsKeyId).toBe(true);
  });
});
