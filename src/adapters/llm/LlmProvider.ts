import type { TokenUsageReport } from "../../core/proposal/TokenUsageReport";

export interface LlmRequest {
  workflowProfileId: "raw-refined";
  notePath: string;
  noteTitle: string;
  noteContent: string;
  promptVariables: {
    notePath: string;
    noteTitle: string;
    noteContent: string;
  };
}

export interface LlmResponse {
  rawText: string;
  parsedJson?: unknown;
  usage?: TokenUsageReport;
}

export interface LlmProvider {
  generateProposal(request: LlmRequest): Promise<LlmResponse>;
}
