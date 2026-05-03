export interface TokenUsageReport {
  provider: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  countingMode: "actual" | "estimated" | "unavailable";
}
