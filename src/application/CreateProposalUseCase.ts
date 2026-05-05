import type { LlmProvider, LlmResponse } from "../adapters/llm/LlmProvider";
import { BlockExtractor } from "../core/markdown/BlockExtractor";
import { parseFrontmatter } from "../core/profile/FrontmatterParser";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";
import { PromptBuilder } from "../core/prompt/PromptBuilder";
import { ProposalNormalizer } from "../core/proposal/ProposalNormalizer";
import { ProposalValidator } from "../core/proposal/ProposalValidator";
import { hashText } from "../core/protected-region/hash";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import type { ProposalSession, ProposalSessionV2 } from "../runtime/ProposalSession";
import { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import { toSafeErrorMessage } from "../runtime/redaction";
import { TokenUsageReporter } from "../runtime/TokenUsageReporter";
import type { RawRefinedWorkflowSettings } from "../settings/PluginSettings";
import type { ActiveNoteRepository } from "./CheckEligibilityUseCase";
import { CheckEligibilityUseCase, type CheckEligibilityResult } from "./CheckEligibilityUseCase";
import type { ProposalValidationError } from "../core/proposal/ProposalValidator";

export type CreateProposalResult =
  | {
      kind: "eligibility-failed";
      eligibility: CheckEligibilityResult;
    }
  | {
      kind: "provider-failed";
      message: string;
    }
  | {
      kind: "validation-failed";
      errors: ProposalValidationError[];
    }
  | {
      kind: "created";
      session: ProposalSession;
    };

export type CreateProposalV2Result =
  | {
      kind: "eligibility-failed";
      eligibility: CheckEligibilityResult;
    }
  | {
      kind: "provider-failed";
      message: string;
    }
  | {
      kind: "validation-failed";
      errors: ProposalValidationError[];
    }
  | {
      kind: "created-v2";
      session: ProposalSessionV2;
    };

interface PromptOverride {
  enabled: boolean;
  systemPrompt?: string;
  userPrompt?: string;
}

export class CreateProposalUseCase {
  private readonly eligibilityUseCase: CheckEligibilityUseCase;
  private readonly proposalValidator: ProposalValidator;
  private readonly protectedRegionExtractor: ProtectedRegionExtractor;
  private readonly tokenUsageReporter = new TokenUsageReporter();
  private readonly blockExtractor = new BlockExtractor();

  constructor(
    private readonly noteRepository: ActiveNoteRepository,
    private readonly profile: WorkflowProfile,
    private readonly llmProvider: LlmProvider,
    private readonly sessionStore: ProposalSessionStore,
    private readonly settings: RawRefinedWorkflowSettings,
    private readonly promptOverride?: PromptOverride,
  ) {
    this.eligibilityUseCase = new CheckEligibilityUseCase(noteRepository, profile, settings);
    this.proposalValidator = new ProposalValidator(profile);
    this.protectedRegionExtractor = new ProtectedRegionExtractor();
  }

  // ── v0.1.0 compat path ──

  async execute(): Promise<CreateProposalResult> {
    const activeNote = await this.eligibilityUseCase.execute();

    if (!activeNote.hasActiveMarkdownNote || !activeNote.eligible) {
      return {
        kind: "eligibility-failed",
        eligibility: activeNote,
      };
    }

    const lookup = await this.noteRepository.getActiveNote();
    if (lookup.kind !== "markdown") {
      return {
        kind: "eligibility-failed",
        eligibility: activeNote,
      };
    }

    const protectedRegionResult = this.protectedRegionExtractor.extract(
      lookup.note.content,
      this.profile.protectedRegions.definitions[0],
    );

    if (!protectedRegionResult.ok) {
      return {
        kind: "validation-failed",
        errors: [
          {
            layer: "content",
            code: protectedRegionResult.error.code,
            message: protectedRegionResult.error.message,
          },
        ],
      };
    }

    const variables: Record<string, string> = {
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      noteContent: lookup.note.content,
    };
    const systemPrompt = renderPromptTemplate(
      this.promptOverride?.enabled && this.promptOverride.systemPrompt
        ? this.promptOverride.systemPrompt
        : this.profile.prompt.systemPrompt,
      variables,
    );
    const userPrompt = renderPromptTemplate(
      this.promptOverride?.enabled && this.promptOverride.userPrompt
        ? this.promptOverride.userPrompt
        : this.profile.prompt.userPrompt,
      variables,
    );

    let llmResponse;
    try {
      llmResponse = await this.llmProvider.generateProposal({
        workflowProfileId: "raw-refined",
        notePath: lookup.note.path,
        noteTitle: lookup.note.title,
        noteContent: lookup.note.content,
        systemPrompt,
        userPrompt,
        promptVariables: {
          notePath: lookup.note.path,
          noteTitle: lookup.note.title,
          noteContent: lookup.note.content,
        },
      });
    } catch (error) {
      return {
        kind: "provider-failed",
        message: toSafeErrorMessage(error),
      };
    }

    const validation = this.proposalValidator.validateModelOutput(llmResponse.rawText, {
      protectedRegionText: protectedRegionResult.region.text,
    });

    if (!validation.ok) {
      return {
        kind: "validation-failed",
        errors: validation.errors,
      };
    }

    const parsedFrontmatter = parseFrontmatter(lookup.note.content);
    const now = new Date().toISOString();
    const session: ProposalSession = {
      id: createSessionId(),
      workflowProfileId: "raw-refined",
      policySnapshotId: `${this.profile.id}:${this.profile.version}`,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      createdAt: now,
      updatedAt: now,
      baseFileHash: hashText(lookup.note.content),
      ...(parsedFrontmatter.hasFrontmatter
        ? { baseFrontmatterHash: hashText(JSON.stringify(parsedFrontmatter.frontmatter)) }
        : {}),
      baseProtectedRegionHash: hashText(protectedRegionResult.region.text),
      proposal: validation.proposal,
      tokenUsage: this.tokenUsageReporter.resolveUsage({
        provider: this.llmProvider.providerId,
        model: this.llmProvider.model,
        inputText: `${systemPrompt}\n${userPrompt}`,
        outputText: llmResponse.rawText,
        providerUsage: llmResponse.usage,
      }),
      status: "generated",
    };

    await this.sessionStore.save(session);

    return {
      kind: "created",
      session,
    };
  }

  // ── v0.2.0 pipeline ──

  async executeV2(): Promise<CreateProposalV2Result> {
    // 1. Eligibility check
    const activeNote = await this.eligibilityUseCase.execute();
    if (!activeNote.hasActiveMarkdownNote || !activeNote.eligible) {
      return { kind: "eligibility-failed", eligibility: activeNote };
    }

    const lookup = await this.noteRepository.getActiveNote();
    if (lookup.kind !== "markdown") {
      return { kind: "eligibility-failed", eligibility: activeNote };
    }

    // 2. Extract B block for hash and boundary info
    const bBlockExtract = this.blockExtractor.extract(
      lookup.note.content,
      this.settings.bBlock,
    );
    if (!bBlockExtract.ok) {
      return {
        kind: "validation-failed",
        errors: [{
          layer: "content",
          code: bBlockExtract.error.code,
          message: bBlockExtract.error.message,
        }],
      };
    }

    // 3. Build structured prompt via PromptBuilder
    const promptBuilder = new PromptBuilder();
    const { request, debugSnapshot: _debug } = promptBuilder.build({
      provider: this.llmProvider.providerId,
      model: this.llmProvider.model,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      noteContent: lookup.note.content,
      aBlocks: this.settings.aBlocks.filter((b) => b.enabled),
      tagWhitelist: this.settings.tagWhitelist,
      tagPrompt: this.settings.tagPrompt,
    });
    void _debug; // available for observability in future phases

    // 4. Call provider (v0.2 path)
    if (!this.llmProvider.generateProposalV2) {
      return { kind: "provider-failed", message: "Provider does not support v0.2 proposal generation." };
    }

    let llmResponse: LlmResponse;
    try {
      llmResponse = await this.llmProvider.generateProposalV2(request);
    } catch (error) {
      return { kind: "provider-failed", message: toSafeErrorMessage(error) };
    }

    // 5. JSON extraction + Zod validation
    const zodValidation = this.proposalValidator.validateV2Output(llmResponse.rawText);
    if (!zodValidation.ok) {
      return { kind: "validation-failed", errors: zodValidation.errors };
    }

    // 6. Normalization (A block ordering, unknown id rejection, tag normalization)
    const normalizer = new ProposalNormalizer();
    const normalized = normalizer.normalize(zodValidation.proposal, this.settings);

    if (normalized.validation.status === "invalid") {
      return {
        kind: "validation-failed",
        errors: [{
          layer: "schema",
          code: "normalization-invalid",
          message: "Proposal normalization resulted in invalid status: no acceptable blocks.",
        }],
      };
    }

    // 7. Build ProposalSessionV2
    // Note: session storage (session-cache) will be wired in Phase 12.
    // For now, the session is returned directly without persisting to the
    // v0.1 ProposalSessionStore.
    const parsedFrontmatter = parseFrontmatter(lookup.note.content);
    const now = new Date().toISOString();

    const session: ProposalSessionV2 = {
      id: createSessionId(),
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      createdAt: now,
      updatedAt: now,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      baseFileHash: hashText(lookup.note.content),
      ...(parsedFrontmatter.hasFrontmatter
        ? { baseFrontmatterHash: hashText(JSON.stringify(parsedFrontmatter.frontmatter)) }
        : {}),
      baseBBlockHash: bBlockExtract.block.hash,
      blockConfigSnapshot: {
        protectH1: this.settings.protectH1,
        aBlocks: this.settings.aBlocks,
        bBlock: this.settings.bBlock,
        tagWhitelist: this.settings.tagWhitelist,
      },
      proposal: {
        workflowProfileId: "raw-refined",
        schemaVersion: "0.2",
        blocks: normalized.blocks,
        tagSuggestion: normalized.tagSuggestion.selectedTags.length > 0 || normalized.tagSuggestion.newTagSuggestions.length > 0
          ? normalized.tagSuggestion
          : undefined,
        frontmatterSuggestion: normalized.frontmatterSuggestion,
      },
      validation: normalized.validation,
      tokenUsage: this.tokenUsageReporter.resolveUsage({
        provider: this.llmProvider.providerId,
        model: this.llmProvider.model,
        inputText: request.messages.map((m) => m.content).join("\n"),
        outputText: llmResponse.rawText,
        providerUsage: llmResponse.usage,
      }),
      status: "generated",
      source: {
        provider: this.llmProvider.providerId,
        model: this.llmProvider.model,
        attemptsUsed: 1,
      },
    };

    return { kind: "created-v2", session };
  }
}

function createSessionId(): string {
  return `proposal-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (_match, name) => {
    return variables[name] ?? `{{${name}}}`;
  });
}
