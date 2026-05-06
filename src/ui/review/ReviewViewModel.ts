import type { UserDecision, UserDecisionV2 } from "../../core/review/UserDecision";
import type { RefinedSections } from "../../core/proposal/Proposal";
import type { ProposalSession, ProposalSessionV2 } from "../../runtime/ProposalSession";
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

export interface ReviewABlockViewModel {
  id: string;
  heading: string;
  headingLevel: number;
  content: string;
  warnings: string[];
  accepted: boolean;
}

export interface ReviewSelectedTagViewModel {
  tag: string;
  accepted: boolean;
}

export interface ReviewViewModelV2 {
  sessionId: string;
  workflowProfileId: "raw-refined";
  profileId?: string;
  profileName?: string;
  schemaVersion: "0.2";
  notePath: string;
  noteTitle: string;
  blocks: ReviewABlockViewModel[];
  frontmatterSuggestions: Array<{
    field: "status" | "source" | "context";
    value: string;
  }>;
  selectedTags: ReviewSelectedTagViewModel[];
  newTagSuggestions: string[];
  tagNormalizationApplied: boolean;
  validationWarnings: string[];
  rejectedFields: Array<{
    field: string;
    reason: string;
    value?: unknown;
  }>;
  attemptsUsed: number;
  tokenUsage: ReviewViewModel["tokenUsage"];
  initialDecision: UserDecisionV2;
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

export function createReviewViewModelV2(session: ProposalSessionV2): ReviewViewModelV2 {
  const frontmatterSuggestions: ReviewViewModelV2["frontmatterSuggestions"] = [];
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

  const configById = new Map(
    session.blockConfigSnapshot.aBlocks.map((block) => [block.id, block]),
  );

  const configuredOrder = new Map(
    session.blockConfigSnapshot.aBlocks.map((block) => [block.id, block.order]),
  );

  const blocks = [...session.proposal.blocks]
    .sort((a, b) => (configuredOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (configuredOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    .map((block): ReviewABlockViewModel => {
      const config = configById.get(block.id);
      return {
        id: block.id,
        heading: config?.heading ?? block.id,
        headingLevel: config?.headingLevel ?? 2,
        content: block.content,
        warnings: block.warnings ?? [],
        accepted: false,
      };
    });

  const selectedTags = (session.proposal.tagSuggestion?.selectedTags ?? []).map((tag) => ({
    tag,
    accepted: false,
  }));

  const acceptBlocks = Object.fromEntries(blocks.map((block) => [block.id, false]));

  return {
    sessionId: session.id,
    workflowProfileId: session.workflowProfileId,
    profileId: session.profileSnapshot?.id,
    profileName: session.profileSnapshot?.name,
    schemaVersion: session.schemaVersion,
    notePath: session.notePath,
    noteTitle: session.noteTitle,
    blocks,
    frontmatterSuggestions,
    selectedTags,
    newTagSuggestions: session.proposal.tagSuggestion?.newTagSuggestions ?? [],
    tagNormalizationApplied: session.validation.tagNormalizationApplied || session.proposal.tagNormalizationApplied === true,
    validationWarnings: [
      ...(session.validation.warnings ?? []),
      ...(session.proposal.warnings ?? []),
    ],
    rejectedFields: session.validation.rejectedFields,
    attemptsUsed: session.source.attemptsUsed,
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
      acceptBlocks,
      acceptFrontmatter: {
        ...(suggestion?.status ? { status: false } : {}),
        ...(suggestion?.source ? { source: false } : {}),
        ...(suggestion?.context ? { context: false } : {}),
      },
      acceptTags: {
        add: [],
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
