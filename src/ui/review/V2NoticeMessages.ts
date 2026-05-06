import type { CreateProposalV2Result, V2NoticePlan } from "../../application/CreateProposalUseCase";
import { t, type UiLanguage } from "../i18n";

export function buildV2NoticeMessages(
  language: UiLanguage,
  result: Extract<CreateProposalV2Result, { kind: "created-v2" | "exhausted" }>,
): string[] {
  const retryMessage = buildRetryMessage(language, result.kind, result.noticePlan);
  if (!retryMessage) return [];

  return [
    retryMessage,
    buildErrorCacheMessage(language, result.noticePlan),
  ];
}

function buildRetryMessage(
  language: UiLanguage,
  kind: "created-v2" | "exhausted",
  noticePlan: V2NoticePlan,
): string | null {
  if (kind === "created-v2" && noticePlan.attemptsUsed === 1) {
    return null;
  }

  const key = kind === "created-v2"
    ? "notice.v2.retry.success"
    : "notice.v2.retry.failure";

  return t(language, key, {
    attemptsUsed: String(noticePlan.attemptsUsed),
    maxAttempts: String(noticePlan.maxAttempts),
  });
}

function buildErrorCacheMessage(language: UiLanguage, noticePlan: V2NoticePlan): string {
  if (noticePlan.errorCacheDisabled || !noticePlan.errorCacheWritten) {
    return t(language, "notice.v2.errorCache.disabled");
  }

  return t(language, "notice.v2.errorCache.saved", {
    path: noticePlan.errorCachePath ?? "error-session-cache/",
  });
}
