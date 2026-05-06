import { describe, expect, it, vi } from "vitest";

import type { LlmProvider } from "../../src/adapters/llm/LlmProvider";
import type { SecretStore } from "../../src/adapters/obsidian/ObsidianSecretStore";
import { TestModelConnectionUseCase } from "../../src/application/TestModelConnectionUseCase";
import type { ProviderSettings } from "../../src/settings/ProviderConfig";

function createProvider(overrides: Partial<LlmProvider> = {}): LlmProvider {
  return {
    providerId: "mock-llm",
    model: "mock-gpt",
    generateProposal: vi.fn(async () => ({ rawText: "ok" })),
    ...overrides,
  };
}

function createSecretStore(options: {
  available?: boolean;
  value?: string | null;
  throws?: boolean;
} = {}): SecretStore {
  return {
    isAvailable: () => options.available ?? true,
    setSecret: vi.fn(),
    getSecret: vi.fn(() => {
      if (options.throws) throw new Error("read failed sk-secret-value");
      return options.value === undefined ? "real-api-key" : options.value;
    }),
  };
}

const mockConfig: ProviderSettings = { type: "mock" };
const remoteConfig: ProviderSettings = {
  type: "openai-compatible",
  model: "gpt-test",
  secretRef: "obsidian-refined-layer-openai",
};

describe("TestModelConnectionUseCase", () => {
  it("tests mock provider with a minimal request that contains no real note content", async () => {
    const provider = createProvider();
    const useCase = new TestModelConnectionUseCase(provider, createSecretStore());

    const result = await useCase.execute(mockConfig, {
      requiresSecret: false,
      allowsBaseUrlEdit: false,
    });

    expect(result).toMatchObject({ ok: true, code: "success" });
    expect(provider.generateProposal).toHaveBeenCalledWith(expect.objectContaining({
      notePath: "__connection_test__.md",
      noteTitle: "Connection test",
      noteContent: "",
    }));
  });

  it("reports SecretStorage unavailable before calling the provider", async () => {
    const provider = createProvider();
    const useCase = new TestModelConnectionUseCase(provider, createSecretStore({ available: false }));

    const result = await useCase.execute(remoteConfig, {
      requiresSecret: true,
      allowsBaseUrlEdit: false,
    });

    expect(result).toMatchObject({ ok: false, code: "secret-storage-unavailable" });
    expect(provider.generateProposal).not.toHaveBeenCalled();
  });

  it("reports missing Key ID before calling the provider", async () => {
    const provider = createProvider();
    const useCase = new TestModelConnectionUseCase(provider, createSecretStore());

    const result = await useCase.execute({ ...remoteConfig, secretRef: "" }, {
      requiresSecret: true,
      allowsBaseUrlEdit: false,
    });

    expect(result).toMatchObject({ ok: false, code: "key-id-missing" });
    expect(provider.generateProposal).not.toHaveBeenCalled();
  });

  it("keeps the D35 polluted Key ID defense", async () => {
    const provider = createProvider();
    const useCase = new TestModelConnectionUseCase(provider, createSecretStore({
      value: "obsidian-refined-layer-openai",
    }));

    const result = await useCase.execute(remoteConfig, {
      requiresSecret: true,
      allowsBaseUrlEdit: false,
    });

    expect(result).toMatchObject({ ok: false, code: "key-value-polluted" });
    expect(provider.generateProposal).not.toHaveBeenCalled();
  });

  it("redacts provider failures", async () => {
    const provider = createProvider({
      generateProposal: vi.fn(async () => {
        throw new Error("bad Authorization: Bearer sk-secret-value");
      }),
    });
    const useCase = new TestModelConnectionUseCase(provider, createSecretStore());

    const result = await useCase.execute(remoteConfig, {
      requiresSecret: true,
      allowsBaseUrlEdit: false,
    });

    expect(result).toMatchObject({ ok: false, code: "provider-failed" });
    expect(result.message).not.toContain("sk-secret-value");
    expect(result.message).not.toContain("Bearer");
  });
});
