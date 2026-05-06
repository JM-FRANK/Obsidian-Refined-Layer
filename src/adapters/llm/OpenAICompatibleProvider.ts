import type { SecretStore } from "../obsidian/ObsidianSecretStore";
import type { TokenUsageReport } from "../../core/proposal/TokenUsageReport";
import type { LlmProvider, LlmRequest, LlmResponse } from "./LlmProvider";
import { toSafeErrorMessage } from "../../runtime/redaction";

interface OpenAICompatibleProviderOptions {
  secretStore: SecretStore;
  providerId?: string;
  model: string;
  secretRef?: string;
  baseUrl?: string;
  requiresApiKey?: boolean;
}

export class OpenAICompatibleProvider implements LlmProvider {
  readonly providerId: string;
  readonly model: string;
  private readonly endpoint: string;
  private readonly requiresApiKey: boolean;

  constructor(private readonly options: OpenAICompatibleProviderOptions) {
    this.providerId = options.providerId ?? "openai-compatible";
    this.model = options.model;
    this.endpoint = resolveChatCompletionsEndpoint(options.baseUrl ?? "https://api.openai.com/v1");
    this.requiresApiKey = options.requiresApiKey ?? true;
  }

  async generateProposal(request: LlmRequest): Promise<LlmResponse> {
    const apiKey = this.options.secretRef
      ? this.options.secretStore.getSecret(this.options.secretRef)
      : null;

    if (this.requiresApiKey && !apiKey) {
      throw new Error("API key is missing for the configured Key ID.");
    }

    if (apiKey && this.options.secretRef && apiKey.trim() === this.options.secretRef.trim()) {
      throw new Error(
        `The stored value for Key ID "${this.options.secretRef}" appears to be the Key ID itself. ` +
        "Please re-enter your real API key in Settings → API Key.",
      );
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: request.systemPrompt,
          },
          {
            role: "user",
            content: request.userPrompt,
          },
        ],
      }),
    }).catch((error) => {
      throw new Error(toSafeErrorMessage(error));
    });

    const payload = await response.json().catch(() => {
      throw new Error("Provider returned a non-JSON response.");
    }) as any;

    if (!response.ok) {
      throw new Error(toSafeErrorMessage(payload?.error?.message ?? response.statusText));
    }

    const rawText = String(payload?.choices?.[0]?.message?.content ?? "");
    return {
      rawText,
      parsedJson: tryParseJson(rawText),
      usage: normalizeUsage(payload?.usage, this.providerId, this.model),
    };
  }
}

function normalizeUsage(usage: any, providerId: string, model: string): TokenUsageReport | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    provider: providerId,
    model,
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
    outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
    countingMode: "actual",
    generatedAt: new Date().toISOString(),
  };
}

function tryParseJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    return undefined;
  }
}

function resolveChatCompletionsEndpoint(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}
