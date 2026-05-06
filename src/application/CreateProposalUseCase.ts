import type { LlmProvider, LlmResponse } from "../adapters/llm/LlmProvider";
import { BlockExtractor } from "../core/markdown/BlockExtractor";
import { parseFrontmatter } from "../core/profile/FrontmatterParser";
import type { RefineProfile } from "../core/profile/RefineProfile";
import type { WorkflowProfile } from "../core/profile/WorkflowProfile";
import { PromptBuilder } from "../core/prompt/PromptBuilder";
import type { LlmRequestV2, PromptDebugSnapshot } from "../core/prompt/PromptDebugSnapshot";
import { ProposalNormalizer } from "../core/proposal/ProposalNormalizer";
import { ProposalValidator } from "../core/proposal/ProposalValidator";
import { hashText } from "../core/protected-region/hash";
import { ProtectedRegionExtractor } from "../core/protected-region/ProtectedRegionExtractor";
import type { ProposalSession, ProposalSessionV2, FailedAttemptRecord } from "../runtime/ProposalSession";
import { ProposalSessionStore } from "../runtime/ProposalSessionStore";
import { toSafeErrorMessage } from "../runtime/redaction";
import { TokenUsageReporter } from "../runtime/TokenUsageReporter";
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
import type { PromptObservationStore } from "../runtime/PromptObservationStore";
import type { RefineRunLogger } from "./RefineRunLogger";
import type { RefineRunStatusReporter, RefineRunStage } from "./RefineRunStatus";

export interface V2NoticePlan {
  attemptsUsed: number;
  maxAttempts: number;
  errorCacheWritten: boolean;
  errorCacheDisabled: boolean;
  errorCachePath?: string;
}

