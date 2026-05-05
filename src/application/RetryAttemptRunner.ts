import type { ProposalSessionV2, FailedAttemptRecord } from "../runtime/ProposalSession";

export const MAX_ATTEMPTS = 3;

export type AttemptIndex = 1 | 2 | 3;

export interface SingleAttemptSuccess {
  success: true;
  session: ProposalSessionV2;
}

export interface SingleAttemptFailure {
  success: false;
  attempt: FailedAttemptRecord;
}

export type SingleAttemptResult = SingleAttemptSuccess | SingleAttemptFailure;

export interface RetryRunnerSuccess {
  status: "success";
  session: ProposalSessionV2;
  attemptsUsed: AttemptIndex;
  failedAttempts: FailedAttemptRecord[];
}

export interface RetryRunnerExhausted {
  status: "exhausted";
  failedAttempts: FailedAttemptRecord[];
}

export type RetryRunnerResult = RetryRunnerSuccess | RetryRunnerExhausted;

/**
 * RetryAttemptRunner — v0.2.0 retry control logic.
 *
 * Orchestrates up to 3 LLM proposal attempts. A success on attempt 1 returns
 * no failed attempts. A success on attempt 2 or 3 returns the failed attempts
 * from the earlier attempts. Three consecutive failures return all three
 * FailedAttemptRecords.
 *
 * The runner does NOT write to disk. The caller (CreateProposalUseCase V2)
 * decides what to store in session-cache / error-session-cache.
 */
export class RetryAttemptRunner {
  constructor(private readonly maxAttempts: number = MAX_ATTEMPTS) {}

  async run(
    runAttempt: (attemptIndex: AttemptIndex) => Promise<SingleAttemptResult>,
  ): Promise<RetryRunnerResult> {
    const failedAttempts: FailedAttemptRecord[] = [];

    for (let i = 1; i <= this.maxAttempts; i++) {
      const index = i as AttemptIndex;
      const result = await runAttempt(index);

      if (result.success) {
        return {
          status: "success",
          session: result.session,
          attemptsUsed: index,
          failedAttempts,
        };
      }

      failedAttempts.push(result.attempt);
    }

    return { status: "exhausted", failedAttempts };
  }
}
