import type { LlmProvider, LlmResponse } from "../adapters/llm/LlmProvider";
import type { LlmRequestV2 } from "../core/prompt/PromptDebugSnapshot";
import type { RefineProfile } from "../core/profile/RefineProfile";
import type { TokenUsageReport } from "../core/proposal/TokenUsageReport";
import type { FailedAttemptRecord } from "../runtime/ProposalSession";
import type { AttemptIndex } from "./RetryAttemptRunner";

export interface FailedAttemptContext {
  request: LlmRequestV2;
  notePath: string;
  noteTitle: string;
  errorSessionId: string;
}

export interface FailedAttemptFactoryInput {
  ctx: FailedAttemptContext;
  attemptIndex: AttemptIndex;
  errorSummary: string;
  llmProvider: Pick<LlmProvider, "providerId" | "model">;
  settings: RefineProfile;
  llmResponse?: LlmResponse;
  providerUsage?: TokenUsageReport;
  validationSnapshotOverrides?: Record<string, unknown>;
}

export function buildFailedAttemptRecord(input: FailedAttemptFactoryInput): FailedAttemptRecord {
  const {
    ctx,
    attemptIndex,
    errorSummary,
    llmProvider,
    settings,
    llmResponse,
    providerUsage,
    validationSnapshotOverrides,
  } = input;
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
    provider: llmProvider.providerId,
    model: llmProvider.model,
    workflowProfileId: "raw-refined",
    schemaVersion: "0.2",
    notePath: ctx.notePath,
    noteTitle: ctx.noteTitle,
    blockConfigSnapshot: {
      protectH1: settings.protectH1,
      aBlocks: settings.aBlocks,
      bBlock: settings.bBlock,
      tagWhitelist: settings.tagWhitelist,
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
