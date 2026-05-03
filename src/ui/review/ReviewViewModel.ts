import type { ProposalSession } from "../../runtime/ProposalSession";
import type { UserDecision } from "../../core/review/UserDecision";

export interface ReviewViewModel {
  sessionId: string;
  workflowProfileId: "raw-refined";
  notePath: string;
  noteTitle: string;
  bodyPreview: string;
  frontmatterSuggestions: Array<{
    field: "status" | "source" | "context";
    value: string;
  }>;
  tagSuggestions: {
    add: string[];
    remove: string[];
  };
  warnings: string[];
  tokenUsage: {
    provider: string;
    model: string;
    countingMode: "actual" | "estimated" | "mixed" | "unavailable";
    totalTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    generatedAt: string;
  } | null;
  initialDecision: UserDecision;
}

const SECTION_HEADINGS: Record<keyof ProposalSession["proposal"]["refinedSections"], string> = {
  summary: "## 摘要",
  coreQuestion: "## 核心问题",
  currentConclusion: "## 当前结论",
  reasoning: "## 依据与推理",
  scope: "## 适用边界",
  nextSteps: "## 后续处理",
  refineNote: "## 整理说明",
};

export function createReviewViewModel(session: ProposalSession): ReviewViewModel {
  const frontmatterSuggestions: ReviewViewModel["frontmatterSuggestions"] = [];
  const suggestion = session.proposal.frontmatterSuggestion;

  if (suggestion?.status) {
    frontmatterSuggestions.push({ field: "status", value: suggestion.status });
  }
  if (suggestion?.source) {
    frontmatterSuggestions.push({ field: "source", value: suggestion.source.join(", ") });
  }
  if (suggestion?.context) {
    frontmatterSuggestions.push({ field: "context", value: suggestion.context.join(", ") });
  }

  return {
    sessionId: session.id,
    workflowProfileId: session.workflowProfileId,
    notePath: session.notePath,
    noteTitle: session.noteTitle,
    bodyPreview: buildBodyPreview(session),
    frontmatterSuggestions,
    tagSuggestions: {
      add: session.proposal.tagSuggestion?.add ?? [],
      remove: session.proposal.tagSuggestion?.remove ?? [],
    },
    warnings: session.proposal.warnings ?? [],
    tokenUsage: session.tokenUsage
      ? {
          provider: session.tokenUsage.provider,
          model: session.tokenUsage.model,
          countingMode: session.tokenUsage.countingMode,
          totalTokens: session.tokenUsage.totalTokens,
          inputTokens: session.tokenUsage.inputTokens,
          outputTokens: session.tokenUsage.outputTokens,
          generatedAt: session.tokenUsage.generatedAt,
        }
      : null,
    initialDecision: {
      acceptBody: false,
      acceptFrontmatter: {
        ...(suggestion?.status ? { status: false } : {}),
        ...(suggestion?.source ? { source: false } : {}),
        ...(suggestion?.context ? { context: false } : {}),
      },
      acceptTags: {
        ...(session.proposal.tagSuggestion?.add ? { add: [] } : {}),
        ...(session.proposal.tagSuggestion?.remove ? { remove: [] } : {}),
      },
    },
  };
}

function buildBodyPreview(session: ProposalSession): string {
  const lines: string[] = [];
  const sections = session.proposal.refinedSections;

  for (const key of Object.keys(sections) as Array<keyof typeof sections>) {
    const content = sections[key];
    if (!content) {
      continue;
    }

    lines.push(SECTION_HEADINGS[key]);
    lines.push(content);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
