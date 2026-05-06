import type { LlmProvider, LlmResponse } from "../adapters/llm/LlmProvider";
import { BlockExtractor } from "../core/markdown/BlockExtractor";
import { parseFrontmatter } from "../core/profile/FrontmatterParser";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";
import { PromptBuilder } from "../core/prompt/PromptBuilder";
import type { LlmRequestV2 } from "../core/prompt/PromptDebugSnapshot";
import { ProposalNormalizer } from "../core/proposal/ProposalNormalizer";
import { ProposalValidator } from "../core/proposal/ProposalValidator";
import { hashText } from "../core/protected-region/hash";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import type { ProposalSession, ProposalSessionV2, FailedAttemptRecord } from "../runtime/ProposalSession";
import { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import { toSafeErrorMessage } from "../runtime/redaction";
import { TokenUsageReporter } from "../runtime/TokenUsageReporter";
import type { RawRefinedWorkflowSettings } from "../settings/PluginSettings";
import type { ActiveNoteRepository } from "./CheckEligibilityUseCase";
import { CheckEligibilityUseCase, type CheckEligibilityResult } from "./CheckEligibilityUseCase";
import type { ProposalValidationError } from "../core/proposal/ProposalValidator";
import {
  RetryAttemptRunner,
  type AttemptIndex,
  type SingleAttemptResult,
} from "./RetryAttemptRunner";
import type { ErrorSessionCacheStore } from "../runtime/ErrorSessionCacheStore";
import type { SessionCacheV2Store } from "../runtime/SessionCacheV2Store";
import type { TokenUsageReport } from "../core/proposal/TokenUsageReport";

export interface V2NoticePlan {
  attemptsUsed: number;
  maxAttempts: number;
  errorCacheWritten: boolean;
  errorCacheDisabled: boolean;
}

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
      kind: "validation-failed";
      errors: ProposalValidationError[];
    }
  | {
      kind: "exhausted";
      failedAttempts: FailedAttemptRecord[];
      noticePlan: V2NoticePlan;
    }
  | {
      kind: "created-v2";
      session: ProposalSessionV2;
      noticePlan: V2NoticePlan;
    };

interface PromptOverride {
  enabled: boolean;
  systemPrompt?: string;
  userPrompt?: string;
}

interface AttemptContext {
  request: LlmRequestV2;
  noteContent: string;
  notePath: string;
  noteTitle: string;
  bBlockText: string;
  errorSessionId: string;
}

export class CreateProposalUseCase {
  private readonly eligibilityUseCase: CheckEligibilityUseCase;
  private readonly proposalValidator: ProposalValidator;
  private readonly protectedRegionExtractor: ProtectedRegionExtractor;
  private readonly tokenUsageReporter = new TokenUsageReporter();
  private readonly blockExtractor = new BlockExtractor();
  private readonly retryRunner: RetryAttemptRunner;
  private readonly errorSessionCache?: ErrorSessionCacheStore;
  private readonly sessionCacheV2?: SessionCacheV2Store;

