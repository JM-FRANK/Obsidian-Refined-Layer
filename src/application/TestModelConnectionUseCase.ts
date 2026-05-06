import type { LlmProvider } from "../adapters/llm/LlmProvider";
import type { SecretStore } from "../adapters/obsidian/ObsidianSecretStore";
import { toSafeErrorMessage } from "../runtime/redaction";
import type { ProviderSettings, ProviderType } from "../settings/ProviderConfig";

export type TestModelConnectionCode =
  | "success"
  | "secret-storage-unavailable"
  | "key-id-missing"
  | "key-read-failed"
  | "key-value-polluted"
  | "model-missing"
  | "base-url-missing"
  | "provider-failed"
  | "invalid-model-response";

export interface TestModelConnectionResult {
  ok: boolean;
  code: TestModelConnectionCode;
  message: string;
}

export interface TestModelConnectionProviderPreset {
  requiresSecret: boolean;
  allowsBaseUrlEdit: boolean;
}

export class TestModelConnectionUseCase {
  constructor(
    private readonly provider: LlmProvider,
    private readonly secretStore: SecretStore,
  ) {}

  async execute(
    providerConfig: ProviderSettings,
    providerPreset: TestModelConnectionProviderPreset,
  ): Promise<TestModelConnectionResult> {
    const providerName = providerConfig.type;

    if (providerName !== "mock" && !providerConfig.model?.trim()) {
      return failure("model-missing", `${providerName} model is missing.`);
    }

    if (providerPreset.allowsBaseUrlEdit && !providerConfig.baseUrl?.trim()) {
      return failure("base-url-missing", `${providerName} API base URL is missing.`);
    }

    if (providerPreset.requiresSecret) {
      const keyId = providerConfig.secretRef?.trim() ?? "";
      if (!this.secretStore.isAvailable()) {
        return failure("secret-storage-unavailable", "SecretStorage is unavailable.");
      }
      if (!keyId) {
        return failure("key-id-missing", "Key ID is missing.");
      }

      let value: string | null;
      try {
        value = this.secretStore.getSecret(keyId);
      } catch (error) {
        return failure("key-read-failed", toSafeErrorMessage(error));
      }

      if (!value) {
        return failure("key-read-failed", "No API key is stored for the configured Key ID.");
      }

      if (value.trim() === keyId) {
        return failure("key-value-polluted", "The stored value equals the configured Key ID.");
      }
    }

    try {
      const response = await this.provider.generateProposal({
        workflowProfileId: "raw-refined",
        notePath: "__connection_test__.md",
        noteTitle: "Connection test",
        noteContent: "",
        systemPrompt: "You are testing model connectivity. Return any short valid response.",
        userPrompt: "Connection test only. Do not use user note content.",
        promptVariables: {
          notePath: "__connection_test__.md",
          noteTitle: "Connection test",
          noteContent: "",
        },
      });

      if (!response || typeof response.rawText !== "string" || response.rawText.trim().length === 0) {
        return failure("invalid-model-response", "Provider returned an empty or invalid response.");
      }

      return {
        ok: true,
        code: "success",
        message: `${formatProvider(providerName)} connection succeeded.`,
      };
    } catch (error) {
      return failure("provider-failed", toSafeErrorMessage(error));
    }
  }
}

function failure(code: Exclude<TestModelConnectionCode, "success">, message: string): TestModelConnectionResult {
  return {
    ok: false,
    code,
    message,
  };
}

function formatProvider(provider: ProviderType): string {
  return provider === "mock" ? "Mock provider" : provider;
}
