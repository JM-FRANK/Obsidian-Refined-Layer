import type { Plugin } from "obsidian";

import type { SessionCacheV2Info, SessionCacheV2Store } from "../../runtime/SessionCacheV2Store";
import type { ProposalSessionV2, PersistedProposalSessionV2 } from "../../runtime/ProposalSession";
import { redactSensitiveStrings } from "../../runtime/redaction";

export const SESSION_CACHE_PATH = ".obsidian/plugins/obsidian-refined-layer/session-cache";
export const SESSION_FILE_NAME = "sessions.v2.json";
export const SESSION_FILE_PATH = `${SESSION_CACHE_PATH}/${SESSION_FILE_NAME}`;
export const LEGACY_SESSION_FILE_PATH = `${SESSION_CACHE_PATH}/sessions.v1.json`;
export const DEFAULT_SESSION_CACHE_V2_LIMIT = 5;

const VALID_STATUSES: Set<ProposalSessionV2["status"]> = new Set([
  "generated",
  "reviewing",
  "applied",
  "saved_as_draft",
  "discarded",
  "conflicted",
]);

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

export class ObsidianSessionCacheV2Store implements SessionCacheV2Store {
  constructor(
    private readonly plugin: Plugin,
    private limit: number = DEFAULT_SESSION_CACHE_V2_LIMIT,
  ) {}

  async save(session: ProposalSessionV2): Promise<void> {
    const persisted = toPersistedV2(session);
    if (!persisted) return;

    const existing = await this.loadPersisted();

    // Replace existing session for same notePath, then sort by updatedAt desc, trim to limit
    const withoutCurrent = existing.filter((s) => s.notePath !== persisted.notePath);
    const all = [persisted, ...withoutCurrent]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, this.limit);

    await this.writePersisted(all);
  }

  async loadAll(): Promise<ProposalSessionV2[]> {
    const persisted = await this.loadPersisted();
    return persisted.map(restoreSessionV2).filter(Boolean) as ProposalSessionV2[];
  }

  async getLatestForNote(notePath: string): Promise<ProposalSessionV2 | null> {
    const all = await this.loadAll();
    const forNote = all.filter((s) => s.notePath === notePath);
    forNote.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return forNote[0] ?? null;
  }

  async setSessionCacheLimit(limit: number): Promise<void> {
    this.limit = normalizeLimit(limit);
    const trimmed = (await this.loadPersisted())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, this.limit);
    await this.writePersisted(trimmed);
  }

  getCacheInfo(): SessionCacheV2Info {
    return {
      cachePath: SESSION_CACHE_PATH,
      filePath: SESSION_FILE_PATH,
      legacyFilePath: LEGACY_SESSION_FILE_PATH,
      compatibilityStrategy: "ignore-v1",
      limit: this.limit,
    };
  }

  private async loadPersisted(): Promise<PersistedProposalSessionV2[]> {
    const adapter = this.plugin.app.vault.adapter;

    if (!(await adapter.exists(SESSION_FILE_PATH))) {
      return [];
    }

    let raw: string;
    try {
      raw = await adapter.read(SESSION_FILE_PATH);
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
      (payload as Record<string, unknown>).version !== 2
    ) {
      return [];
    }

    const sessions = (payload as Record<string, unknown>).sessions;
    if (!Array.isArray(sessions)) return [];

    return sessions as PersistedProposalSessionV2[];
  }

  private async writePersisted(sessions: PersistedProposalSessionV2[]): Promise<void> {
    const payload = {
      version: 2,
      updatedAt: new Date().toISOString(),
      sessions,
    };

    const json = JSON.stringify(payload);

    if (containsSecretPattern(json)) {
      throw new Error("Session cache V2 save blocked: serialized data contains potential secret patterns.");
    }

    const adapter = this.plugin.app.vault.adapter;

    if (!(await adapter.exists(SESSION_CACHE_PATH))) {
      await adapter.mkdir(SESSION_CACHE_PATH);
    }

    await adapter.write(SESSION_FILE_PATH, json);
  }
}

// ── Persistence helpers ──

function toPersistedV2(session: ProposalSessionV2): PersistedProposalSessionV2 | null {
  if (!session.id || !session.notePath || !session.createdAt || !session.updatedAt) {
    return null;
  }

  if (session.workflowProfileId !== "raw-refined") return null;
  if (session.schemaVersion !== "0.2") return null;
  if (!VALID_STATUSES.has(session.status)) return null;

  return redactSensitiveStrings({
    id: session.id,
    workflowProfileId: session.workflowProfileId,
    schemaVersion: session.schemaVersion,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    notePath: session.notePath,
    noteTitle: session.noteTitle,
    baseFileHash: session.baseFileHash,
    baseFrontmatterHash: session.baseFrontmatterHash,
    baseBBlockHash: session.baseBBlockHash,
    profileSnapshot: session.profileSnapshot,
    blockConfigSnapshot: session.blockConfigSnapshot,
    proposal: session.proposal,
    validation: session.validation,
    tokenUsage: session.tokenUsage,
    status: session.status,
    decision: session.decision,
    source: session.source,
  });
}

function restoreSessionV2(raw: PersistedProposalSessionV2): ProposalSessionV2 | null {
  if (
    typeof raw.id !== "string" ||
    typeof raw.notePath !== "string" ||
    typeof raw.noteTitle !== "string" ||
    typeof raw.createdAt !== "string" ||
    typeof raw.updatedAt !== "string" ||
    typeof raw.baseFileHash !== "string" ||
    typeof raw.baseBBlockHash !== "string" ||
    raw.workflowProfileId !== "raw-refined" ||
    raw.schemaVersion !== "0.2" ||
    !VALID_STATUSES.has(raw.status as ProposalSessionV2["status"])
  ) {
    return null;
  }

  return {
    id: raw.id,
    workflowProfileId: raw.workflowProfileId,
    schemaVersion: raw.schemaVersion,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    notePath: raw.notePath,
    noteTitle: raw.noteTitle,
    baseFileHash: raw.baseFileHash,
    baseFrontmatterHash: raw.baseFrontmatterHash,
    baseBBlockHash: raw.baseBBlockHash,
    profileSnapshot: raw.profileSnapshot ?? {
      id: "default",
      name: "Default",
      isDefault: true,
    },
    blockConfigSnapshot: raw.blockConfigSnapshot ?? {
      protectH1: true,
      aBlocks: [],
      bBlock: { id: "original-content", name: "原始内容", heading: "原始内容", headingLevel: 2, required: true },
      tagWhitelist: [],
    },
    proposal: raw.proposal ?? {
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [],
    },
    validation: raw.validation ?? {
      status: "invalid",
      acceptedFields: [],
      rejectedFields: [],
      warnings: ["Restored from incomplete cache entry."],
      tagNormalizationApplied: false,
    },
    tokenUsage: raw.tokenUsage,
    status: raw.status as ProposalSessionV2["status"],
    decision: raw.decision,
    source: raw.source ?? { provider: "unknown", model: "unknown", attemptsUsed: 1 },
  };
}

// ── Secret scanning ──

export function containsSecretPattern(json: string): boolean {
  try {
    const obj = JSON.parse(json);
    return scanObjectForSecrets(obj);
  } catch {
    return true;
  }
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_SESSION_CACHE_V2_LIMIT;
  return Math.max(1, Math.floor(limit));
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
