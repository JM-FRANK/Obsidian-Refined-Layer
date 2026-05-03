import type { UserDecision } from "../../core/review/UserDecision";
import type { RefinedSections } from "../../core/proposal/Proposal";
import type { ProposalSession } from "../../runtime/ProposalSession";
import {
  buildRefinedBodyPreview,
  SECTION_HEADINGS,
  type RefinedSectionKey,
} from "../../core/apply/RefinedBodyFormatter";

export interface EditableRefinedSection {
  key: RefinedSectionKey;
  heading: string;
  content: string;
  required: boolean;
}

export interface ReviewViewModel {
  sessionId: string;
  workflowProfileId: "raw-refined";
  notePath: string;
  noteTitle: string;
  bodyPreview: string;
  editableRefinedSections: EditableRefinedSection[];
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

  const editableRefinedSections = buildEditableSections(session.proposal.refinedSections);

  return {
    sessionId: session.id,
    workflowProfileId: session.workflowProfileId,
    notePath: session.notePath,
    noteTitle: session.noteTitle,
    bodyPreview: buildRefinedBodyPreview(session.proposal.refinedSections),
    editableRefinedSections,
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
      editedRefinedSections: {
        ...session.proposal.refinedSections,
      },
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

function buildEditableSections(refinedSections: RefinedSections): EditableRefinedSection[] {
  const keys: RefinedSectionKey[] = [
    "summary",
    "coreQuestion",
    "currentConclusion",
    "reasoning",
    "scope",
    "nextSteps",
    "refineNote",
  ];

  return keys
    .filter((key) => refinedSections[key] !== undefined)
    .map((key) => ({
      key,
      heading: SECTION_HEADINGS[key],
      content: refinedSections[key] ?? "",
      required: key === "summary" || key === "coreQuestion" || key === "currentConclusion" || key === "reasoning",
    }));
}
