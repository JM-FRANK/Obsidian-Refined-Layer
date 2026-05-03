export interface TokenUsageReport {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  countingMode: "actual" | "estimated" | "mixed" | "unavailable";
  generatedAt: string;
}
