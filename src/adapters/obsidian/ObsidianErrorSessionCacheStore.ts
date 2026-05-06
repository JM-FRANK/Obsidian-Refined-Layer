import type { Plugin } from "obsidian";

import type { FailedAttemptRecord, PersistedFailedAttemptRecord } from "../../runtime/ProposalSession";
import type { ErrorSessionCacheStore } from "../../runtime/ErrorSessionCacheStore";
import { redactSensitiveStrings } from "../../runtime/redaction";

const ERROR_CACHE_PATH = ".obsidian/plugins/obsidian-refined-layer/error-session-cache";
const ERROR_CACHE_FILE = "attempts.v1.json";
const ERROR_CACHE_FILE_PATH = `${ERROR_CACHE_PATH}/${ERROR_CACHE_FILE}`;
const DEFAULT_LIMIT = 30;

const SECRET_KEYWORDS = new Set([
  "apikey",
  "api_key",
  "key",
  "secret",
  "authorization",
  "authheader",
  "bearer",
  "credential",
  "x-api-key",
  "rawrequest",
  "rawresponse",
  "providerrawresponse",
]);

const SAFE_TOKEN_KEYS = new Set(["inputtokens", "outputtokens", "totaltokens", "countingmode"]);

export class ObsidianErrorSessionCacheStore implements ErrorSessionCacheStore {
  constructor(
    private readonly plugin: Plugin,
    private readonly limit: number = DEFAULT_LIMIT,
  ) {}

  async save(attempt: FailedAttemptRecord): Promise<void> {
    const persisted = toPersistedAttempt(attempt);
    if (!persisted) return;

    const existing = await this.loadPersisted();
    existing.unshift(persisted);

    // Trim to limit, oldest first (they're at the end after unshift + sort)
    const trimmed = existing
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-this.limit);

    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      attempts: trimmed,
    };

    const json = JSON.stringify(payload);

    if (containsSecretPattern(json)) {
      throw new Error("Error session cache save blocked: serialized data contains potential secret patterns.");
    }

    const adapter = this.plugin.app.vault.adapter;

    if (!(await adapter.exists(ERROR_CACHE_PATH))) {
      await adapter.mkdir(ERROR_CACHE_PATH);
    }

    await adapter.write(ERROR_CACHE_FILE_PATH, json);
  }

  async loadAll(): Promise<FailedAttemptRecord[]> {
    const persisted = await this.loadPersisted();
    return persisted.map(toAttempt).filter(Boolean) as FailedAttemptRecord[];
  }

  async getCount(): Promise<number> {
    const persisted = await this.loadPersisted();
    return persisted.length;
  }

  private async loadPersisted(): Promise<PersistedFailedAttemptRecord[]> {
    const adapter = this.plugin.app.vault.adapter;

    if (!(await adapter.exists(ERROR_CACHE_FILE_PATH))) {
      return [];
    }

    let raw: string;
    try {
      raw = await adapter.read(ERROR_CACHE_FILE_PATH);
    } catch {
      return [];
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return [];
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("version" in payload) ||
      (payload as Record<string, unknown>).version !== 1
    ) {
      return [];
    }

    const attempts = (payload as Record<string, unknown>).attempts;
    if (!Array.isArray(attempts)) return [];

    return attempts as PersistedFailedAttemptRecord[];
  }
}

// ── Persistence helpers ──

function toPersistedAttempt(attempt: FailedAttemptRecord): PersistedFailedAttemptRecord | null {
  if (
    !attempt.id ||
    !attempt.errorSessionId ||
    !attempt.createdAt ||
    !attempt.notePath ||
    attempt.workflowProfileId !== "raw-refined" ||
    attempt.schemaVersion !== "0.2" ||
    attempt.attemptIndex < 1 ||
    attempt.attemptIndex > 3
  ) {
    return null;
  }

  return redactSensitiveStrings({
    id: attempt.id,
    errorSessionId: attempt.errorSessionId,
    attemptIndex: attempt.attemptIndex,
    createdAt: attempt.createdAt,
    provider: attempt.provider,
    model: attempt.model,
    workflowProfileId: attempt.workflowProfileId,
    schemaVersion: attempt.schemaVersion,
    notePath: attempt.notePath,
    noteTitle: attempt.noteTitle,
    blockConfigSnapshot: attempt.blockConfigSnapshot,
    requestSnapshot: attempt.requestSnapshot,
    responseSnapshot: attempt.responseSnapshot,
    validationSnapshot: attempt.validationSnapshot,
    errorSummary: attempt.errorSummary,
  });
}

function toAttempt(raw: PersistedFailedAttemptRecord): FailedAttemptRecord | null {
  if (
    typeof raw.id !== "string" ||
    typeof raw.errorSessionId !== "string" ||
    typeof raw.createdAt !== "string" ||
    typeof raw.notePath !== "string" ||
    typeof raw.noteTitle !== "string" ||
    raw.workflowProfileId !== "raw-refined" ||
    raw.schemaVersion !== "0.2" ||
    (raw.attemptIndex !== 1 && raw.attemptIndex !== 2 && raw.attemptIndex !== 3)
  ) {
    return null;
  }

  return {
    id: raw.id,
    errorSessionId: raw.errorSessionId,
    attemptIndex: raw.attemptIndex,
    createdAt: raw.createdAt,
    provider: typeof raw.provider === "string" ? raw.provider : "unknown",
    model: typeof raw.model === "string" ? raw.model : "unknown",
    workflowProfileId: raw.workflowProfileId,
    schemaVersion: raw.schemaVersion,
    notePath: raw.notePath,
    noteTitle: raw.noteTitle,
    blockConfigSnapshot: raw.blockConfigSnapshot ?? {
      protectH1: true,
      aBlocks: [],
      bBlock: { id: "original-content", name: "原始内容", heading: "原始内容", headingLevel: 2, required: true },
      tagWhitelist: [],
    },
    requestSnapshot: raw.requestSnapshot ?? {
      messages: [],
      schemaName: "RawRefinedProposalV2",
      schemaVersion: "0.2",
      metadata: {},
    },
    responseSnapshot: raw.responseSnapshot,
    validationSnapshot: raw.validationSnapshot,
    errorSummary: typeof raw.errorSummary === "string" ? raw.errorSummary : "Unknown error.",
  };
}

// ── Secret scanning (reused from ObsidianSessionStore pattern) ──

export function containsSecretPattern(json: string): boolean {
  try {
    const obj = JSON.parse(json);
    return scanObjectForSecrets(obj);
  } catch {
    return true;
  }
}

function scanObjectForSecrets(obj: unknown, currentKey?: string): boolean {
  if (obj === null || obj === undefined) return false;

  if (currentKey !== undefined) {
    const lower = currentKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (SECRET_KEYWORDS.has(lower) && !SAFE_TOKEN_KEYS.has(lower)) {
      return true;
    }
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (scanObjectForSecrets(item)) return true;
    }
    return false;
  }

  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (scanObjectForSecrets(value, key)) return true;
    }
    return false;
  }

  return false;
}