  constructor(
    private readonly noteRepository: ActiveNoteRepository,
    private readonly profile: WorkflowProfile,
    private readonly llmProvider: LlmProvider,
    private readonly sessionStore: ProposalSessionStore,
    private readonly settings: RawRefinedWorkflowSettings,
    private readonly promptOverride?: PromptOverride,
    errorSessionCache?: ErrorSessionCacheStore,
    sessionCacheV2?: SessionCacheV2Store,
  ) {
    this.eligibilityUseCase = new CheckEligibilityUseCase(noteRepository, profile, settings);
    this.proposalValidator = new ProposalValidator(profile);
    this.protectedRegionExtractor = new ProtectedRegionExtractor();
    this.retryRunner = new RetryAttemptRunner();
    this.errorSessionCache = errorSessionCache;
    this.sessionCacheV2 = sessionCacheV2;
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

  // ── v0.2.0 pipeline (retry + session/error cache) ──

  async executeV2(): Promise<CreateProposalV2Result> {
    // 1. Eligibility check (not retried)
    const activeNote = await this.eligibilityUseCase.execute();
    if (!activeNote.hasActiveMarkdownNote || !activeNote.eligible) {
      return { kind: "eligibility-failed", eligibility: activeNote };
    }

    const lookup = await this.noteRepository.getActiveNote();
    if (lookup.kind !== "markdown") {
      return { kind: "eligibility-failed", eligibility: activeNote };
    }

    // 2. B block extraction (not retried — configuration issue)
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

    // 3. Build prompt (once — reused across retries)
    if (!this.llmProvider.generateProposalV2) {
      return {
        kind: "validation-failed",
        errors: [{
          layer: "schema",
          code: "v2-not-supported",
          message: "Provider does not support v0.2 proposal generation.",
        }],
      };
    }

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
    void _debug;

    // Error session ID groups all failed attempts from this run
    const errorSessionId = `error-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const ctx: AttemptContext = {
      request,
      noteContent: lookup.note.content,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      bBlockText: bBlockExtract.block.text,
      errorSessionId,
    };

    // 4. Retry loop
    const retryResult = await this.retryRunner.run(async (attemptIndex) => {
      return this.runSingleAttempt(ctx, attemptIndex);
    });

    // 5. Persist and return based on retry outcome
    if (retryResult.status === "success") {
      return this.handleRetrySuccess(retryResult.session, retryResult.failedAttempts, retryResult.attemptsUsed);
    }

    return this.handleRetryExhausted(retryResult.failedAttempts);
  }

  private async runSingleAttempt(
    ctx: AttemptContext,
    attemptIndex: AttemptIndex,
  ): Promise<SingleAttemptResult> {
    // 4a. Call provider
    let llmResponse: LlmResponse;
    try {
      llmResponse = await this.llmProvider.generateProposalV2!(ctx.request);
    } catch (error) {
      const failedAttempt = this.buildFailedAttempt(
        ctx, attemptIndex,
        `Provider call failed: ${toSafeErrorMessage(error)}`,
        undefined,
        undefined,
        {},
      );
      return { success: false, attempt: failedAttempt };
    }

    // 4b. JSON extraction + Zod validation
    const zodValidation = this.proposalValidator.validateV2Output(llmResponse.rawText);
    if (!zodValidation.ok) {
      const failedAttempt = this.buildFailedAttempt(
        ctx, attemptIndex,
        "Zod validation failed: proposal does not match v0.2 schema.",
        llmResponse,
        llmResponse.usage,
        { zodError: zodValidation.zodError },
      );
      return { success: false, attempt: failedAttempt };
    }

    // 4c. Normalization
    const normalizer = new ProposalNormalizer();
    const normalized = normalizer.normalize(zodValidation.proposal, this.settings);

    if (normalized.validation.status === "invalid") {
      const failedAttempt = this.buildFailedAttempt(
        ctx, attemptIndex,
        "Normalization invalid: no acceptable blocks after filtering.",
        llmResponse,
        llmResponse.usage,
        { normalizationReport: normalized.validation },
      );
      return { success: false, attempt: failedAttempt };
    }

    // 4d. Build successful ProposalSessionV2
    const parsedFrontmatter = parseFrontmatter(ctx.noteContent);
    const now = new Date().toISOString();

    const session: ProposalSessionV2 = {
      id: createSessionId(),
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      createdAt: now,
      updatedAt: now,
      notePath: ctx.notePath,
      noteTitle: ctx.noteTitle,
      baseFileHash: hashText(ctx.noteContent),
      ...(parsedFrontmatter.hasFrontmatter
        ? { baseFrontmatterHash: hashText(JSON.stringify(parsedFrontmatter.frontmatter)) }
        : {}),
      baseBBlockHash: hashText(ctx.bBlockText),
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
        inputText: ctx.request.messages.map((m) => m.content).join("\n"),
        outputText: llmResponse.rawText,
        providerUsage: llmResponse.usage,
      }),
      status: "generated",
      source: {
        provider: this.llmProvider.providerId,
        model: this.llmProvider.model,
        attemptsUsed: attemptIndex,
      },
    };

    return { success: true, session };
  }

  private buildFailedAttempt(
    ctx: AttemptContext,
    attemptIndex: AttemptIndex,
    errorSummary: string,
    llmResponse?: LlmResponse,
    providerUsage?: TokenUsageReport,
    validationSnapshotOverrides?: Record<string, unknown>,
  ): FailedAttemptRecord {
    const responseSnapshot = llmResponse
      ? {
          rawText: llmResponse.rawText,
          extractedJsonText: undefined as string | undefined,
          parsedJson: llmResponse.parsedJson,
          usage: providerUsage ?? llmResponse.usage,
        }
      : undefined;

    return {
      id: `${ctx.errorSessionId}-attempt-${attemptIndex}`,
      errorSessionId: ctx.errorSessionId,
      attemptIndex,
      createdAt: new Date().toISOString(),
      provider: this.llmProvider.providerId,
      model: this.llmProvider.model,
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      notePath: ctx.notePath,
      noteTitle: ctx.noteTitle,
      blockConfigSnapshot: {
        protectH1: this.settings.protectH1,
        aBlocks: this.settings.aBlocks,
        bBlock: this.settings.bBlock,
        tagWhitelist: this.settings.tagWhitelist,
      },
      requestSnapshot: {
        messages: ctx.request.messages,
        schemaName: ctx.request.schemaName,
        schemaVersion: ctx.request.schemaVersion,
        metadata: ctx.request.metadata as Record<string, unknown>,
      },
      responseSnapshot,
      validationSnapshot: validationSnapshotOverrides
        ? {
            jsonExtractionError: typeof validationSnapshotOverrides.jsonExtractionError === "string"
              ? validationSnapshotOverrides.jsonExtractionError
              : undefined,
            zodError: validationSnapshotOverrides.zodError,
            normalizationReport: validationSnapshotOverrides.normalizationReport,
            policyErrors: validationSnapshotOverrides.policyErrors,
          }
        : undefined,
      errorSummary,
    };
  }

  private async handleRetrySuccess(
    session: ProposalSessionV2,
    failedAttempts: FailedAttemptRecord[],
    attemptsUsed: AttemptIndex,
  ): Promise<CreateProposalV2Result> {
    let errorCacheWritten = false;

    if (failedAttempts.length > 0 && this.errorSessionCache) {
      for (const attempt of failedAttempts) {
        await this.errorSessionCache.save(attempt);
      }
      errorCacheWritten = true;
    }

    if (this.sessionCacheV2) {
      await this.sessionCacheV2.save(session);
    }

    const noticePlan: V2NoticePlan = {
      attemptsUsed,
      maxAttempts: 3,
      errorCacheWritten,
      errorCacheDisabled: !this.errorSessionCache,
    };

    return { kind: "created-v2", session, noticePlan };
  }

  private async handleRetryExhausted(
    failedAttempts: FailedAttemptRecord[],
  ): Promise<CreateProposalV2Result> {
    let errorCacheWritten = false;

    if (this.errorSessionCache) {
      for (const attempt of failedAttempts) {
        await this.errorSessionCache.save(attempt);
      }
      errorCacheWritten = true;
    }

    const noticePlan: V2NoticePlan = {
      attemptsUsed: 3,
      maxAttempts: 3,
      errorCacheWritten,
      errorCacheDisabled: !this.errorSessionCache,
    };

    return { kind: "exhausted", failedAttempts, noticePlan };
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
