import type { Plugin } from "obsidian";

import type { RawRefinedProposal } from "../../core/proposal/Proposal";
import type { UserDecision } from "../../core/review/UserDecision";
import type {
  PersistedProposalSession,
  PersistedRawRefinedProposal,
  PersistedTokenUsageReport,
  PersistedUserDecision,
  ProposalSession,
} from "../../runtime/ProposalSession";
import type { SessionPersistenceStore } from "../../runtime/SessionPersistenceStore";
import { redactSensitiveStrings } from "../../runtime/redaction";

export const SESSION_CACHE_PATH = ".obsidian/plugins/obsidian-refined-layer/session-cache";
const SESSION_FILE_NAME = "sessions.v1.json";
export const SESSION_FILE_PATH = `${SESSION_CACHE_PATH}/${SESSION_FILE_NAME}`;

const VALID_STATUSES: Set<ProposalSession["status"]> = new Set([
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

export class ObsidianSessionStore implements SessionPersistenceStore {
  constructor(private readonly plugin: Plugin) {}

  async saveAll(sessionsByPath: Map<string, ProposalSession[]>): Promise<void> {
    const data: Record<string, PersistedProposalSession[]> = {};

    for (const [notePath, sessions] of sessionsByPath.entries()) {
      const persisted = sessions.map((session) => toPersisted(session)).filter(Boolean) as PersistedProposalSession[];
      if (persisted.length > 0) {
        data[notePath] = persisted;
      }
    }

    const payload = redactSensitiveStrings({
      version: 1,
      updatedAt: new Date().toISOString(),
      sessionsByNotePath: data,
    });

    const json = JSON.stringify(payload);

    if (containsSecretPattern(json)) {
      throw new Error("Session persistence blocked: serialized data contains potential secret patterns.");
    }

    const adapter = this.plugin.app.vault.adapter;
    const cacheDir = SESSION_CACHE_PATH;

    if (!(await adapter.exists(cacheDir))) {
      await adapter.mkdir(cacheDir);
    }

    await adapter.write(SESSION_FILE_PATH, json);
  }

  async loadAll(): Promise<Map<string, ProposalSession[]>> {
    const result = new Map<string, ProposalSession[]>();
    const adapter = this.plugin.app.vault.adapter;

    if (!(await adapter.exists(SESSION_FILE_PATH))) {
      return result;
    }

    let raw: string;
    try {
      raw = await adapter.read(SESSION_FILE_PATH);
    } catch {
      return result;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return result;
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("version" in payload) ||
      (payload as Record<string, unknown>).version !== 1
    ) {
      return result;
    }

    const sessionsByNotePath = (payload as Record<string, unknown>).sessionsByNotePath;
    if (typeof sessionsByNotePath !== "object" || sessionsByNotePath === null) {
      return result;
    }

    for (const [notePath, sessions] of Object.entries(sessionsByNotePath as Record<string, unknown>)) {
      if (!Array.isArray(sessions)) continue;
      if (!notePath.trim()) continue;

      const validSessions: ProposalSession[] = [];
      for (const session of sessions) {
        const restored = restoreSession(session);
        if (restored) {
          validSessions.push(restored);
        }
      }

      if (validSessions.length > 0) {
        validSessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        result.set(notePath, validSessions);
      }
    }

    return result;
  }
}

function toPersisted(session: ProposalSession): PersistedProposalSession | null {
  if (!session.id || !session.notePath || !session.createdAt || !session.updatedAt) {
    return null;
  }

  if (session.workflowProfileId !== "raw-refined") {
    return null;
  }

  if (!VALID_STATUSES.has(session.status)) {
    return null;
  }

  const proposal = toPersistedProposal(session.proposal);
  if (!proposal) {
    return null;
  }

  return {
    id: session.id,
    workflowProfileId: session.workflowProfileId,
    policySnapshotId: session.policySnapshotId,
    notePath: session.notePath,
    noteTitle: session.noteTitle,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    baseFileHash: session.baseFileHash,
    baseFrontmatterHash: session.baseFrontmatterHash,
    baseProtectedRegionHash: session.baseProtectedRegionHash,
    proposal,
    tokenUsage: session.tokenUsage ? toPersistedTokenUsage(session.tokenUsage) : undefined,
    status: session.status,
    decision: session.decision ? toPersistedDecision(session.decision) : undefined,
  };
}

function hasRequiredSections(sections: RawRefinedProposal["refinedSections"]): boolean {
  return !!(sections.summary && sections.coreQuestion && sections.currentConclusion && sections.reasoning);
}

function toPersistedProposal(proposal: RawRefinedProposal): PersistedRawRefinedProposal | null {
  if (proposal.workflowProfileId !== "raw-refined") {
    return null;
  }
  if (!hasRequiredSections(proposal.refinedSections)) {
    return null;
  }

  return {
    workflowProfileId: proposal.workflowProfileId,
    refinedSections: {
      summary: proposal.refinedSections.summary,
      coreQuestion: proposal.refinedSections.coreQuestion,
      currentConclusion: proposal.refinedSections.currentConclusion,
      reasoning: proposal.refinedSections.reasoning,
      scope: proposal.refinedSections.scope,
      nextSteps: proposal.refinedSections.nextSteps,
      refineNote: proposal.refinedSections.refineNote,
    },
    frontmatterSuggestion: proposal.frontmatterSuggestion
      ? {
          status: proposal.frontmatterSuggestion.status,
          source: proposal.frontmatterSuggestion.source,
          context: proposal.frontmatterSuggestion.context,
        }
      : undefined,
    tagSuggestion: proposal.tagSuggestion
      ? {
          add: proposal.tagSuggestion.add,
          remove: proposal.tagSuggestion.remove,
        }
      : undefined,
    warnings: proposal.warnings,
  };
}

function toPersistedTokenUsage(usage: ProposalSession["tokenUsage"]): PersistedTokenUsageReport | undefined {
  if (!usage) return undefined;
  return {
    provider: usage.provider,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    countingMode: usage.countingMode,
    generatedAt: usage.generatedAt,
  };
}

function toPersistedDecision(decision: UserDecision): PersistedUserDecision {
  return {
    acceptBody: decision.acceptBody,
    editedRefinedSections: decision.editedRefinedSections
      ? {
          summary: decision.editedRefinedSections.summary,
          coreQuestion: decision.editedRefinedSections.coreQuestion,
          currentConclusion: decision.editedRefinedSections.currentConclusion,
          reasoning: decision.editedRefinedSections.reasoning,
          scope: decision.editedRefinedSections.scope,
          nextSteps: decision.editedRefinedSections.nextSteps,
          refineNote: decision.editedRefinedSections.refineNote,
        }
      : undefined,
    acceptFrontmatter: {
      status: decision.acceptFrontmatter.status,
      source: decision.acceptFrontmatter.source,
      context: decision.acceptFrontmatter.context,
    },
    acceptTags: {
      add: decision.acceptTags.add,
      remove: decision.acceptTags.remove,
    },
    saveAsDraftOnly: decision.saveAsDraftOnly,
  };
}

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

function restoreSession(raw: unknown): ProposalSession | null {
  if (typeof raw !== "object" || raw === null) return null;

  const s = raw as Record<string, unknown>;

  if (
    typeof s.id !== "string" ||
    typeof s.notePath !== "string" ||
    typeof s.noteTitle !== "string" ||
    typeof s.createdAt !== "string" ||
    typeof s.updatedAt !== "string" ||
    typeof s.baseFileHash !== "string" ||
    typeof s.policySnapshotId !== "string" ||
    s.workflowProfileId !== "raw-refined" ||
    !VALID_STATUSES.has(s.status as ProposalSession["status"])
  ) {
    return null;
  }

  const proposal = restoreProposal(s.proposal);
  if (!proposal) return null;

  return {
    id: s.id,
    workflowProfileId: s.workflowProfileId as "raw-refined",
    policySnapshotId: s.policySnapshotId,
    notePath: s.notePath,
    noteTitle: s.noteTitle,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    baseFileHash: s.baseFileHash,
    baseFrontmatterHash: typeof s.baseFrontmatterHash === "string" ? s.baseFrontmatterHash : undefined,
    baseProtectedRegionHash: typeof s.baseProtectedRegionHash === "string" ? s.baseProtectedRegionHash : undefined,
    proposal,
    tokenUsage: restoreTokenUsage(s.tokenUsage),
    status: s.status as ProposalSession["status"],
    decision: restoreDecision(s.decision),
  };
}

function restoreProposal(raw: unknown): RawRefinedProposal | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;

  if (p.workflowProfileId !== "raw-refined") return null;
  if (typeof p.refinedSections !== "object" || p.refinedSections === null) return null;

  const sections = p.refinedSections as Record<string, unknown>;
  if (
    typeof sections.summary !== "string" ||
    typeof sections.coreQuestion !== "string" ||
    typeof sections.currentConclusion !== "string" ||
    typeof sections.reasoning !== "string"
  ) {
    return null;
  }

  return {
    workflowProfileId: "raw-refined",
    refinedSections: {
      summary: sections.summary,
      coreQuestion: sections.coreQuestion,
      currentConclusion: sections.currentConclusion,
      reasoning: sections.reasoning,
      scope: typeof sections.scope === "string" ? sections.scope : undefined,
      nextSteps: typeof sections.nextSteps === "string" ? sections.nextSteps : undefined,
      refineNote: typeof sections.refineNote === "string" ? sections.refineNote : undefined,
    },
    frontmatterSuggestion: restoreFrontmatterSuggestion(p.frontmatterSuggestion),
    tagSuggestion: restoreTagSuggestion(p.tagSuggestion),
    warnings: Array.isArray(p.warnings)
      ? (p.warnings as string[]).filter((w): w is string => typeof w === "string")
      : undefined,
  };
}

function restoreTokenUsage(raw: unknown): ProposalSession["tokenUsage"] {
  if (typeof raw !== "object" || raw === null) return undefined;
  const t = raw as Record<string, unknown>;
  const validModes = new Set(["actual", "estimated", "mixed", "unavailable"]);

  if (
    typeof t.provider !== "string" ||
    typeof t.model !== "string" ||
    typeof t.countingMode !== "string" ||
    !validModes.has(t.countingMode)
  ) {
    return undefined;
  }

  return {
    provider: t.provider,
    model: t.model,
    inputTokens: typeof t.inputTokens === "number" ? t.inputTokens : undefined,
    outputTokens: typeof t.outputTokens === "number" ? t.outputTokens : undefined,
    totalTokens: typeof t.totalTokens === "number" ? t.totalTokens : undefined,
    countingMode: t.countingMode as "actual" | "estimated" | "mixed" | "unavailable",
    generatedAt: typeof t.generatedAt === "string" ? t.generatedAt : new Date().toISOString(),
  };
}

function restoreFrontmatterSuggestion(raw: unknown): RawRefinedProposal["frontmatterSuggestion"] {
  if (typeof raw !== "object" || raw === null) return undefined;
  const f = raw as Record<string, unknown>;

  return {
    status: f.status as "refined" | undefined,
    source: Array.isArray(f.source) ? f.source.filter((s): s is "self" | "external" | "practice" => typeof s === "string") : undefined,
    context: Array.isArray(f.context) ? f.context.filter((c): c is string => typeof c === "string") : undefined,
  };
}

function restoreTagSuggestion(raw: unknown): RawRefinedProposal["tagSuggestion"] {
  if (typeof raw !== "object" || raw === null) return undefined;
  const t = raw as Record<string, unknown>;

  return {
    add: Array.isArray(t.add) ? t.add.filter((a): a is string => typeof a === "string") : undefined,
    remove: Array.isArray(t.remove) ? t.remove.filter((r): r is string => typeof r === "string") : undefined,
  };
}

function restoreDecision(raw: unknown): UserDecision | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const d = raw as Record<string, unknown>;

  return {
    acceptBody: d.acceptBody === true,
    editedRefinedSections: undefined, // never restore edited sections — they are transient
    acceptFrontmatter: {
      status: d.acceptFrontmatter && typeof d.acceptFrontmatter === "object"
        ? (d.acceptFrontmatter as Record<string, unknown>).status === true
        : undefined,
      source: d.acceptFrontmatter && typeof d.acceptFrontmatter === "object"
        ? (d.acceptFrontmatter as Record<string, unknown>).source === true
        : undefined,
      context: d.acceptFrontmatter && typeof d.acceptFrontmatter === "object"
        ? (d.acceptFrontmatter as Record<string, unknown>).context === true
        : undefined,
    },
    acceptTags: {
      add: d.acceptTags && typeof d.acceptTags === "object"
        ? (Array.isArray((d.acceptTags as Record<string, unknown>).add)
          ? ((d.acceptTags as Record<string, unknown>).add as string[]).filter((a): a is string => typeof a === "string")
          : undefined)
        : undefined,
      remove: d.acceptTags && typeof d.acceptTags === "object"
        ? (Array.isArray((d.acceptTags as Record<string, unknown>).remove)
          ? ((d.acceptTags as Record<string, unknown>).remove as string[]).filter((r): r is string => typeof r === "string")
          : undefined)
        : undefined,
    },
    saveAsDraftOnly: d.saveAsDraftOnly === true,
  };
}
