import type { RawRefinedProposal } from "../../core/proposal/Proposal";
import type { LlmProvider, LlmRequest, LlmResponse } from "./LlmProvider";

export class MockLlmProvider implements LlmProvider {
  readonly providerId = "mock-llm";
  readonly model = "mock-gpt";

  async generateProposal(request: LlmRequest): Promise<LlmResponse> {
    const proposal: RawRefinedProposal = {
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: `这是对 ${request.noteTitle} 的 mock 摘要。`,
        coreQuestion: "当前笔记需要澄清哪些关键问题？",
        currentConclusion: "当前内容可整理为更清晰的提案结构。",
        reasoning: "mock-llm 返回固定结构化提案，后续阶段再接入真实 provider。",
        refineNote: "本提案仅用于验证 review-first 流程的结构正确性。",
      },
      frontmatterSuggestion: {
        status: "refined",
        context: ["mock/refined-layer"],
      },
      tagSuggestion: {
        add: ["#ai/generated"],
      },
      warnings: ["mock proposal"],
    };

    return {
      rawText: JSON.stringify(proposal, null, 2),
      parsedJson: proposal,
      usage: {
        provider: this.providerId,
        model: this.model,
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
        countingMode: "actual",
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
