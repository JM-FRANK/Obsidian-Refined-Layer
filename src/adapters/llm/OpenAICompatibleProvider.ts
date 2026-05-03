import type { SecretStore } from "../obsidian/ObsidianSecretStore";
import type { TokenUsageReport } from "../../core/proposal/TokenUsageReport";
import type { LlmProvider, LlmRequest, LlmResponse } from "./LlmProvider";
import { toSafeErrorMessage } from "../../runtime/redaction";

interface OpenAICompatibleProviderOptions {
  secretStore: SecretStore;
  secretRef: string;
  model: string;
  endpoint?: string;
}

export class OpenAICompatibleProvider implements LlmProvider {
  readonly providerId = "openai-compatible";
  readonly model: string;
  private readonly endpoint: string;

  constructor(private readonly options: OpenAICompatibleProviderOptions) {
    this.model = options.model;
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/chat/completions";
  }

  async generateProposal(request: LlmRequest): Promise<LlmResponse> {
    const apiKey = this.options.secretStore.getSecret(this.options.secretRef);
    if (!apiKey) {
      throw new Error("API key is missing for the configured secret reference.");
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      usage: normalizeUsage(payload?.usage, this.model),
    };
  }
}

function normalizeUsage(usage: any, model: string): TokenUsageReport | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    provider: "openai-compatible",
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