const ERROR_SESSION_CACHE_DISPLAY_PATH = ".obsidian/plugins/obsidian-refined-layer/error-session-cache/";

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
  debugSnapshot: PromptDebugSnapshot;
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
  private readonly runId: string;
  private readonly runStartedAt = Date.now();
  private lastLogAt = this.runStartedAt;

  constructor(
    private readonly noteRepository: ActiveNoteRepository,
    private readonly profile: WorkflowProfile,
    private readonly llmProvider: LlmProvider,
    private readonly sessionStore: ProposalSessionStore,
    private readonly settings: RefineProfile,
    private readonly promptOverride?: PromptOverride,
    errorSessionCache?: ErrorSessionCacheStore,
    sessionCacheV2?: SessionCacheV2Store,
    private readonly promptObservationStore?: PromptObservationStore,
    private readonly statusReporter?: RefineRunStatusReporter,
    private readonly runLogger?: RefineRunLogger,
    runId?: string,
  ) {
    this.runId = runId ?? createSessionId().replace("proposal-session", "refine-run");
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
    await this.logEvent("run-start", {
      resultKind: "started",
    });

    // 1. Eligibility check (not retried)
    this.reportStatus("checking-eligibility");
    await this.logEvent("stage", { stage: "checking-eligibility" });
    const activeNote = await this.eligibilityUseCase.execute();
    if (!activeNote.hasActiveMarkdownNote || !activeNote.eligible) {
      this.reportStatus("failed");
      await this.logEvent("run-end", {
        stage: "failed",
        resultKind: "eligibility-failed",
        errorSummary: activeNote.failureReasons?.join(", ") ?? activeNote.reason ?? "not eligible",
      });
      return { kind: "eligibility-failed", eligibility: activeNote };
    }

    const lookup = await this.noteRepository.getActiveNote();
    if (lookup.kind !== "markdown") {
      this.reportStatus("failed");
      await this.logEvent("run-end", {
        stage: "failed",
        resultKind: "eligibility-failed",
        errorSummary: lookup.kind,
      });
      return { kind: "eligibility-failed", eligibility: activeNote };
    }

    // 2. B block extraction (not retried — configuration issue)
    await this.logEvent("stage", {
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      noteContentChars: lookup.note.content.length,
    });
    const bBlockExtract = this.blockExtractor.extract(
      lookup.note.content,
      this.settings.bBlock,
    );
    if (!bBlockExtract.ok) {
      this.reportStatus("failed");
      await this.logEvent("run-end", {
        stage: "failed",
        resultKind: "validation-failed",
        errorSummary: `${bBlockExtract.error.code}: ${bBlockExtract.error.message}`,
      });
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
      this.reportStatus("failed");
      await this.logEvent("run-end", {
        stage: "failed",
        resultKind: "validation-failed",
        errorSummary: "v2-not-supported",
      });
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
    this.reportStatus("building-prompt");
    await this.logEvent("stage", {
      stage: "building-prompt",
      protectedBlockChars: bBlockExtract.block.text.length,
      enabledABlockCount: this.settings.aBlocks.filter((b) => b.enabled).length,
      tagWhitelistCount: this.settings.tagWhitelist.length,
    });
    const { request, debugSnapshot } = promptBuilder.build({
      provider: this.llmProvider.providerId,
      model: this.llmProvider.model,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      noteContent: bBlockExtract.block.text,
      aBlocks: this.settings.aBlocks.filter((b) => b.enabled),
      tagWhitelist: this.settings.tagWhitelist,
      tagPrompt: this.settings.tagPrompt,
    });

    // Error session ID groups all failed attempts from this run
    const errorSessionId = `error-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const ctx: AttemptContext = {
      request,
      debugSnapshot,
      noteContent: lookup.note.content,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      bBlockText: bBlockExtract.block.text,
      errorSessionId,
    };
    await this.logEvent("stage", {
      stage: "building-prompt",
      requestChars: request.messages.reduce((sum, message) => sum + message.content.length, 0),
      systemPromptChars: request.messages.find((message) => message.role === "system")?.content.length,
      userPromptChars: request.messages.find((message) => message.role === "user")?.content.length,
    });

    // 4. Retry loop
    const retryResult = await this.retryRunner.run(async (attemptIndex) => {
      return this.runSingleAttempt(ctx, attemptIndex);
    });

    // 5. Persist and return based on retry outcome
    if (retryResult.status === "success") {
      this.reportStatus("saving-session");
      await this.logEvent("stage", { stage: "saving-session" });
      return this.handleRetrySuccess(retryResult.session, retryResult.failedAttempts, retryResult.attemptsUsed);
    }

    this.reportStatus("failed");
    await this.logEvent("run-end", {
      stage: "failed",
      resultKind: "exhausted",
      errorSummary: "all retry attempts exhausted",
    });
    return this.handleRetryExhausted(retryResult.failedAttempts);
  }

  private async runSingleAttempt(
    ctx: AttemptContext,
    attemptIndex: AttemptIndex,
  ): Promise<SingleAttemptResult> {
    // 4a. Call provider
    this.reportStatus("requesting-model", attemptIndex);
    await this.logEvent("attempt-start", {
      stage: "requesting-model",
      attemptIndex,
      maxAttempts: 3,
      requestChars: ctx.request.messages.reduce((sum, message) => sum + message.content.length, 0),
    });
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
      this.observePrompt(ctx, {
        validationSnapshot: {
          errorSummary: failedAttempt.errorSummary,
        },
      });
      await this.logEvent("attempt-end", {
        stage: "failed",
        attemptIndex,
        maxAttempts: 3,
        resultKind: "provider-failed",
        errorSummary: failedAttempt.errorSummary,
      });
      return { success: false, attempt: failedAttempt };
    }
    await this.logEvent("attempt-end", {
      stage: "requesting-model",
      attemptIndex,
      maxAttempts: 3,
      responseChars: llmResponse.rawText.length,
      tokenUsage: llmResponse.usage
        ? {
            inputTokens: llmResponse.usage.inputTokens,
            outputTokens: llmResponse.usage.outputTokens,
            totalTokens: llmResponse.usage.totalTokens,
            countingMode: llmResponse.usage.countingMode,
          }
        : undefined,
      resultKind: "provider-response",
    });

    // 4b. JSON extraction + Zod validation
    this.reportStatus("parsing-response", attemptIndex);
    await this.logEvent("stage", {
      stage: "parsing-response",
      attemptIndex,
      maxAttempts: 3,
      responseChars: llmResponse.rawText.length,
    });
    this.reportStatus("validating-proposal", attemptIndex);
    await this.logEvent("stage", {
      stage: "validating-proposal",
      attemptIndex,
      maxAttempts: 3,
    });
    const zodValidation = this.proposalValidator.validateV2Output(llmResponse.rawText);
    if (!zodValidation.ok) {
      const failedAttempt = this.buildFailedAttempt(
        ctx, attemptIndex,
        "Zod validation failed: proposal does not match v0.2 schema.",
        llmResponse,
        llmResponse.usage,
        { zodError: zodValidation.zodError },
      );
      this.observePrompt(ctx, {
        responseSnapshot: {
          rawText: llmResponse.rawText,
          parsedJson: llmResponse.parsedJson,
        },
        validationSnapshot: {
          zodResult: "failed",
          zodError: zodValidation.zodError,
          errorSummary: failedAttempt.errorSummary,
        },
      });
      await this.logEvent("attempt-end", {
        stage: "validating-proposal",
        attemptIndex,
        maxAttempts: 3,
        resultKind: "zod-failed",
        errorSummary: failedAttempt.errorSummary,
      });
      return { success: false, attempt: failedAttempt };
    }

    // 4c. Normalization
    this.reportStatus("normalizing-proposal", attemptIndex);
    await this.logEvent("stage", {
      stage: "normalizing-proposal",
      attemptIndex,
      maxAttempts: 3,
      acceptedBlockCount: zodValidation.proposal.blocks.length,
    });
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
      this.observePrompt(ctx, {
        responseSnapshot: {
          rawText: llmResponse.rawText,
          parsedJson: llmResponse.parsedJson,
        },
        validationSnapshot: {
          zodResult: "success",
          normalizationReport: normalized.validation,
          errorSummary: failedAttempt.errorSummary,
        },
      });
      await this.logEvent("attempt-end", {
        stage: "normalizing-proposal",
        attemptIndex,
        maxAttempts: 3,
        validationStatus: normalized.validation.status,
        acceptedBlockCount: normalized.blocks.length,
        rejectedFieldCount: normalized.validation.rejectedFields.length,
        resultKind: "normalization-invalid",
        errorSummary: failedAttempt.errorSummary,
      });
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
      profileSnapshot: {
        id: this.settings.id,
        name: this.settings.name,
        description: this.settings.description,
        isDefault: this.settings.isDefault,
      },
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
    await this.logEvent("attempt-end", {
      stage: "normalizing-proposal",
      attemptIndex,
      maxAttempts: 3,
      validationStatus: normalized.validation.status,
      acceptedBlockCount: normalized.blocks.length,
      rejectedFieldCount: normalized.validation.rejectedFields.length,
      tokenUsage: session.tokenUsage
        ? {
            inputTokens: session.tokenUsage.inputTokens,
            outputTokens: session.tokenUsage.outputTokens,
            totalTokens: session.tokenUsage.totalTokens,
            countingMode: session.tokenUsage.countingMode,
          }
        : undefined,
      resultKind: "attempt-success",
    });

    this.observePrompt(ctx, {
      responseSnapshot: {
        rawText: llmResponse.rawText,
        parsedJson: llmResponse.parsedJson,
      },
      validationSnapshot: {
        zodResult: "success",
        normalizationReport: normalized.validation,
      },
    });

    return { success: true, session };
  }

  private observePrompt(
    ctx: AttemptContext,
    snapshot: {
      responseSnapshot?: { rawText?: string; parsedJson?: unknown };
      validationSnapshot?: {
        zodResult?: "success" | "failed";
        zodError?: unknown;
        normalizationReport?: unknown;
        errorSummary?: string;
      };
    },
  ): void {
    if (!this.settings.promptObservationEnabled) return;

    this.promptObservationStore?.save({
      updatedAt: new Date().toISOString(),
      provider: this.llmProvider.providerId,
      model: this.llmProvider.model,
      requestSnapshot: ctx.debugSnapshot,
      responseSnapshot: snapshot.responseSnapshot,
      validationSnapshot: snapshot.validationSnapshot,
    });
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
      errorCachePath: this.errorSessionCache ? ERROR_SESSION_CACHE_DISPLAY_PATH : undefined,
    };

    await this.logEvent("run-end", {
      resultKind: "created-v2",
      tokenUsage: session.tokenUsage
        ? {
            inputTokens: session.tokenUsage.inputTokens,
            outputTokens: session.tokenUsage.outputTokens,
            totalTokens: session.tokenUsage.totalTokens,
            countingMode: session.tokenUsage.countingMode,
          }
        : undefined,
    });

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
      errorCachePath: this.errorSessionCache ? ERROR_SESSION_CACHE_DISPLAY_PATH : undefined,
    };

    return { kind: "exhausted", failedAttempts, noticePlan };
  }

  private reportStatus(stage: RefineRunStage, attemptIndex?: AttemptIndex): void {
    this.statusReporter?.({
      runId: "refine-run",
      stage,
      profileId: this.settings.id,
      profileName: this.settings.name,
      ...(attemptIndex !== undefined ? { attemptIndex, maxAttempts: 3 } : {}),
    });
  }

  private async logEvent(
    event: "run-start" | "stage" | "attempt-start" | "attempt-end" | "run-end",
    details: Partial<Parameters<RefineRunLogger["write"]>[0]> = {},
  ): Promise<void> {
    if (!this.runLogger) return;

    const now = Date.now();
    const deltaMs = now - this.lastLogAt;
    this.lastLogAt = now;

    await this.runLogger.write({
      runId: this.runId,
      timestamp: new Date(now).toISOString(),
      event,
      elapsedMs: now - this.runStartedAt,
      deltaMs,
      provider: this.llmProvider.providerId,
      model: this.llmProvider.model,
      profileId: this.settings.id,
      profileName: this.settings.name,
      ...details,
    });
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
