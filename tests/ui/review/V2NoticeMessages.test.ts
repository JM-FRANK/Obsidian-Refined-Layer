import { describe, expect, it } from "vitest";

import type { CreateProposalV2Result } from "../../../src/application/CreateProposalUseCase";
import { buildV2NoticeMessages } from "../../../src/ui/review/V2NoticeMessages";

function createdResult(attemptsUsed: 1 | 2 | 3, errorCacheDisabled = false): Extract<CreateProposalV2Result, { kind: "created-v2" }> {
  return {
    kind: "created-v2",
    session: {} as never,
    noticePlan: {
      attemptsUsed,
      maxAttempts: 3,
      errorCacheWritten: attemptsUsed > 1 && !errorCacheDisabled,
      errorCacheDisabled,
      errorCachePath: errorCacheDisabled ? undefined : ".obsidian/plugins/obsidian-refined-layer/error-session-cache/",
    },
  };
}

function exhaustedResult(errorCacheDisabled = false): Extract<CreateProposalV2Result, { kind: "exhausted" }> {
  return {
    kind: "exhausted",
    failedAttempts: [],
    noticePlan: {
      attemptsUsed: 3,
      maxAttempts: 3,
      errorCacheWritten: !errorCacheDisabled,
      errorCacheDisabled,
      errorCachePath: errorCacheDisabled ? undefined : ".obsidian/plugins/obsidian-refined-layer/error-session-cache/",
    },
  };
}

describe("buildV2NoticeMessages (D51)", () => {
  it("returns no request-count notice for attempt 1 success", () => {
    expect(buildV2NoticeMessages("en", createdResult(1))).toEqual([]);
  });

  it("returns two separate notices for attempt 2 success", () => {
    const messages = buildV2NoticeMessages("en", createdResult(2));

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("2/3");
    expect(messages[0]).toContain("succeeded");
    expect(messages[1]).toContain("cache records");
    expect(messages[1]).toContain("error-session-cache");
  });

  it("returns two separate notices for attempt 3 success", () => {
    const messages = buildV2NoticeMessages("zh-CN", createdResult(3));

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("3/3");
    expect(messages[0]).toContain("成功");
    expect(messages[1]).toContain("缓存记录");
    expect(messages[1]).toContain("error-session-cache");
  });

  it("returns two separate notices for exhausted retries", () => {
    const messages = buildV2NoticeMessages("en", exhaustedResult());

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("3/3");
    expect(messages[0]).toContain("did not produce");
    expect(messages[1]).toContain("failed attempts");
  });

  it("uses not-saved wording when error cache is disabled", () => {
    const messages = buildV2NoticeMessages("en", exhaustedResult(true));

    expect(messages).toHaveLength(2);
    expect(messages[1]).toContain("not saved");
  });
});
