import type { TokenUsageReport } from "../core/proposal/TokenUsageReport";

export class TokenUsageReporter {
  resolveUsage(options: {
    provider: string;
    model: string;
    inputText: string;
    outputText: string;
    providerUsage?: TokenUsageReport;
  }): TokenUsageReport {
    const { provider, model, inputText, outputText, providerUsage } = options;

    if (providerUsage) {
      return {
        ...providerUsage,
        provider: providerUsage.provider || provider,
        model: providerUsage.model || model,
        countingMode: "actual",
        generatedAt: providerUsage.generatedAt || new Date().toISOString(),
      };
    }

    try {
      const inputTokens = estimateTokenCount(inputText);
      const outputTokens = estimateTokenCount(outputText);

      return {
        provider,
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        countingMode: "estimated",
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        provider,
        model,
        countingMode: "unavailable",
        generatedAt: new Date().toISOString(),
      };
    }
  }
}

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
