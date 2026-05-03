import { describe, expect, it } from "vitest";

import { TokenUsageReporter } from "../../src/runtime/TokenUsageReporter";

describe("TokenUsageReporter", () => {
  it("keeps provider usage as actual when available", () => {
    const reporter = new TokenUsageReporter();
    const usage = reporter.resolveUsage({
      provider: "openai-compatible",
      model: "gpt-test",
      inputText: "input",
      outputText: "output",
      providerUsage: {
        provider: "openai-compatible",
        model: "gpt-test",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        countingMode: "actual",
        generatedAt: "2026-05-04T00:00:00.000Z",
      },
    });

    expect(usage.countingMode).toBe("actual");
    expect(usage.totalTokens).toBe(30);
  });

  it("estimates token usage when provider usage is unavailable", () => {
    const reporter = new TokenUsageReporter();
    const usage = reporter.resolveUsage({
      provider: "openai-compatible",
      model: "gpt-test",
      inputText: "12345678",
      outputText: "1234",
    });

    expect(usage.countingMode).toBe("estimated");
    expect(usage.totalTokens).toBeGreaterThan(0);
  });
});
