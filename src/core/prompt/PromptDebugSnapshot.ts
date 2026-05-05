/**
 * Captures the structured LLM request for prompt observability.
 * Must NOT contain API key, Authorization header, provider secret,
 * or unredacted provider errors.
 */
export interface PromptDebugSnapshot {
  provider: string;
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  schemaName: string;
  schemaVersion: string;
  metadata: {
    workflowProfileId: "raw-refined";
    requestId: string;
    aBlockIds: string[];
    tagWhitelist: string[];
    notePath: string;
    noteTitle: string;
  };
}

/**
 * Structured LLM request produced by PromptBuilder.
 * The caller passes this to the LLM provider.
 */
export interface LlmRequestV2 {
  provider: string;
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  schemaName: string;
  schemaVersion: string;
  metadata: {
    workflowProfileId: "raw-refined";
    requestId: string;
  };
}
