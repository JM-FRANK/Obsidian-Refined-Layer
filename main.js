"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ObsidianRefinedLayerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/adapters/llm/MockLlmProvider.ts
var MockLlmProvider = class {
  constructor() {
    this.providerId = "mock-llm";
    this.model = "mock-gpt";
  }
  async generateProposal(request) {
    const proposal = {
      workflowProfileId: "raw-refined",
      refinedSections: {
        summary: `\u8FD9\u662F\u5BF9 ${request.noteTitle} \u7684 mock \u6458\u8981\u3002`,
        coreQuestion: "\u5F53\u524D\u7B14\u8BB0\u9700\u8981\u6F84\u6E05\u54EA\u4E9B\u5173\u952E\u95EE\u9898\uFF1F",
        currentConclusion: "\u5F53\u524D\u5185\u5BB9\u53EF\u6574\u7406\u4E3A\u66F4\u6E05\u6670\u7684\u63D0\u6848\u7ED3\u6784\u3002",
        reasoning: "mock-llm \u8FD4\u56DE\u56FA\u5B9A\u7ED3\u6784\u5316\u63D0\u6848\uFF0C\u540E\u7EED\u9636\u6BB5\u518D\u63A5\u5165\u771F\u5B9E provider\u3002",
        refineNote: "\u672C\u63D0\u6848\u4EC5\u7528\u4E8E\u9A8C\u8BC1 review-first \u6D41\u7A0B\u7684\u7ED3\u6784\u6B63\u786E\u6027\u3002"
      },
      frontmatterSuggestion: {
        status: "refined",
        context: ["mock/refined-layer"]
      },
      tagSuggestion: {
        add: ["#ai/generated"]
      },
      warnings: ["mock proposal"]
    };
    return {
      rawText: JSON.stringify(proposal, null, 2),
      parsedJson: proposal,
      usage: {
        provider: this.providerId,
        model: this.model,
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
        countingMode: "actual",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  async generateProposalV2(_request) {
    const proposal = {
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: [
        { id: "summary", content: `\u8FD9\u662F mock v0.2 \u6458\u8981\u3002` },
        { id: "coreQuestion", content: "Mock v0.2 \u6838\u5FC3\u95EE\u9898\u3002" },
        { id: "currentConclusion", content: "Mock v0.2 \u5F53\u524D\u7ED3\u8BBA\u3002" },
        { id: "reasoning", content: "Mock v0.2 \u4F9D\u636E\u4E0E\u63A8\u7406\u3002" }
      ],
      frontmatterSuggestion: {
        status: "refined",
        context: ["mock/v0.2"]
      },
      tagSuggestion: {
        selectedTags: ["#ai/generated"],
        newTagSuggestions: []
      },
      warnings: ["mock v0.2 proposal"]
    };
    return {
      rawText: JSON.stringify(proposal, null, 2),
      parsedJson: proposal,
      usage: {
        provider: this.providerId,
        model: this.model,
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
        countingMode: "actual",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
};

// src/runtime/redaction.ts
var SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._\-\+\/=]+/gi,
  /Authorization:\s*\S+(\s+\S+)?/gi,
  /api[_-]?key["'`]?\s*[:=]\s*["'`][^"'`]+["'`]/gi,
  /token["'`]?\s*[:=]\s*["'`][^"'`]+["'`]/gi,
  /secret["'`]?\s*[:=]\s*["'`][^"'`]+["'`]/gi,
  /x-api-key["']?\s*[:=]\s*[^\s,;]+/gi,
  /sk-[A-Za-z0-9_\-]+/gi
];
function redactSensitiveText(text) {
  return SECRET_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, "[REDACTED]"),
    text
  );
}
function redactSensitiveStrings(value) {
  if (typeof value === "string") {
    return redactSensitiveText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveStrings(item));
  }
  if (value && typeof value === "object") {
    const redacted = {};
    for (const [key, item] of Object.entries(value)) {
      redacted[key] = redactSensitiveStrings(item);
    }
    return redacted;
  }
  return value;
}
function toSafeErrorMessage(error51) {
  if (error51 instanceof Error) {
    return redactSensitiveText(error51.message);
  }
  return redactSensitiveText(String(error51));
}

// src/adapters/llm/OpenAICompatibleProvider.ts
var OpenAICompatibleProvider = class {
  constructor(options) {
    this.options = options;
    var _a5, _b, _c;
    this.providerId = (_a5 = options.providerId) != null ? _a5 : "openai-compatible";
    this.model = options.model;
    this.endpoint = resolveChatCompletionsEndpoint((_b = options.baseUrl) != null ? _b : "https://api.openai.com/v1");
    this.requiresApiKey = (_c = options.requiresApiKey) != null ? _c : true;
  }
  async generateProposal(request) {
    var _a5, _b, _c, _d, _e, _f;
    const apiKey = this.options.secretRef ? this.options.secretStore.getSecret(this.options.secretRef) : null;
    if (this.requiresApiKey && !apiKey) {
      throw new Error("API key is missing for the configured secret reference.");
    }
    if (apiKey && this.options.secretRef && apiKey.trim() === this.options.secretRef.trim()) {
      throw new Error(
        `The stored value for secret reference "${this.options.secretRef}" appears to be the reference name itself. Please re-enter your real API key in Settings \u2192 API Key.`
      );
    }
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: request.systemPrompt
          },
          {
            role: "user",
            content: request.userPrompt
          }
        ]
      })
    }).catch((error51) => {
      throw new Error(toSafeErrorMessage(error51));
    });
    const payload = await response.json().catch(() => {
      throw new Error("Provider returned a non-JSON response.");
    });
    if (!response.ok) {
      throw new Error(toSafeErrorMessage((_b = (_a5 = payload == null ? void 0 : payload.error) == null ? void 0 : _a5.message) != null ? _b : response.statusText));
    }
    const rawText = String((_f = (_e = (_d = (_c = payload == null ? void 0 : payload.choices) == null ? void 0 : _c[0]) == null ? void 0 : _d.message) == null ? void 0 : _e.content) != null ? _f : "");
    return {
      rawText,
      parsedJson: tryParseJson(rawText),
      usage: normalizeUsage(payload == null ? void 0 : payload.usage, this.providerId, this.model)
    };
  }
};
function normalizeUsage(usage, providerId, model) {
  if (!usage) {
    return void 0;
  }
  return {
    provider: providerId,
    model,
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : void 0,
    outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : void 0,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : void 0,
    countingMode: "actual",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function tryParseJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (e) {
    return void 0;
  }
}
function resolveChatCompletionsEndpoint(baseUrl) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }
  return `${normalized}/chat/completions`;
}

// src/adapters/obsidian/ObsidianNoteRepository.ts
var import_obsidian = require("obsidian");
var ObsidianNoteRepository = class {
  constructor(app) {
    this.app = app;
  }
  async getActiveNote() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return {
        kind: "no-active-file"
      };
    }
    if (!(activeFile instanceof import_obsidian.TFile) || activeFile.extension !== "md") {
      return {
        kind: "non-markdown-file",
        path: activeFile.path,
        extension: activeFile.extension
      };
    }
    const content = await this.app.vault.cachedRead(activeFile);
    return {
      kind: "markdown",
      note: {
        path: activeFile.path,
        title: activeFile.basename,
        content
      }
    };
  }
  async readNoteByPath(path) {
    const file2 = this.app.vault.getAbstractFileByPath(path);
    if (!(file2 instanceof import_obsidian.TFile) || file2.extension !== "md") {
      return null;
    }
    const content = await this.app.vault.cachedRead(file2);
    return {
      path: file2.path,
      title: file2.basename,
      content
    };
  }
  async writeNote(path, content) {
    const file2 = this.app.vault.getAbstractFileByPath(path);
    if (!(file2 instanceof import_obsidian.TFile) || file2.extension !== "md") {
      throw new Error(`Markdown note not found: ${path}`);
    }
    await this.app.vault.modify(file2, content);
  }
  async writeDraft(path, content) {
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof import_obsidian.TFile) {
      await this.app.vault.modify(existing, content);
      return;
    }
    await ensureFolders(this.app, path);
    await this.app.vault.create(path, content);
  }
};
async function ensureFolders(app, filePath) {
  const parts = filePath.split("/").slice(0, -1);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}

// src/adapters/obsidian/ObsidianErrorSessionCacheStore.ts
var ERROR_SESSION_CACHE_PATH = ".obsidian/plugins/obsidian-refined-layer/error-session-cache";
var ERROR_SESSION_CACHE_FILE_NAME = "attempts.v1.json";
var ERROR_SESSION_CACHE_FILE_PATH = `${ERROR_SESSION_CACHE_PATH}/${ERROR_SESSION_CACHE_FILE_NAME}`;
var DEFAULT_ERROR_SESSION_CACHE_LIMIT = 30;

// src/adapters/obsidian/ObsidianSecretStore.ts
var SECRET_ID_PATTERN = /^[a-z0-9-]+$/;
var ObsidianSecretStore = class {
  constructor(app) {
    this.app = app;
  }
  isAvailable() {
    return this.getDiagnostics().available;
  }
  getDiagnostics() {
    var _a5, _b;
    const maybeSecretStorage = this.app.secretStorage;
    const hasSecretStorage = maybeSecretStorage !== void 0 && maybeSecretStorage !== null;
    const getSecretType = typeof (maybeSecretStorage == null ? void 0 : maybeSecretStorage.getSecret);
    const setSecretType = typeof (maybeSecretStorage == null ? void 0 : maybeSecretStorage.setSecret);
    const available = getSecretType === "function" && setSecretType === "function";
    return {
      available,
      hasSecretStorage,
      secretStorageType: maybeSecretStorage === null ? "null" : typeof maybeSecretStorage,
      secretStorageConstructorName: hasSecretStorage ? (_b = (_a5 = maybeSecretStorage.constructor) == null ? void 0 : _a5.name) != null ? _b : "unknown" : "n/a",
      getSecretType,
      setSecretType,
      ownKeys: hasSecretStorage ? Object.keys(maybeSecretStorage) : [],
      reason: available ? "secretStorage.getSecret/setSecret are both available." : "secretStorage is missing, or getSecret/setSecret is not exposed as functions."
    };
  }
  setSecret(secretRef, value) {
    this.ensureAvailable();
    this.ensureValidSecretRef(secretRef);
    if (!value.trim()) {
      throw new Error("API key value cannot be empty.");
    }
    this.app.secretStorage.setSecret(secretRef, value);
  }
  getSecret(secretRef) {
    this.ensureAvailable();
    this.ensureValidSecretRef(secretRef);
    return this.app.secretStorage.getSecret(secretRef);
  }
  ensureAvailable() {
    if (!this.isAvailable()) {
      throw new Error("Secure secret storage is unavailable in this Obsidian environment.");
    }
  }
  ensureValidSecretRef(secretRef) {
    if (!SECRET_ID_PATTERN.test(secretRef)) {
      throw new Error("Secret reference must use lowercase letters, numbers, and dashes only.");
    }
  }
};

// src/adapters/obsidian/ObsidianSessionCacheV2Store.ts
var SESSION_CACHE_PATH = ".obsidian/plugins/obsidian-refined-layer/session-cache";
var SESSION_FILE_NAME = "sessions.v2.json";
var SESSION_FILE_PATH = `${SESSION_CACHE_PATH}/${SESSION_FILE_NAME}`;
var LEGACY_SESSION_FILE_PATH = `${SESSION_CACHE_PATH}/sessions.v1.json`;
var DEFAULT_SESSION_CACHE_V2_LIMIT = 5;
var VALID_STATUSES = /* @__PURE__ */ new Set([
  "generated",
  "reviewing",
  "applied",
  "saved_as_draft",
  "discarded",
  "conflicted"
]);
var SECRET_KEYWORDS = /* @__PURE__ */ new Set([
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
  "providerrawresponse"
]);
var SAFE_TOKEN_KEYS = /* @__PURE__ */ new Set(["inputtokens", "outputtokens", "totaltokens", "countingmode"]);
var ObsidianSessionCacheV2Store = class {
  constructor(plugin, limit = DEFAULT_SESSION_CACHE_V2_LIMIT) {
    this.plugin = plugin;
    this.limit = limit;
  }
  async save(session) {
    const persisted = toPersistedV2(session);
    if (!persisted) return;
    const existing = await this.loadPersisted();
    const withoutCurrent = existing.filter((s) => s.notePath !== persisted.notePath);
    const all = [persisted, ...withoutCurrent].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, this.limit);
    await this.writePersisted(all);
  }
  async loadAll() {
    const persisted = await this.loadPersisted();
    return persisted.map(restoreSessionV2).filter(Boolean);
  }
  async getLatestForNote(notePath) {
    var _a5;
    const all = await this.loadAll();
    const forNote = all.filter((s) => s.notePath === notePath);
    forNote.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return (_a5 = forNote[0]) != null ? _a5 : null;
  }
  async setSessionCacheLimit(limit) {
    this.limit = normalizeLimit(limit);
    const trimmed = (await this.loadPersisted()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, this.limit);
    await this.writePersisted(trimmed);
  }
  getCacheInfo() {
    return {
      cachePath: SESSION_CACHE_PATH,
      filePath: SESSION_FILE_PATH,
      legacyFilePath: LEGACY_SESSION_FILE_PATH,
      compatibilityStrategy: "ignore-v1",
      limit: this.limit
    };
  }
  async loadPersisted() {
    const adapter = this.plugin.app.vault.adapter;
    if (!await adapter.exists(SESSION_FILE_PATH)) {
      return [];
    }
    let raw;
    try {
      raw = await adapter.read(SESSION_FILE_PATH);
    } catch (e) {
      return [];
    }
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      return [];
    }
    if (typeof payload !== "object" || payload === null || !("version" in payload) || payload.version !== 2) {
      return [];
    }
    const sessions = payload.sessions;
    if (!Array.isArray(sessions)) return [];
    return sessions;
  }
  async writePersisted(sessions) {
    const payload = {
      version: 2,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sessions
    };
    const json2 = JSON.stringify(payload);
    if (containsSecretPattern(json2)) {
      throw new Error("Session cache V2 save blocked: serialized data contains potential secret patterns.");
    }
    const adapter = this.plugin.app.vault.adapter;
    if (!await adapter.exists(SESSION_CACHE_PATH)) {
      await adapter.mkdir(SESSION_CACHE_PATH);
    }
    await adapter.write(SESSION_FILE_PATH, json2);
  }
};
function toPersistedV2(session) {
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
    blockConfigSnapshot: session.blockConfigSnapshot,
    proposal: session.proposal,
    validation: session.validation,
    tokenUsage: session.tokenUsage,
    status: session.status,
    decision: session.decision,
    source: session.source
  });
}
function restoreSessionV2(raw) {
  var _a5, _b, _c, _d;
  if (typeof raw.id !== "string" || typeof raw.notePath !== "string" || typeof raw.noteTitle !== "string" || typeof raw.createdAt !== "string" || typeof raw.updatedAt !== "string" || typeof raw.baseFileHash !== "string" || typeof raw.baseBBlockHash !== "string" || raw.workflowProfileId !== "raw-refined" || raw.schemaVersion !== "0.2" || !VALID_STATUSES.has(raw.status)) {
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
    blockConfigSnapshot: (_a5 = raw.blockConfigSnapshot) != null ? _a5 : {
      protectH1: true,
      aBlocks: [],
      bBlock: { id: "original-content", name: "\u539F\u59CB\u5185\u5BB9", heading: "\u539F\u59CB\u5185\u5BB9", headingLevel: 2, required: true },
      tagWhitelist: []
    },
    proposal: (_b = raw.proposal) != null ? _b : {
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      blocks: []
    },
    validation: (_c = raw.validation) != null ? _c : {
      status: "invalid",
      acceptedFields: [],
      rejectedFields: [],
      warnings: ["Restored from incomplete cache entry."],
      tagNormalizationApplied: false
    },
    tokenUsage: raw.tokenUsage,
    status: raw.status,
    decision: raw.decision,
    source: (_d = raw.source) != null ? _d : { provider: "unknown", model: "unknown", attemptsUsed: 1 }
  };
}
function containsSecretPattern(json2) {
  try {
    const obj = JSON.parse(json2);
    return scanObjectForSecrets(obj);
  } catch (e) {
    return true;
  }
}
function normalizeLimit(limit) {
  if (!Number.isFinite(limit)) return DEFAULT_SESSION_CACHE_V2_LIMIT;
  return Math.max(1, Math.floor(limit));
}
function scanObjectForSecrets(obj, currentKey) {
  if (obj === null || obj === void 0) return false;
  if (currentKey !== void 0) {
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
    for (const [key, value] of Object.entries(obj)) {
      if (scanObjectForSecrets(value, key)) return true;
    }
    return false;
  }
  return false;
}

// src/adapters/obsidian/ObsidianSessionStore.ts
var SESSION_CACHE_PATH2 = ".obsidian/plugins/obsidian-refined-layer/session-cache";
var SESSION_FILE_NAME2 = "sessions.v1.json";
var SESSION_FILE_PATH2 = `${SESSION_CACHE_PATH2}/${SESSION_FILE_NAME2}`;
var VALID_STATUSES2 = /* @__PURE__ */ new Set([
  "generated",
  "reviewing",
  "applied",
  "saved_as_draft",
  "discarded",
  "conflicted"
]);
var SECRET_KEYWORDS2 = /* @__PURE__ */ new Set([
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
  "providerrawresponse"
]);
var SAFE_TOKEN_KEYS2 = /* @__PURE__ */ new Set(["inputtokens", "outputtokens", "totaltokens", "countingmode"]);
var ObsidianSessionStore = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  async saveAll(sessionsByPath) {
    const data = {};
    for (const [notePath, sessions] of sessionsByPath.entries()) {
      const persisted = sessions.map((session) => toPersisted(session)).filter(Boolean);
      if (persisted.length > 0) {
        data[notePath] = persisted;
      }
    }
    const payload = {
      version: 1,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sessionsByNotePath: data
    };
    const json2 = JSON.stringify(payload);
    if (containsSecretPattern2(json2)) {
      throw new Error("Session persistence blocked: serialized data contains potential secret patterns.");
    }
    const adapter = this.plugin.app.vault.adapter;
    const cacheDir = SESSION_CACHE_PATH2;
    if (!await adapter.exists(cacheDir)) {
      await adapter.mkdir(cacheDir);
    }
    await adapter.write(SESSION_FILE_PATH2, json2);
  }
  async loadAll() {
    const result = /* @__PURE__ */ new Map();
    const adapter = this.plugin.app.vault.adapter;
    if (!await adapter.exists(SESSION_FILE_PATH2)) {
      return result;
    }
    let raw;
    try {
      raw = await adapter.read(SESSION_FILE_PATH2);
    } catch (e) {
      return result;
    }
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      return result;
    }
    if (typeof payload !== "object" || payload === null || !("version" in payload) || payload.version !== 1) {
      return result;
    }
    const sessionsByNotePath = payload.sessionsByNotePath;
    if (typeof sessionsByNotePath !== "object" || sessionsByNotePath === null) {
      return result;
    }
    for (const [notePath, sessions] of Object.entries(sessionsByNotePath)) {
      if (!Array.isArray(sessions)) continue;
      if (!notePath.trim()) continue;
      const validSessions = [];
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
};
function toPersisted(session) {
  if (!session.id || !session.notePath || !session.createdAt || !session.updatedAt) {
    return null;
  }
  if (session.workflowProfileId !== "raw-refined") {
    return null;
  }
  if (!VALID_STATUSES2.has(session.status)) {
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
    tokenUsage: session.tokenUsage ? toPersistedTokenUsage(session.tokenUsage) : void 0,
    status: session.status,
    decision: session.decision ? toPersistedDecision(session.decision) : void 0
  };
}
function hasRequiredSections(sections) {
  return !!(sections.summary && sections.coreQuestion && sections.currentConclusion && sections.reasoning);
}
function toPersistedProposal(proposal) {
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
      refineNote: proposal.refinedSections.refineNote
    },
    frontmatterSuggestion: proposal.frontmatterSuggestion ? {
      status: proposal.frontmatterSuggestion.status,
      source: proposal.frontmatterSuggestion.source,
      context: proposal.frontmatterSuggestion.context
    } : void 0,
    tagSuggestion: proposal.tagSuggestion ? {
      add: proposal.tagSuggestion.add,
      remove: proposal.tagSuggestion.remove
    } : void 0,
    warnings: proposal.warnings
  };
}
function toPersistedTokenUsage(usage) {
  if (!usage) return void 0;
  return {
    provider: usage.provider,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    countingMode: usage.countingMode,
    generatedAt: usage.generatedAt
  };
}
function toPersistedDecision(decision) {
  return {
    acceptBody: decision.acceptBody,
    editedRefinedSections: decision.editedRefinedSections ? {
      summary: decision.editedRefinedSections.summary,
      coreQuestion: decision.editedRefinedSections.coreQuestion,
      currentConclusion: decision.editedRefinedSections.currentConclusion,
      reasoning: decision.editedRefinedSections.reasoning,
      scope: decision.editedRefinedSections.scope,
      nextSteps: decision.editedRefinedSections.nextSteps,
      refineNote: decision.editedRefinedSections.refineNote
    } : void 0,
    acceptFrontmatter: {
      status: decision.acceptFrontmatter.status,
      source: decision.acceptFrontmatter.source,
      context: decision.acceptFrontmatter.context
    },
    acceptTags: {
      add: decision.acceptTags.add,
      remove: decision.acceptTags.remove
    },
    saveAsDraftOnly: decision.saveAsDraftOnly
  };
}
function containsSecretPattern2(json2) {
  try {
    const obj = JSON.parse(json2);
    return scanObjectForSecrets2(obj);
  } catch (e) {
    return true;
  }
}
function scanObjectForSecrets2(obj, currentKey) {
  if (obj === null || obj === void 0) return false;
  if (currentKey !== void 0) {
    const lower = currentKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (SECRET_KEYWORDS2.has(lower) && !SAFE_TOKEN_KEYS2.has(lower)) {
      return true;
    }
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (scanObjectForSecrets2(item)) return true;
    }
    return false;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      if (scanObjectForSecrets2(value, key)) return true;
    }
    return false;
  }
  return false;
}
function restoreSession(raw) {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw;
  if (typeof s.id !== "string" || typeof s.notePath !== "string" || typeof s.noteTitle !== "string" || typeof s.createdAt !== "string" || typeof s.updatedAt !== "string" || typeof s.baseFileHash !== "string" || typeof s.policySnapshotId !== "string" || s.workflowProfileId !== "raw-refined" || !VALID_STATUSES2.has(s.status)) {
    return null;
  }
  const proposal = restoreProposal(s.proposal);
  if (!proposal) return null;
  return {
    id: s.id,
    workflowProfileId: s.workflowProfileId,
    policySnapshotId: s.policySnapshotId,
    notePath: s.notePath,
    noteTitle: s.noteTitle,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    baseFileHash: s.baseFileHash,
    baseFrontmatterHash: typeof s.baseFrontmatterHash === "string" ? s.baseFrontmatterHash : void 0,
    baseProtectedRegionHash: typeof s.baseProtectedRegionHash === "string" ? s.baseProtectedRegionHash : void 0,
    proposal,
    tokenUsage: restoreTokenUsage(s.tokenUsage),
    status: s.status,
    decision: restoreDecision(s.decision)
  };
}
function restoreProposal(raw) {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw;
  if (p.workflowProfileId !== "raw-refined") return null;
  if (typeof p.refinedSections !== "object" || p.refinedSections === null) return null;
  const sections = p.refinedSections;
  if (typeof sections.summary !== "string" || typeof sections.coreQuestion !== "string" || typeof sections.currentConclusion !== "string" || typeof sections.reasoning !== "string") {
    return null;
  }
  return {
    workflowProfileId: "raw-refined",
    refinedSections: {
      summary: sections.summary,
      coreQuestion: sections.coreQuestion,
      currentConclusion: sections.currentConclusion,
      reasoning: sections.reasoning,
      scope: typeof sections.scope === "string" ? sections.scope : void 0,
      nextSteps: typeof sections.nextSteps === "string" ? sections.nextSteps : void 0,
      refineNote: typeof sections.refineNote === "string" ? sections.refineNote : void 0
    },
    frontmatterSuggestion: restoreFrontmatterSuggestion(p.frontmatterSuggestion),
    tagSuggestion: restoreTagSuggestion(p.tagSuggestion),
    warnings: Array.isArray(p.warnings) ? p.warnings.filter((w) => typeof w === "string") : void 0
  };
}
function restoreTokenUsage(raw) {
  if (typeof raw !== "object" || raw === null) return void 0;
  const t2 = raw;
  const validModes = /* @__PURE__ */ new Set(["actual", "estimated", "mixed", "unavailable"]);
  if (typeof t2.provider !== "string" || typeof t2.model !== "string" || typeof t2.countingMode !== "string" || !validModes.has(t2.countingMode)) {
    return void 0;
  }
  return {
    provider: t2.provider,
    model: t2.model,
    inputTokens: typeof t2.inputTokens === "number" ? t2.inputTokens : void 0,
    outputTokens: typeof t2.outputTokens === "number" ? t2.outputTokens : void 0,
    totalTokens: typeof t2.totalTokens === "number" ? t2.totalTokens : void 0,
    countingMode: t2.countingMode,
    generatedAt: typeof t2.generatedAt === "string" ? t2.generatedAt : (/* @__PURE__ */ new Date()).toISOString()
  };
}
function restoreFrontmatterSuggestion(raw) {
  if (typeof raw !== "object" || raw === null) return void 0;
  const f = raw;
  return {
    status: f.status,
    source: Array.isArray(f.source) ? f.source.filter((s) => typeof s === "string") : void 0,
    context: Array.isArray(f.context) ? f.context.filter((c) => typeof c === "string") : void 0
  };
}
function restoreTagSuggestion(raw) {
  if (typeof raw !== "object" || raw === null) return void 0;
  const t2 = raw;
  return {
    add: Array.isArray(t2.add) ? t2.add.filter((a) => typeof a === "string") : void 0,
    remove: Array.isArray(t2.remove) ? t2.remove.filter((r) => typeof r === "string") : void 0
  };
}
function restoreDecision(raw) {
  if (typeof raw !== "object" || raw === null) return void 0;
  const d = raw;
  return {
    acceptBody: d.acceptBody === true,
    editedRefinedSections: void 0,
    // never restore edited sections — they are transient
    acceptFrontmatter: {
      status: d.acceptFrontmatter && typeof d.acceptFrontmatter === "object" ? d.acceptFrontmatter.status === true : void 0,
      source: d.acceptFrontmatter && typeof d.acceptFrontmatter === "object" ? d.acceptFrontmatter.source === true : void 0,
      context: d.acceptFrontmatter && typeof d.acceptFrontmatter === "object" ? d.acceptFrontmatter.context === true : void 0
    },
    acceptTags: {
      add: d.acceptTags && typeof d.acceptTags === "object" ? Array.isArray(d.acceptTags.add) ? d.acceptTags.add.filter((a) => typeof a === "string") : void 0 : void 0,
      remove: d.acceptTags && typeof d.acceptTags === "object" ? Array.isArray(d.acceptTags.remove) ? d.acceptTags.remove.filter((r) => typeof r === "string") : void 0 : void 0
    },
    saveAsDraftOnly: d.saveAsDraftOnly === true
  };
}

// src/settings/PluginSettings.ts
var DEFAULT_TAG_WHITELIST = [
  "#ai/generated",
  "#ai/assisted",
  "#ai/reviewed",
  "#ai/suggested",
  "#todo/refine",
  "#todo/link",
  "#todo/review",
  "#flag/core",
  "#flag/sensitive"
];
var DEFAULT_A_BLOCKS = [
  {
    id: "summary",
    name: "\u6458\u8981",
    heading: "\u6458\u8981",
    headingLevel: 2,
    prompt: "\u7528\u4E2D\u6587\u751F\u6210\u4E00\u6BB5\u7B80\u6D01\u7684\u6458\u8981\uFF0C\u6982\u62EC\u7B14\u8BB0\u7684\u6838\u5FC3\u5185\u5BB9\u3002",
    order: 1,
    enabled: true
  },
  {
    id: "coreQuestion",
    name: "\u6838\u5FC3\u95EE\u9898",
    heading: "\u6838\u5FC3\u95EE\u9898",
    headingLevel: 2,
    prompt: "\u63D0\u70BC\u7B14\u8BB0\u8981\u89E3\u51B3\u7684\u6838\u5FC3\u95EE\u9898\u6216\u4E3B\u8981\u7591\u95EE\u3002",
    order: 2,
    enabled: true
  },
  {
    id: "currentConclusion",
    name: "\u5F53\u524D\u7ED3\u8BBA",
    heading: "\u5F53\u524D\u7ED3\u8BBA",
    headingLevel: 2,
    prompt: "\u603B\u7ED3\u5F53\u524D\u7B14\u8BB0\u5DF2\u7ECF\u5F97\u51FA\u7684\u7ED3\u8BBA\u6216\u5224\u65AD\u3002",
    order: 3,
    enabled: true
  },
  {
    id: "reasoning",
    name: "\u4F9D\u636E\u4E0E\u63A8\u7406",
    heading: "\u4F9D\u636E\u4E0E\u63A8\u7406",
    headingLevel: 2,
    prompt: "\u6574\u7406\u7B14\u8BB0\u4E2D\u7684\u63A8\u7406\u8FC7\u7A0B\u3001\u8BC1\u636E\u548C\u903B\u8F91\u94FE\u3002",
    order: 4,
    enabled: true
  },
  {
    id: "scope",
    name: "\u9002\u7528\u8FB9\u754C",
    heading: "\u9002\u7528\u8FB9\u754C",
    headingLevel: 2,
    prompt: "\u6307\u51FA\u7ED3\u8BBA\u7684\u9002\u7528\u8303\u56F4\u3001\u9650\u5236\u6761\u4EF6\u548C\u8FB9\u754C\u60C5\u51B5\u3002\u5982\u65E0\u660E\u786E\u8FB9\u754C\uFF0C\u53EF\u7559\u7A7A\u3002",
    order: 5,
    enabled: true
  },
  {
    id: "nextSteps",
    name: "\u540E\u7EED\u5904\u7406",
    heading: "\u540E\u7EED\u5904\u7406",
    headingLevel: 2,
    prompt: "\u5217\u51FA\u9700\u8981\u8FDB\u4E00\u6B65\u7814\u7A76\u6216\u5904\u7406\u7684\u4E8B\u9879\u3002\u5982\u65E0\u540E\u7EED\u4E8B\u9879\uFF0C\u53EF\u7559\u7A7A\u3002",
    order: 6,
    enabled: true
  },
  {
    id: "refineNote",
    name: "\u6574\u7406\u8BF4\u660E",
    heading: "\u6574\u7406\u8BF4\u660E",
    headingLevel: 2,
    prompt: "\u8BF4\u660E\u672C\u6B21\u6574\u7406\u505A\u4E86\u4EC0\u4E48\u6539\u52A8\u3001\u4E3A\u4F55\u505A\u8FD9\u4E9B\u6539\u52A8\u3002\u5982\u65E0\u7279\u522B\u8BF4\u660E\uFF0C\u53EF\u7559\u7A7A\u3002",
    order: 7,
    enabled: true
  }
];
var DEFAULT_B_BLOCK = {
  id: "original-content",
  name: "\u539F\u59CB\u5185\u5BB9",
  heading: "\u539F\u59CB\u5185\u5BB9",
  headingLevel: 2,
  required: true
};
var DEFAULT_PLUGIN_SETTINGS = {
  language: "zh-CN",
  historyLimit: 5,
  draftFolder: "80_Runtime/refine-drafts",
  provider: {
    type: "mock"
  },
  promptOverrides: {},
  rawRefined: {
    protectH1: true,
    aBlocks: DEFAULT_A_BLOCKS,
    bBlock: DEFAULT_B_BLOCK,
    tagWhitelist: DEFAULT_TAG_WHITELIST,
    tagPrompt: "\u4ECE tagWhitelist \u4E2D\u9009\u62E9\u5408\u9002\u7684\u6807\u7B7E\u4F5C\u4E3A selectedTags\uFF0C\u5982\u6709\u5FC5\u8981\u5EFA\u8BAE\u65B0\u6807\u7B7E\u4F5C\u4E3A newTagSuggestions\u3002\u4E0D\u8981\u5C06\u975E\u767D\u540D\u5355\u6807\u7B7E\u653E\u5165 selectedTags\u3002",
    promptObservationEnabled: false
  },
  sessionCache: {
    limit: 5
  },
  errorSessionCache: {
    enabled: true,
    limit: 30
  }
};

// src/adapters/obsidian/ObsidianSettingsStore.ts
var ObsidianSettingsStore = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  async load() {
    const loaded = await this.plugin.loadData();
    return mergeSettings(loaded);
  }
  async save(settings) {
    await this.plugin.saveData(sanitizeSettings(settings));
  }
};
function mergeSettings(value) {
  var _a5, _b, _c, _d, _e, _f, _g, _h;
  const loaded = typeof value === "object" && value !== null ? value : {};
  const rawRefined = (_a5 = loaded.rawRefined) != null ? _a5 : DEFAULT_PLUGIN_SETTINGS.rawRefined;
  const sessionCache = (_b = loaded.sessionCache) != null ? _b : loaded.historyLimit !== void 0 ? { limit: loaded.historyLimit } : DEFAULT_PLUGIN_SETTINGS.sessionCache;
  return {
    ...DEFAULT_PLUGIN_SETTINGS,
    ...loaded,
    provider: (_c = loaded.provider) != null ? _c : DEFAULT_PLUGIN_SETTINGS.provider,
    promptOverrides: (_d = loaded.promptOverrides) != null ? _d : DEFAULT_PLUGIN_SETTINGS.promptOverrides,
    rawRefined: {
      ...DEFAULT_PLUGIN_SETTINGS.rawRefined,
      ...rawRefined,
      aBlocks: (_e = rawRefined.aBlocks) != null ? _e : DEFAULT_PLUGIN_SETTINGS.rawRefined.aBlocks,
      bBlock: (_f = rawRefined.bBlock) != null ? _f : DEFAULT_PLUGIN_SETTINGS.rawRefined.bBlock,
      tagWhitelist: (_g = rawRefined.tagWhitelist) != null ? _g : DEFAULT_PLUGIN_SETTINGS.rawRefined.tagWhitelist
    },
    sessionCache,
    errorSessionCache: (_h = loaded.errorSessionCache) != null ? _h : DEFAULT_PLUGIN_SETTINGS.errorSessionCache
  };
}
function sanitizeSettings(settings) {
  var _a5, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
  const sanitized = {
    language: settings.language,
    historyLimit: settings.historyLimit,
    draftFolder: settings.draftFolder,
    provider: settings.provider ? sanitizeProvider(settings.provider) : void 0,
    promptOverrides: (_a5 = settings.promptOverrides) != null ? _a5 : {},
    rawRefined: {
      protectH1: (_c = (_b = settings.rawRefined) == null ? void 0 : _b.protectH1) != null ? _c : true,
      aBlocks: ((_e = (_d = settings.rawRefined) == null ? void 0 : _d.aBlocks) != null ? _e : []).map((b) => ({
        id: b.id,
        name: b.name,
        heading: b.heading,
        headingLevel: b.headingLevel,
        prompt: b.prompt,
        order: b.order,
        enabled: b.enabled
      })),
      bBlock: (_g = (_f = settings.rawRefined) == null ? void 0 : _f.bBlock) != null ? _g : DEFAULT_PLUGIN_SETTINGS.rawRefined.bBlock,
      tagWhitelist: (_i = (_h = settings.rawRefined) == null ? void 0 : _h.tagWhitelist) != null ? _i : [],
      tagPrompt: (_k = (_j = settings.rawRefined) == null ? void 0 : _j.tagPrompt) != null ? _k : "",
      promptObservationEnabled: (_m = (_l = settings.rawRefined) == null ? void 0 : _l.promptObservationEnabled) != null ? _m : false
    },
    sessionCache: {
      limit: (_o = (_n = settings.sessionCache) == null ? void 0 : _n.limit) != null ? _o : 5
    },
    errorSessionCache: {
      enabled: (_q = (_p = settings.errorSessionCache) == null ? void 0 : _p.enabled) != null ? _q : true,
      limit: (_s = (_r = settings.errorSessionCache) == null ? void 0 : _r.limit) != null ? _s : 30
    }
  };
  return sanitized;
}
function sanitizeProvider(provider) {
  return {
    type: provider.type,
    ...provider.model ? { model: provider.model } : {},
    ...provider.secretRef ? { secretRef: provider.secretRef } : {},
    ...provider.baseUrl ? { baseUrl: provider.baseUrl } : {}
  };
}

// src/core/profile/FrontmatterParser.ts
function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n") && !markdown.startsWith("---\r\n")) {
    return {
      hasFrontmatter: false,
      frontmatter: {},
      body: markdown
    };
  }
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length < 3 || lines[0] !== "---") {
    return {
      hasFrontmatter: false,
      frontmatter: {},
      body: markdown
    };
  }
  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) {
    return {
      hasFrontmatter: false,
      frontmatter: {},
      body: markdown
    };
  }
  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join("\n");
  const frontmatter = {};
  let currentArrayKey = null;
  for (const line of frontmatterLines) {
    if (/^\s*-\s+/.test(line)) {
      if (!currentArrayKey) {
        continue;
      }
      const value2 = line.replace(/^\s*-\s+/, "").trim();
      const existing = frontmatter[currentArrayKey];
      if (Array.isArray(existing)) {
        existing.push(stripQuotes(value2));
      }
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      currentArrayKey = null;
      continue;
    }
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (value === "") {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }
    currentArrayKey = null;
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      frontmatter[key] = inner === "" ? [] : inner.split(",").map((item) => stripQuotes(item.trim()));
      continue;
    }
    frontmatter[key] = stripQuotes(value);
  }
  return {
    hasFrontmatter: true,
    frontmatter,
    body
  };
}
function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

// src/core/apply/FrontmatterTagApplier.ts
function applyFrontmatterChanges(markdown, changes) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parsed = parseFrontmatter(normalized);
  const base = parsed.hasFrontmatter ? parsed.frontmatter : {};
  const nextFrontmatter = {
    ...base
  };
  if (changes.status) {
    nextFrontmatter.status = changes.status;
  }
  if (changes.source) {
    nextFrontmatter.source = changes.source;
  }
  if (changes.context) {
    nextFrontmatter.context = changes.context;
  }
  const body = parsed.hasFrontmatter ? parsed.body : normalized;
  return `---
${serializeFrontmatter(nextFrontmatter)}
---
${trimLeadingNewlines(body)}`;
}
function applyTagChanges(markdown, add, remove, profile) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parsed = parseFrontmatter(normalized);
  const base = parsed.hasFrontmatter ? parsed.frontmatter : {};
  const currentTags = Array.isArray(base.tags) ? base.tags : [];
  const nextTags = new Set(currentTags.filter((tag) => typeof tag === "string"));
  for (const tag of add) {
    if (isAllowedTag(tag, profile)) {
      nextTags.add(tag);
    }
  }
  for (const tag of remove) {
    nextTags.delete(tag);
  }
  const nextFrontmatter = {
    ...base,
    tags: [...nextTags]
  };
  const body = parsed.hasFrontmatter ? parsed.body : normalized;
  return `---
${serializeFrontmatter(nextFrontmatter)}
---
${trimLeadingNewlines(body)}`;
}
function appendTags(markdown, tags) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parsed = parseFrontmatter(normalized);
  const base = parsed.hasFrontmatter ? parsed.frontmatter : {};
  const currentTags = Array.isArray(base.tags) ? base.tags : [];
  const nextTags = new Set(currentTags.filter((tag) => typeof tag === "string"));
  for (const tag of tags) {
    nextTags.add(tag);
  }
  const nextFrontmatter = {
    ...base,
    tags: [...nextTags]
  };
  const body = parsed.hasFrontmatter ? parsed.body : normalized;
  return `---
${serializeFrontmatter(nextFrontmatter)}
---
${trimLeadingNewlines(body)}`;
}
function isAllowedTag(tag, profile) {
  return profile.tags.allowedTags.includes(tag) && !profile.tags.blockedTags.some((blocked) => blocked.endsWith("*") ? tag.startsWith(blocked.slice(0, -1)) : tag === blocked);
}
function serializeFrontmatter(frontmatter) {
  return Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return `${key}: []`;
      }
      return `${key}:
${value.map((item) => `  - ${item}`).join("\n")}`;
    }
    return `${key}: ${value}`;
  }).join("\n");
}
function trimLeadingNewlines(value) {
  return value.replace(/^\n+/, "");
}

// src/core/markdown/MarkdownAssembler.ts
var MarkdownAssembler = class {
  assemble(input) {
    const parts = [];
    if (input.protectH1 && input.firstH1Text) {
      parts.push(`# ${input.firstH1Text}`);
    }
    const sorted = [...input.acceptedABlocks].sort(
      (a, b) => a.config.order - b.config.order
    );
    for (const block of sorted) {
      const heading = `${"#".repeat(block.config.headingLevel)} ${block.config.heading}`;
      parts.push(`${heading}

${block.content.trimEnd()}`);
    }
    parts.push(input.bBlockText);
    return parts.join("\n\n") + "\n";
  }
};

// src/core/protected-region/hash.ts
var import_node_crypto = require("node:crypto");
function hashText(text) {
  return (0, import_node_crypto.createHash)("sha256").update(text, "utf8").digest("hex");
}

// src/core/markdown/HeadingParser.ts
var HeadingParser = class {
  parse(markdown) {
    const headings = [];
    let firstH1;
    const frontmatterEnd = this.findFrontmatterEnd(markdown);
    let pos = 0;
    let lineIndex = 0;
    const len = markdown.length;
    while (pos < len) {
      const lineStart = pos;
      const newlineIdx = markdown.indexOf("\n", pos);
      const lineEnd = newlineIdx === -1 ? len : newlineIdx;
      const line = markdown.slice(lineStart, lineEnd);
      const heading = this.parseAtxHeading(line, lineIndex, lineStart, lineEnd);
      if (heading) {
        headings.push(heading);
        if (!firstH1 && heading.level === 1 && lineStart >= frontmatterEnd) {
          firstH1 = heading;
        }
      }
      pos = lineEnd + (newlineIdx === -1 ? 0 : 1);
      lineIndex++;
    }
    return { headings, firstH1 };
  }
  findFrontmatterEnd(markdown) {
    if (!markdown.startsWith("---")) return 0;
    const closingIdx = markdown.indexOf("\n---", 3);
    if (closingIdx === -1) return 0;
    const nextNewline = markdown.indexOf("\n", closingIdx + 4);
    return nextNewline === -1 ? markdown.length : nextNewline + 1;
  }
  parseAtxHeading(line, lineIndex, charStart, charEnd) {
    const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line;
    const match = normalizedLine.match(/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/);
    if (!match) return null;
    const level = match[1].length;
    const text = match[2].trim();
    if (text.length === 0) return null;
    return { level, text, lineIndex, charStart, charEnd };
  }
};

// src/core/markdown/BlockExtractor.ts
var BlockExtractor = class {
  constructor() {
    this.headingParser = new HeadingParser();
  }
  extract(markdown, config2) {
    const { headings } = this.headingParser.parse(markdown);
    const matches = headings.filter(
      (h) => h.text === config2.heading && h.level === config2.headingLevel
    );
    if (matches.length === 0) {
      const sameTextDiffLevel = headings.find((h) => h.text === config2.heading);
      if (sameTextDiffLevel) {
        return {
          ok: false,
          error: {
            code: "heading-level-mismatch",
            message: `Heading "${config2.heading}" found at level ${sameTextDiffLevel.level}, but config expects level ${config2.headingLevel}.`
          }
        };
      }
      return {
        ok: false,
        error: {
          code: "missing-heading",
          message: `Required B block heading "${config2.heading}" (level ${config2.headingLevel}) was not found.`
        }
      };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        error: {
          code: "multiple-heading",
          message: `B block heading "${config2.heading}" (level ${config2.headingLevel}) appears ${matches.length} times.`
        }
      };
    }
    const bHeading = matches[0];
    return this.extractRange(markdown, bHeading, config2);
  }
  extractRange(markdown, bHeading, config2) {
    const { headings } = this.headingParser.parse(markdown);
    const nextBoundaryHeading = headings.find(
      (h) => h.lineIndex > bHeading.lineIndex && h.level <= config2.headingLevel
    );
    const blockEnd = nextBoundaryHeading ? nextBoundaryHeading.charStart : markdown.length;
    const text = markdown.slice(bHeading.charStart, blockEnd);
    const trimmedText = text.replace(/[\s\r\n]+$/, "");
    const headingLine = `${"#".repeat(config2.headingLevel)} ${config2.heading}`;
    if (trimmedText.trim() === headingLine) {
      return {
        ok: false,
        error: {
          code: "empty-b-block",
          message: `B block heading "${config2.heading}" has no content after it.`
        }
      };
    }
    return {
      ok: true,
      block: {
        heading: config2.heading,
        headingLevel: config2.headingLevel,
        text: trimmedText,
        charStart: bHeading.charStart,
        charEnd: blockEnd,
        hash: hashText(trimmedText)
      }
    };
  }
};

// src/core/protected-region/ProtectedRegionExtractor.ts
var ProtectedRegionExtractor = class {
  extract(markdown, definition) {
    var _a5;
    if (definition.mode !== "from-heading-to-end") {
      return {
        ok: false,
        error: {
          code: "unsupported-mode",
          message: `Protected region mode ${definition.mode} is not implemented in v0.1.0.`
        }
      };
    }
    const headingPattern = new RegExp(`^${escapeRegExp(definition.heading)}\\s*\\r?$`, "gm");
    const matches = [...markdown.matchAll(headingPattern)];
    if (matches.length === 0) {
      return {
        ok: false,
        error: {
          code: "missing-heading",
          message: `Required heading ${definition.heading} was not found.`
        }
      };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        error: {
          code: "multiple-heading",
          message: `Protected heading ${definition.heading} appears multiple times.`
        }
      };
    }
    const regionStart = (_a5 = matches[0].index) != null ? _a5 : 0;
    const text = markdown.slice(regionStart);
    if (text.trim() === definition.heading) {
      return {
        ok: false,
        error: {
          code: "empty-protected-region",
          message: `Protected heading ${definition.heading} has no content after it.`
        }
      };
    }
    return {
      ok: true,
      region: {
        id: definition.id,
        heading: definition.heading,
        mode: definition.mode,
        text
      }
    };
  }
};
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/application/ApplyDecisionUseCase.ts
var ApplyDecisionUseCase = class {
  constructor(profile, sessionStore, noteFilePort, sessionCacheV2) {
    this.profile = profile;
    this.sessionStore = sessionStore;
    this.noteFilePort = noteFilePort;
    this.sessionCacheV2 = sessionCacheV2;
    this.extractor = new ProtectedRegionExtractor();
    this.blockExtractor = new BlockExtractor();
    this.markdownAssembler = new MarkdownAssembler();
  }
  async execute(plan) {
    const session = await this.sessionStore.get(plan.sessionId);
    if (!session) {
      return {
        kind: "failed",
        code: "missing-session",
        message: `Proposal session ${plan.sessionId} was not found.`
      };
    }
    const note = await this.noteFilePort.readNoteByPath(plan.notePath);
    if (!note) {
      return {
        kind: "failed",
        code: "missing-note",
        message: `Target note ${plan.notePath} was not found.`
      };
    }
    if (hashText(note.content) !== session.baseFileHash) {
      session.status = "conflicted";
      session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.sessionStore.save(session);
      return this.conflict("file-changed");
    }
    const protectedRegion = this.extractor.extract(
      note.content,
      this.profile.protectedRegions.definitions[0]
    );
    if (!protectedRegion.ok) {
      return {
        kind: "failed",
        code: protectedRegion.error.code,
        message: protectedRegion.error.message
      };
    }
    if (hashText(protectedRegion.region.text) !== session.baseProtectedRegionHash) {
      session.status = "conflicted";
      session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.sessionStore.save(session);
      return this.conflict("protected-region-changed");
    }
    let nextContent = note.content;
    for (const operation of plan.operations) {
      switch (operation.type) {
        case "replace-refined-body":
          nextContent = mergeBodyIntoMarkdown(nextContent, operation.body, protectedRegion.region.text);
          break;
        case "update-frontmatter":
          nextContent = applyFrontmatterChanges(nextContent, operation.changes);
          break;
        case "update-tags":
          nextContent = applyTagChanges(nextContent, operation.add, operation.remove, this.profile);
          break;
      }
    }
    const postApplyRegion = this.extractor.extract(
      nextContent,
      this.profile.protectedRegions.definitions[0]
    );
    if (!postApplyRegion.ok) {
      return {
        kind: "failed",
        code: postApplyRegion.error.code,
        message: `Apply aborted: ${postApplyRegion.error.message}`
      };
    }
    if (postApplyRegion.region.text !== protectedRegion.region.text) {
      return {
        kind: "failed",
        code: "protected-region-corrupted",
        message: "Apply aborted: protected region changed during assembly."
      };
    }
    await this.noteFilePort.writeNote(plan.notePath, nextContent);
    session.status = "applied";
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    session.applyPlan = plan;
    await this.sessionStore.save(session);
    return {
      kind: "applied",
      notePath: plan.notePath
    };
  }
  conflict(reason) {
    return {
      kind: "conflict",
      reason,
      options: ["save-draft", "regenerate", "manual-copy", "discard"]
    };
  }
  async executeV2(plan) {
    var _a5, _b, _c;
    const session = await this.findSessionV2(plan.sessionId);
    if (!session) {
      return {
        kind: "failed",
        code: "missing-session",
        message: `Proposal session ${plan.sessionId} was not found.`
      };
    }
    const note = await this.noteFilePort.readNoteByPath(plan.notePath);
    if (!note) {
      return {
        kind: "failed",
        code: "missing-note",
        message: `Target note ${plan.notePath} was not found.`
      };
    }
    if (hashText(note.content) !== session.baseFileHash) {
      session.status = "conflicted";
      session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await ((_a5 = this.sessionCacheV2) == null ? void 0 : _a5.save(session));
      return this.conflict("file-changed");
    }
    const bBlock = this.blockExtractor.extract(note.content, session.blockConfigSnapshot.bBlock);
    if (!bBlock.ok) {
      return {
        kind: "failed",
        code: bBlock.error.code,
        message: bBlock.error.message
      };
    }
    if (hashText(bBlock.block.text) !== session.baseBBlockHash) {
      session.status = "conflicted";
      session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await ((_b = this.sessionCacheV2) == null ? void 0 : _b.save(session));
      return this.conflict("protected-region-changed");
    }
    let nextContent = note.content;
    for (const operation of plan.operations) {
      switch (operation.type) {
        case "replace-refined-blocks":
          nextContent = this.replaceRefinedBlocks(nextContent, operation.blocks, bBlock.block.text, session);
          break;
        case "update-frontmatter":
          nextContent = applyFrontmatterChanges(nextContent, operation.changes);
          break;
        case "append-tags": {
          const allowed = this.filterAppendTags(operation.tags, session);
          nextContent = appendTags(nextContent, allowed);
          break;
        }
        case "replace-refined-body":
        case "update-tags":
          return {
            kind: "failed",
            code: "unsupported-v2-operation",
            message: `Apply operation ${operation.type} is not supported by the v0.2 apply path.`
          };
      }
    }
    const postApplyBBlock = this.blockExtractor.extract(nextContent, session.blockConfigSnapshot.bBlock);
    if (!postApplyBBlock.ok) {
      return {
        kind: "failed",
        code: postApplyBBlock.error.code,
        message: `Apply aborted: ${postApplyBBlock.error.message}`
      };
    }
    if (postApplyBBlock.block.text !== bBlock.block.text) {
      return {
        kind: "failed",
        code: "b-block-corrupted",
        message: "Apply aborted: B block changed during assembly."
      };
    }
    await this.noteFilePort.writeNote(plan.notePath, nextContent);
    session.status = "applied";
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await ((_c = this.sessionCacheV2) == null ? void 0 : _c.save(session));
    return {
      kind: "applied",
      notePath: plan.notePath
    };
  }
  replaceRefinedBlocks(currentContent, blocks, bBlockText, session) {
    const configById = new Map(session.blockConfigSnapshot.aBlocks.map((config2) => [config2.id, config2]));
    const acceptedABlocks = blocks.map((block) => {
      const config2 = configById.get(block.id);
      return config2 ? { config: config2, content: block.content } : null;
    }).filter(Boolean);
    const assembledBody = this.markdownAssembler.assemble({
      acceptedABlocks,
      bBlockText,
      firstH1Text: getFirstH1Text(currentContent),
      protectH1: session.blockConfigSnapshot.protectH1
    });
    return replaceMarkdownBody(currentContent, assembledBody);
  }
  filterAppendTags(tags, session) {
    var _a5, _b;
    const selectedTags = new Set((_b = (_a5 = session.proposal.tagSuggestion) == null ? void 0 : _a5.selectedTags) != null ? _b : []);
    const whitelist = new Set(session.blockConfigSnapshot.tagWhitelist);
    return [...new Set(tags.filter((tag) => selectedTags.has(tag) && whitelist.has(tag)))];
  }
  async findSessionV2(sessionId) {
    var _a5, _b;
    const sessions = await ((_a5 = this.sessionCacheV2) == null ? void 0 : _a5.loadAll());
    return (_b = sessions == null ? void 0 : sessions.find((session) => session.id === sessionId)) != null ? _b : null;
  }
};
function mergeBodyIntoMarkdown(markdown, body, currentProtectedRegion) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  let frontmatterBlock = "";
  let afterFrontmatter = normalized;
  if (normalized.startsWith("---\n") || normalized.startsWith("---\r\n")) {
    const closingIndex = normalized.indexOf("\n---\n", 4);
    if (closingIndex !== -1) {
      frontmatterBlock = normalized.slice(0, closingIndex + 5);
      afterFrontmatter = normalized.slice(closingIndex + 5).replace(/^\n+/, "");
    }
  }
  let h1Line = "";
  const h1Match = afterFrontmatter.match(/^#\s+[^\n]+/);
  if (h1Match) {
    h1Line = h1Match[0];
  }
  const refinedBody = stripProtectedRegionFromBody(body);
  const parts = [];
  if (frontmatterBlock) parts.push(frontmatterBlock);
  if (h1Line) parts.push(h1Line);
  parts.push(refinedBody);
  parts.push(currentProtectedRegion);
  return parts.join("\n");
}
function stripProtectedRegionFromBody(body) {
  const normalized = body.replace(/\r\n/g, "\n");
  const headingIndex = normalized.indexOf("\n## \u539F\u59CB\u5185\u5BB9");
  if (headingIndex === -1) {
    return normalized;
  }
  return normalized.slice(0, headingIndex);
}
function replaceMarkdownBody(markdown, nextBody) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parsed = parseFrontmatter(normalized);
  if (!parsed.hasFrontmatter) {
    return nextBody;
  }
  return `---
${serializeFrontmatterForApply(parsed.frontmatter)}
---
${nextBody.replace(/^\n+/, "")}`;
}
function getFirstH1Text(markdown) {
  const parsed = parseFrontmatter(markdown.replace(/\r\n/g, "\n"));
  const body = parsed.hasFrontmatter ? parsed.body : markdown;
  const match = body.match(/^#\s+(.+)$/m);
  return match == null ? void 0 : match[1];
}
function serializeFrontmatterForApply(frontmatter) {
  return Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return `${key}: []`;
      return `${key}:
${value.map((item) => `  - ${item}`).join("\n")}`;
    }
    return `${key}: ${value}`;
  }).join("\n");
}

// src/core/apply/ApplyPlanner.ts
var ApplyPlanner = class {
  buildPlan(session, decision, body) {
    var _a5, _b, _c, _d, _e;
    const operations = [];
    if (decision.acceptBody && body) {
      operations.push({
        type: "replace-refined-body",
        targetPath: session.notePath,
        body
      });
    }
    const frontmatterChanges = {
      ...decision.acceptFrontmatter.status && ((_a5 = session.proposal.frontmatterSuggestion) == null ? void 0 : _a5.status) ? { status: session.proposal.frontmatterSuggestion.status } : {},
      ...decision.acceptFrontmatter.source && ((_b = session.proposal.frontmatterSuggestion) == null ? void 0 : _b.source) ? { source: session.proposal.frontmatterSuggestion.source } : {},
      ...decision.acceptFrontmatter.context && ((_c = session.proposal.frontmatterSuggestion) == null ? void 0 : _c.context) ? { context: session.proposal.frontmatterSuggestion.context } : {}
    };
    if (Object.keys(frontmatterChanges).length > 0) {
      operations.push({
        type: "update-frontmatter",
        targetPath: session.notePath,
        changes: frontmatterChanges
      });
    }
    const add = ((_d = decision.acceptTags.add) != null ? _d : []).filter((tag) => {
      var _a6, _b2;
      return (_b2 = (_a6 = session.proposal.tagSuggestion) == null ? void 0 : _a6.add) == null ? void 0 : _b2.includes(tag);
    });
    const remove = ((_e = decision.acceptTags.remove) != null ? _e : []).filter((tag) => {
      var _a6, _b2;
      return (_b2 = (_a6 = session.proposal.tagSuggestion) == null ? void 0 : _a6.remove) == null ? void 0 : _b2.includes(tag);
    });
    if (add.length > 0 || remove.length > 0) {
      operations.push({
        type: "update-tags",
        targetPath: session.notePath,
        add,
        remove
      });
    }
    return {
      notePath: session.notePath,
      sessionId: session.id,
      operations
    };
  }
  buildPlanV2(session, decision) {
    var _a5, _b, _c, _d, _e;
    const operations = [];
    const acceptedBlockIds = new Set(
      Object.entries(decision.acceptBlocks).filter(([, accepted]) => accepted).map(([id]) => id)
    );
    const configById = new Map(session.blockConfigSnapshot.aBlocks.map((block) => [block.id, block]));
    const acceptedBlocks = session.proposal.blocks.filter((block) => acceptedBlockIds.has(block.id)).map((block) => {
      var _a6, _b2;
      const config2 = configById.get(block.id);
      return {
        id: block.id,
        heading: (_a6 = config2 == null ? void 0 : config2.heading) != null ? _a6 : block.id,
        headingLevel: (_b2 = config2 == null ? void 0 : config2.headingLevel) != null ? _b2 : 2,
        content: block.content
      };
    });
    if (acceptedBlocks.length > 0) {
      operations.push({
        type: "replace-refined-blocks",
        targetPath: session.notePath,
        blocks: acceptedBlocks
      });
    }
    const frontmatterChanges = {
      ...decision.acceptFrontmatter.status && ((_a5 = session.proposal.frontmatterSuggestion) == null ? void 0 : _a5.status) ? { status: session.proposal.frontmatterSuggestion.status } : {},
      ...decision.acceptFrontmatter.source && ((_b = session.proposal.frontmatterSuggestion) == null ? void 0 : _b.source) ? { source: session.proposal.frontmatterSuggestion.source } : {},
      ...decision.acceptFrontmatter.context && ((_c = session.proposal.frontmatterSuggestion) == null ? void 0 : _c.context) ? { context: session.proposal.frontmatterSuggestion.context } : {}
    };
    if (Object.keys(frontmatterChanges).length > 0) {
      operations.push({
        type: "update-frontmatter",
        targetPath: session.notePath,
        changes: frontmatterChanges
      });
    }
    const selectedTags = new Set((_e = (_d = session.proposal.tagSuggestion) == null ? void 0 : _d.selectedTags) != null ? _e : []);
    const whitelist = new Set(session.blockConfigSnapshot.tagWhitelist);
    const tags = decision.acceptTags.add.filter((tag) => selectedTags.has(tag) && whitelist.has(tag));
    if (tags.length > 0) {
      operations.push({
        type: "append-tags",
        targetPath: session.notePath,
        tags: [...new Set(tags)]
      });
    }
    return {
      notePath: session.notePath,
      sessionId: session.id,
      operations
    };
  }
};

// src/core/apply/RefinedBodyFormatter.ts
var SECTION_HEADINGS = {
  summary: "## \u6458\u8981",
  coreQuestion: "## \u6838\u5FC3\u95EE\u9898",
  currentConclusion: "## \u5F53\u524D\u7ED3\u8BBA",
  reasoning: "## \u4F9D\u636E\u4E0E\u63A8\u7406",
  scope: "## \u9002\u7528\u8FB9\u754C",
  nextSteps: "## \u540E\u7EED\u5904\u7406",
  refineNote: "## \u6574\u7406\u8BF4\u660E"
};
function buildRefinedBodyPreview(refinedSections) {
  const lines = [];
  for (const key of Object.keys(refinedSections)) {
    const content = refinedSections[key];
    if (!content) {
      continue;
    }
    lines.push(SECTION_HEADINGS[key]);
    lines.push(content);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

// src/core/apply/BodyAssembler.ts
var BodyAssembler = class {
  constructor() {
    this.extractor = new ProtectedRegionExtractor();
  }
  assemble(session, protectedRegionDef, currentContent, refinedSections) {
    const protectedRegion = this.extractor.extract(currentContent, protectedRegionDef);
    if (!protectedRegion.ok) {
      return protectedRegion;
    }
    if (!protectedRegion.region.text) {
      return {
        ok: false,
        error: {
          code: "empty-protected-region",
          message: "Protected region text is empty; cannot assemble body."
        }
      };
    }
    const refinedBody = buildRefinedBodyPreview(refinedSections != null ? refinedSections : session.proposal.refinedSections);
    const body = `${refinedBody}

${protectedRegion.region.text}`;
    return {
      ok: true,
      body,
      protectedRegionText: protectedRegion.region.text
    };
  }
};

// src/core/policy/PolicyGuard.ts
var PolicyGuard = class {
  constructor(profile) {
    this.profile = profile;
  }
  guardRequest(request) {
    void this.profile;
    return request;
  }
};

// node_modules/zod/v4/classic/external.js
var external_exports = {};
__export(external_exports, {
  $brand: () => $brand,
  $input: () => $input,
  $output: () => $output,
  NEVER: () => NEVER,
  TimePrecision: () => TimePrecision,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBase64: () => ZodBase64,
  ZodBase64URL: () => ZodBase64URL,
  ZodBigInt: () => ZodBigInt,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBoolean: () => ZodBoolean,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCUID: () => ZodCUID,
  ZodCUID2: () => ZodCUID2,
  ZodCatch: () => ZodCatch,
  ZodCodec: () => ZodCodec,
  ZodCustom: () => ZodCustom,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodE164: () => ZodE164,
  ZodEmail: () => ZodEmail,
  ZodEmoji: () => ZodEmoji,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodExactOptional: () => ZodExactOptional,
  ZodFile: () => ZodFile,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodGUID: () => ZodGUID,
  ZodIPv4: () => ZodIPv4,
  ZodIPv6: () => ZodIPv6,
  ZodISODate: () => ZodISODate,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODuration: () => ZodISODuration,
  ZodISOTime: () => ZodISOTime,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodJWT: () => ZodJWT,
  ZodKSUID: () => ZodKSUID,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMAC: () => ZodMAC,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNanoID: () => ZodNanoID,
  ZodNever: () => ZodNever,
  ZodNonOptional: () => ZodNonOptional,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodPipe: () => ZodPipe,
  ZodPrefault: () => ZodPrefault,
  ZodPreprocess: () => ZodPreprocess,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRealError: () => ZodRealError,
  ZodRecord: () => ZodRecord,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodStringFormat: () => ZodStringFormat,
  ZodSuccess: () => ZodSuccess,
  ZodSymbol: () => ZodSymbol,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodTransform: () => ZodTransform,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodULID: () => ZodULID,
  ZodURL: () => ZodURL,
  ZodUUID: () => ZodUUID,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  ZodXID: () => ZodXID,
  ZodXor: () => ZodXor,
  _ZodString: () => _ZodString,
  _default: () => _default2,
  _function: () => _function,
  any: () => any,
  array: () => array,
  base64: () => base642,
  base64url: () => base64url2,
  bigint: () => bigint2,
  boolean: () => boolean2,
  catch: () => _catch2,
  check: () => check,
  cidrv4: () => cidrv42,
  cidrv6: () => cidrv62,
  clone: () => clone,
  codec: () => codec,
  coerce: () => coerce_exports,
  config: () => config,
  core: () => core_exports2,
  cuid: () => cuid3,
  cuid2: () => cuid22,
  custom: () => custom,
  date: () => date3,
  decode: () => decode2,
  decodeAsync: () => decodeAsync2,
  describe: () => describe2,
  discriminatedUnion: () => discriminatedUnion,
  e164: () => e1642,
  email: () => email2,
  emoji: () => emoji2,
  encode: () => encode2,
  encodeAsync: () => encodeAsync2,
  endsWith: () => _endsWith,
  enum: () => _enum2,
  exactOptional: () => exactOptional,
  file: () => file,
  flattenError: () => flattenError,
  float32: () => float32,
  float64: () => float64,
  formatError: () => formatError,
  fromJSONSchema: () => fromJSONSchema,
  function: () => _function,
  getErrorMap: () => getErrorMap,
  globalRegistry: () => globalRegistry,
  gt: () => _gt,
  gte: () => _gte,
  guid: () => guid2,
  hash: () => hash,
  hex: () => hex2,
  hostname: () => hostname2,
  httpUrl: () => httpUrl,
  includes: () => _includes,
  instanceof: () => _instanceof,
  int: () => int,
  int32: () => int32,
  int64: () => int64,
  intersection: () => intersection,
  invertCodec: () => invertCodec,
  ipv4: () => ipv42,
  ipv6: () => ipv62,
  iso: () => iso_exports,
  json: () => json,
  jwt: () => jwt,
  keyof: () => keyof,
  ksuid: () => ksuid2,
  lazy: () => lazy,
  length: () => _length,
  literal: () => literal,
  locales: () => locales_exports,
  looseObject: () => looseObject,
  looseRecord: () => looseRecord,
  lowercase: () => _lowercase,
  lt: () => _lt,
  lte: () => _lte,
  mac: () => mac2,
  map: () => map,
  maxLength: () => _maxLength,
  maxSize: () => _maxSize,
  meta: () => meta2,
  mime: () => _mime,
  minLength: () => _minLength,
  minSize: () => _minSize,
  multipleOf: () => _multipleOf,
  nan: () => nan,
  nanoid: () => nanoid2,
  nativeEnum: () => nativeEnum,
  negative: () => _negative,
  never: () => never,
  nonnegative: () => _nonnegative,
  nonoptional: () => nonoptional,
  nonpositive: () => _nonpositive,
  normalize: () => _normalize,
  null: () => _null3,
  nullable: () => nullable,
  nullish: () => nullish2,
  number: () => number2,
  object: () => object,
  optional: () => optional,
  overwrite: () => _overwrite,
  parse: () => parse2,
  parseAsync: () => parseAsync2,
  partialRecord: () => partialRecord,
  pipe: () => pipe,
  positive: () => _positive,
  prefault: () => prefault,
  preprocess: () => preprocess,
  prettifyError: () => prettifyError,
  promise: () => promise,
  property: () => _property,
  readonly: () => readonly,
  record: () => record,
  refine: () => refine,
  regex: () => _regex,
  regexes: () => regexes_exports,
  registry: () => registry,
  safeDecode: () => safeDecode2,
  safeDecodeAsync: () => safeDecodeAsync2,
  safeEncode: () => safeEncode2,
  safeEncodeAsync: () => safeEncodeAsync2,
  safeParse: () => safeParse2,
  safeParseAsync: () => safeParseAsync2,
  set: () => set,
  setErrorMap: () => setErrorMap,
  size: () => _size,
  slugify: () => _slugify,
  startsWith: () => _startsWith,
  strictObject: () => strictObject,
  string: () => string2,
  stringFormat: () => stringFormat,
  stringbool: () => stringbool,
  success: () => success,
  superRefine: () => superRefine,
  symbol: () => symbol,
  templateLiteral: () => templateLiteral,
  toJSONSchema: () => toJSONSchema,
  toLowerCase: () => _toLowerCase,
  toUpperCase: () => _toUpperCase,
  transform: () => transform,
  treeifyError: () => treeifyError,
  trim: () => _trim,
  tuple: () => tuple,
  uint32: () => uint32,
  uint64: () => uint64,
  ulid: () => ulid2,
  undefined: () => _undefined3,
  union: () => union,
  unknown: () => unknown,
  uppercase: () => _uppercase,
  url: () => url,
  util: () => util_exports,
  uuid: () => uuid2,
  uuidv4: () => uuidv4,
  uuidv6: () => uuidv6,
  uuidv7: () => uuidv7,
  void: () => _void2,
  xid: () => xid2,
  xor: () => xor
});

// node_modules/zod/v4/core/index.js
var core_exports2 = {};
__export(core_exports2, {
  $ZodAny: () => $ZodAny,
  $ZodArray: () => $ZodArray,
  $ZodAsyncError: () => $ZodAsyncError,
  $ZodBase64: () => $ZodBase64,
  $ZodBase64URL: () => $ZodBase64URL,
  $ZodBigInt: () => $ZodBigInt,
  $ZodBigIntFormat: () => $ZodBigIntFormat,
  $ZodBoolean: () => $ZodBoolean,
  $ZodCIDRv4: () => $ZodCIDRv4,
  $ZodCIDRv6: () => $ZodCIDRv6,
  $ZodCUID: () => $ZodCUID,
  $ZodCUID2: () => $ZodCUID2,
  $ZodCatch: () => $ZodCatch,
  $ZodCheck: () => $ZodCheck,
  $ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
  $ZodCheckEndsWith: () => $ZodCheckEndsWith,
  $ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
  $ZodCheckIncludes: () => $ZodCheckIncludes,
  $ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
  $ZodCheckLessThan: () => $ZodCheckLessThan,
  $ZodCheckLowerCase: () => $ZodCheckLowerCase,
  $ZodCheckMaxLength: () => $ZodCheckMaxLength,
  $ZodCheckMaxSize: () => $ZodCheckMaxSize,
  $ZodCheckMimeType: () => $ZodCheckMimeType,
  $ZodCheckMinLength: () => $ZodCheckMinLength,
  $ZodCheckMinSize: () => $ZodCheckMinSize,
  $ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
  $ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
  $ZodCheckOverwrite: () => $ZodCheckOverwrite,
  $ZodCheckProperty: () => $ZodCheckProperty,
  $ZodCheckRegex: () => $ZodCheckRegex,
  $ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
  $ZodCheckStartsWith: () => $ZodCheckStartsWith,
  $ZodCheckStringFormat: () => $ZodCheckStringFormat,
  $ZodCheckUpperCase: () => $ZodCheckUpperCase,
  $ZodCodec: () => $ZodCodec,
  $ZodCustom: () => $ZodCustom,
  $ZodCustomStringFormat: () => $ZodCustomStringFormat,
  $ZodDate: () => $ZodDate,
  $ZodDefault: () => $ZodDefault,
  $ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
  $ZodE164: () => $ZodE164,
  $ZodEmail: () => $ZodEmail,
  $ZodEmoji: () => $ZodEmoji,
  $ZodEncodeError: () => $ZodEncodeError,
  $ZodEnum: () => $ZodEnum,
  $ZodError: () => $ZodError,
  $ZodExactOptional: () => $ZodExactOptional,
  $ZodFile: () => $ZodFile,
  $ZodFunction: () => $ZodFunction,
  $ZodGUID: () => $ZodGUID,
  $ZodIPv4: () => $ZodIPv4,
  $ZodIPv6: () => $ZodIPv6,
  $ZodISODate: () => $ZodISODate,
  $ZodISODateTime: () => $ZodISODateTime,
  $ZodISODuration: () => $ZodISODuration,
  $ZodISOTime: () => $ZodISOTime,
  $ZodIntersection: () => $ZodIntersection,
  $ZodJWT: () => $ZodJWT,
  $ZodKSUID: () => $ZodKSUID,
  $ZodLazy: () => $ZodLazy,
  $ZodLiteral: () => $ZodLiteral,
  $ZodMAC: () => $ZodMAC,
  $ZodMap: () => $ZodMap,
  $ZodNaN: () => $ZodNaN,
  $ZodNanoID: () => $ZodNanoID,
  $ZodNever: () => $ZodNever,
  $ZodNonOptional: () => $ZodNonOptional,
  $ZodNull: () => $ZodNull,
  $ZodNullable: () => $ZodNullable,
  $ZodNumber: () => $ZodNumber,
  $ZodNumberFormat: () => $ZodNumberFormat,
  $ZodObject: () => $ZodObject,
  $ZodObjectJIT: () => $ZodObjectJIT,
  $ZodOptional: () => $ZodOptional,
  $ZodPipe: () => $ZodPipe,
  $ZodPrefault: () => $ZodPrefault,
  $ZodPreprocess: () => $ZodPreprocess,
  $ZodPromise: () => $ZodPromise,
  $ZodReadonly: () => $ZodReadonly,
  $ZodRealError: () => $ZodRealError,
  $ZodRecord: () => $ZodRecord,
  $ZodRegistry: () => $ZodRegistry,
  $ZodSet: () => $ZodSet,
  $ZodString: () => $ZodString,
  $ZodStringFormat: () => $ZodStringFormat,
  $ZodSuccess: () => $ZodSuccess,
  $ZodSymbol: () => $ZodSymbol,
  $ZodTemplateLiteral: () => $ZodTemplateLiteral,
  $ZodTransform: () => $ZodTransform,
  $ZodTuple: () => $ZodTuple,
  $ZodType: () => $ZodType,
  $ZodULID: () => $ZodULID,
  $ZodURL: () => $ZodURL,
  $ZodUUID: () => $ZodUUID,
  $ZodUndefined: () => $ZodUndefined,
  $ZodUnion: () => $ZodUnion,
  $ZodUnknown: () => $ZodUnknown,
  $ZodVoid: () => $ZodVoid,
  $ZodXID: () => $ZodXID,
  $ZodXor: () => $ZodXor,
  $brand: () => $brand,
  $constructor: () => $constructor,
  $input: () => $input,
  $output: () => $output,
  Doc: () => Doc,
  JSONSchema: () => json_schema_exports,
  JSONSchemaGenerator: () => JSONSchemaGenerator,
  NEVER: () => NEVER,
  TimePrecision: () => TimePrecision,
  _any: () => _any,
  _array: () => _array,
  _base64: () => _base64,
  _base64url: () => _base64url,
  _bigint: () => _bigint,
  _boolean: () => _boolean,
  _catch: () => _catch,
  _check: () => _check,
  _cidrv4: () => _cidrv4,
  _cidrv6: () => _cidrv6,
  _coercedBigint: () => _coercedBigint,
  _coercedBoolean: () => _coercedBoolean,
  _coercedDate: () => _coercedDate,
  _coercedNumber: () => _coercedNumber,
  _coercedString: () => _coercedString,
  _cuid: () => _cuid,
  _cuid2: () => _cuid2,
  _custom: () => _custom,
  _date: () => _date,
  _decode: () => _decode,
  _decodeAsync: () => _decodeAsync,
  _default: () => _default,
  _discriminatedUnion: () => _discriminatedUnion,
  _e164: () => _e164,
  _email: () => _email,
  _emoji: () => _emoji2,
  _encode: () => _encode,
  _encodeAsync: () => _encodeAsync,
  _endsWith: () => _endsWith,
  _enum: () => _enum,
  _file: () => _file,
  _float32: () => _float32,
  _float64: () => _float64,
  _gt: () => _gt,
  _gte: () => _gte,
  _guid: () => _guid,
  _includes: () => _includes,
  _int: () => _int,
  _int32: () => _int32,
  _int64: () => _int64,
  _intersection: () => _intersection,
  _ipv4: () => _ipv4,
  _ipv6: () => _ipv6,
  _isoDate: () => _isoDate,
  _isoDateTime: () => _isoDateTime,
  _isoDuration: () => _isoDuration,
  _isoTime: () => _isoTime,
  _jwt: () => _jwt,
  _ksuid: () => _ksuid,
  _lazy: () => _lazy,
  _length: () => _length,
  _literal: () => _literal,
  _lowercase: () => _lowercase,
  _lt: () => _lt,
  _lte: () => _lte,
  _mac: () => _mac,
  _map: () => _map,
  _max: () => _lte,
  _maxLength: () => _maxLength,
  _maxSize: () => _maxSize,
  _mime: () => _mime,
  _min: () => _gte,
  _minLength: () => _minLength,
  _minSize: () => _minSize,
  _multipleOf: () => _multipleOf,
  _nan: () => _nan,
  _nanoid: () => _nanoid,
  _nativeEnum: () => _nativeEnum,
  _negative: () => _negative,
  _never: () => _never,
  _nonnegative: () => _nonnegative,
  _nonoptional: () => _nonoptional,
  _nonpositive: () => _nonpositive,
  _normalize: () => _normalize,
  _null: () => _null2,
  _nullable: () => _nullable,
  _number: () => _number,
  _optional: () => _optional,
  _overwrite: () => _overwrite,
  _parse: () => _parse,
  _parseAsync: () => _parseAsync,
  _pipe: () => _pipe,
  _positive: () => _positive,
  _promise: () => _promise,
  _property: () => _property,
  _readonly: () => _readonly,
  _record: () => _record,
  _refine: () => _refine,
  _regex: () => _regex,
  _safeDecode: () => _safeDecode,
  _safeDecodeAsync: () => _safeDecodeAsync,
  _safeEncode: () => _safeEncode,
  _safeEncodeAsync: () => _safeEncodeAsync,
  _safeParse: () => _safeParse,
  _safeParseAsync: () => _safeParseAsync,
  _set: () => _set,
  _size: () => _size,
  _slugify: () => _slugify,
  _startsWith: () => _startsWith,
  _string: () => _string,
  _stringFormat: () => _stringFormat,
  _stringbool: () => _stringbool,
  _success: () => _success,
  _superRefine: () => _superRefine,
  _symbol: () => _symbol,
  _templateLiteral: () => _templateLiteral,
  _toLowerCase: () => _toLowerCase,
  _toUpperCase: () => _toUpperCase,
  _transform: () => _transform,
  _trim: () => _trim,
  _tuple: () => _tuple,
  _uint32: () => _uint32,
  _uint64: () => _uint64,
  _ulid: () => _ulid,
  _undefined: () => _undefined2,
  _union: () => _union,
  _unknown: () => _unknown,
  _uppercase: () => _uppercase,
  _url: () => _url,
  _uuid: () => _uuid,
  _uuidv4: () => _uuidv4,
  _uuidv6: () => _uuidv6,
  _uuidv7: () => _uuidv7,
  _void: () => _void,
  _xid: () => _xid,
  _xor: () => _xor,
  clone: () => clone,
  config: () => config,
  createStandardJSONSchemaMethod: () => createStandardJSONSchemaMethod,
  createToJSONSchemaMethod: () => createToJSONSchemaMethod,
  decode: () => decode,
  decodeAsync: () => decodeAsync,
  describe: () => describe,
  encode: () => encode,
  encodeAsync: () => encodeAsync,
  extractDefs: () => extractDefs,
  finalize: () => finalize,
  flattenError: () => flattenError,
  formatError: () => formatError,
  globalConfig: () => globalConfig,
  globalRegistry: () => globalRegistry,
  initializeContext: () => initializeContext,
  isValidBase64: () => isValidBase64,
  isValidBase64URL: () => isValidBase64URL,
  isValidJWT: () => isValidJWT,
  locales: () => locales_exports,
  meta: () => meta,
  parse: () => parse,
  parseAsync: () => parseAsync,
  prettifyError: () => prettifyError,
  process: () => process,
  regexes: () => regexes_exports,
  registry: () => registry,
  safeDecode: () => safeDecode,
  safeDecodeAsync: () => safeDecodeAsync,
  safeEncode: () => safeEncode,
  safeEncodeAsync: () => safeEncodeAsync,
  safeParse: () => safeParse,
  safeParseAsync: () => safeParseAsync,
  toDotPath: () => toDotPath,
  toJSONSchema: () => toJSONSchema,
  treeifyError: () => treeifyError,
  util: () => util_exports,
  version: () => version
});

// node_modules/zod/v4/core/core.js
var _a;
var NEVER = /* @__PURE__ */ Object.freeze({
  status: "aborted"
});
// @__NO_SIDE_EFFECTS__
function $constructor(name, initializer3, params) {
  var _a5;
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer3(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = (_a5 = params == null ? void 0 : params.Parent) != null ? _a5 : Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a7;
    var _a6;
    const inst = (params == null ? void 0 : params.Parent) ? new Definition() : this;
    init(inst, def);
    (_a7 = (_a6 = inst._zod).deferred) != null ? _a7 : _a6.deferred = [];
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      var _a6, _b;
      if ((params == null ? void 0 : params.Parent) && inst instanceof params.Parent)
        return true;
      return (_b = (_a6 = inst == null ? void 0 : inst._zod) == null ? void 0 : _a6.traits) == null ? void 0 : _b.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $brand = Symbol("zod_brand");
var $ZodAsyncError = class extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
};
var $ZodEncodeError = class extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
};
var _a2;
(_a2 = (_a = globalThis).__zod_globalConfig) != null ? _a2 : _a.__zod_globalConfig = {};
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// node_modules/zod/v4/core/util.js
var util_exports = {};
__export(util_exports, {
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
  Class: () => Class,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  aborted: () => aborted,
  allowsEval: () => allowsEval,
  assert: () => assert,
  assertEqual: () => assertEqual,
  assertIs: () => assertIs,
  assertNever: () => assertNever,
  assertNotEqual: () => assertNotEqual,
  assignProp: () => assignProp,
  base64ToUint8Array: () => base64ToUint8Array,
  base64urlToUint8Array: () => base64urlToUint8Array,
  cached: () => cached,
  captureStackTrace: () => captureStackTrace,
  cleanEnum: () => cleanEnum,
  cleanRegex: () => cleanRegex,
  clone: () => clone,
  cloneDef: () => cloneDef,
  createTransparentProxy: () => createTransparentProxy,
  defineLazy: () => defineLazy,
  esc: () => esc,
  escapeRegex: () => escapeRegex,
  explicitlyAborted: () => explicitlyAborted,
  extend: () => extend,
  finalizeIssue: () => finalizeIssue,
  floatSafeRemainder: () => floatSafeRemainder,
  getElementAtPath: () => getElementAtPath,
  getEnumValues: () => getEnumValues,
  getLengthableOrigin: () => getLengthableOrigin,
  getParsedType: () => getParsedType,
  getSizableOrigin: () => getSizableOrigin,
  hexToUint8Array: () => hexToUint8Array,
  isObject: () => isObject,
  isPlainObject: () => isPlainObject,
  issue: () => issue,
  joinValues: () => joinValues,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  merge: () => merge,
  mergeDefs: () => mergeDefs,
  normalizeParams: () => normalizeParams,
  nullish: () => nullish,
  numKeys: () => numKeys,
  objectClone: () => objectClone,
  omit: () => omit,
  optionalKeys: () => optionalKeys,
  parsedType: () => parsedType,
  partial: () => partial,
  pick: () => pick,
  prefixIssues: () => prefixIssues,
  primitiveTypes: () => primitiveTypes,
  promiseAllObject: () => promiseAllObject,
  propertyKeyTypes: () => propertyKeyTypes,
  randomString: () => randomString,
  required: () => required,
  safeExtend: () => safeExtend,
  shallowClone: () => shallowClone,
  slugify: () => slugify,
  stringifyPrimitive: () => stringifyPrimitive,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToHex: () => uint8ArrayToHex,
  unwrapMessage: () => unwrapMessage
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {
}
function assertNever(_x) {
  throw new Error("Unexpected value in exhaustive check");
}
function assert(_) {
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array2, separator = "|") {
  return array2.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set2 = false;
  return {
    get value() {
      if (!set2) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
var EVALUATING = /* @__PURE__ */ Symbol("evaluating");
function defineLazy(object2, key, getter) {
  let value = void 0;
  Object.defineProperty(object2, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
  if (!path)
    return obj;
  return path.reduce((acc, key) => acc == null ? void 0 : acc[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0; i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = /* @__PURE__ */ cached(() => {
  var _a5;
  if (globalConfig.jitless) {
    return false;
  }
  if (typeof navigator !== "undefined" && ((_a5 = navigator == null ? void 0 : navigator.userAgent) == null ? void 0 : _a5.includes("Cloudflare"))) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
var getParsedType = (data) => {
  const t2 = typeof data;
  switch (t2) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t2}`);
  }
};
var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
var primitiveTypes = /* @__PURE__ */ new Set([
  "string",
  "number",
  "bigint",
  "boolean",
  "symbol",
  "undefined"
]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def != null ? def : inst._zod.def);
  if (!def || (params == null ? void 0 : params.parent))
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if ((params == null ? void 0 : params.message) !== void 0) {
    if ((params == null ? void 0 : params.error) !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target != null ? target : target = getter();
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target != null ? target : target = getter();
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target != null ? target : target = getter();
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target != null ? target : target = getter();
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target != null ? target : target = getter();
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target != null ? target : target = getter();
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target != null ? target : target = getter();
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
var BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  var _a5, _b;
  if ((_a5 = a._zod.def.checks) == null ? void 0 : _a5.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: (_b = b._zod.def.checks) != null ? _b : []
  });
  return clone(a, def);
}
function partial(Class2, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class2 ? new Class2({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class2 ? new Class2({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class2, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class2({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class2({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  var _a5;
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (((_a5 = x.issues[i]) == null ? void 0 : _a5.continue) !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  var _a5;
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (((_a5 = x.issues[i]) == null ? void 0 : _a5.continue) === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a6;
    var _a5;
    (_a6 = (_a5 = iss).path) != null ? _a6 : _a5.path = [];
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message == null ? void 0 : message.message;
}
function finalizeIssue(iss, ctx, config2) {
  var _a5, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const message = iss.message ? iss.message : (_j = (_i = (_g = (_e = unwrapMessage((_c = (_b = (_a5 = iss.inst) == null ? void 0 : _a5._zod.def) == null ? void 0 : _b.error) == null ? void 0 : _c.call(_b, iss))) != null ? _e : unwrapMessage((_d = ctx == null ? void 0 : ctx.error) == null ? void 0 : _d.call(ctx, iss))) != null ? _g : unwrapMessage((_f = config2.customError) == null ? void 0 : _f.call(config2, iss))) != null ? _i : unwrapMessage((_h = config2.localeError) == null ? void 0 : _h.call(config2, iss))) != null ? _j : "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  (_k = rest.path) != null ? _k : rest.path = [];
  rest.message = message;
  if (ctx == null ? void 0 : ctx.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t2 = typeof data;
  switch (t2) {
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t2;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base643) {
  const binaryString = atob(base643);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url3) {
  const base643 = base64url3.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base643.length % 4) % 4);
  return base64ToUint8Array(base643 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex3) {
  const cleanHex = hex3.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var Class = class {
  constructor(..._args) {
  }
};

// node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error51, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error51.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error51, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error52, path = []) => {
    for (const issue2 of error52.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }
  };
  processError(error51);
  return fieldErrors;
}
function treeifyError(error51, mapper = (issue2) => issue2.message) {
  const result = { errors: [] };
  const processError = (error52, path = []) => {
    var _a6, _b2, _c, _d;
    var _a5, _b;
    for (const issue2 of error52.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          result.errors.push(mapper(issue2));
          continue;
        }
        let curr = result;
        let i = 0;
        while (i < fullpath.length) {
          const el = fullpath[i];
          const terminal = i === fullpath.length - 1;
          if (typeof el === "string") {
            (_a6 = curr.properties) != null ? _a6 : curr.properties = {};
            (_b2 = (_a5 = curr.properties)[el]) != null ? _b2 : _a5[el] = { errors: [] };
            curr = curr.properties[el];
          } else {
            (_c = curr.items) != null ? _c : curr.items = [];
            (_d = (_b = curr.items)[el]) != null ? _d : _b[el] = { errors: [] };
            curr = curr.items[el];
          }
          if (terminal) {
            curr.errors.push(mapper(issue2));
          }
          i++;
        }
      }
    }
  };
  processError(error51);
  return result;
}
function toDotPath(_path) {
  const segs = [];
  const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
  for (const seg of path) {
    if (typeof seg === "number")
      segs.push(`[${seg}]`);
    else if (typeof seg === "symbol")
      segs.push(`[${JSON.stringify(String(seg))}]`);
    else if (/[^\w$]/.test(seg))
      segs.push(`[${JSON.stringify(seg)}]`);
    else {
      if (segs.length)
        segs.push(".");
      segs.push(seg);
    }
  }
  return segs.join("");
}
function prettifyError(error51) {
  var _a5;
  const lines = [];
  const issues = [...error51.issues].sort((a, b) => {
    var _a6, _b;
    return ((_a6 = a.path) != null ? _a6 : []).length - ((_b = b.path) != null ? _b : []).length;
  });
  for (const issue2 of issues) {
    lines.push(`\u2716 ${issue2.message}`);
    if ((_a5 = issue2.path) == null ? void 0 : _a5.length)
      lines.push(`  \u2192 at ${toDotPath(issue2.path)}`);
  }
  return lines.join("\n");
}

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  var _a5;
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new ((_a5 = _params == null ? void 0 : _params.Err) != null ? _a5 : _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params == null ? void 0 : _params.callee);
    throw e;
  }
  return result.value;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  var _a5;
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new ((_a5 = params == null ? void 0 : params.Err) != null ? _a5 : _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params == null ? void 0 : params.callee);
    throw e;
  }
  return result.value;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err != null ? _Err : $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
var _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
var encode = /* @__PURE__ */ _encode($ZodRealError);
var _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
var decode = /* @__PURE__ */ _decode($ZodRealError);
var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
var encodeAsync = /* @__PURE__ */ _encodeAsync($ZodRealError);
var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
var decodeAsync = /* @__PURE__ */ _decodeAsync($ZodRealError);
var _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
var safeEncode = /* @__PURE__ */ _safeEncode($ZodRealError);
var _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
var safeDecode = /* @__PURE__ */ _safeDecode($ZodRealError);
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);

// node_modules/zod/v4/core/regexes.js
var regexes_exports = {};
__export(regexes_exports, {
  base64: () => base64,
  base64url: () => base64url,
  bigint: () => bigint,
  boolean: () => boolean,
  browserEmail: () => browserEmail,
  cidrv4: () => cidrv4,
  cidrv6: () => cidrv6,
  cuid: () => cuid,
  cuid2: () => cuid2,
  date: () => date,
  datetime: () => datetime,
  domain: () => domain,
  duration: () => duration,
  e164: () => e164,
  email: () => email,
  emoji: () => emoji,
  extendedDuration: () => extendedDuration,
  guid: () => guid,
  hex: () => hex,
  hostname: () => hostname,
  html5Email: () => html5Email,
  httpProtocol: () => httpProtocol,
  idnEmail: () => idnEmail,
  integer: () => integer,
  ipv4: () => ipv4,
  ipv6: () => ipv6,
  ksuid: () => ksuid,
  lowercase: () => lowercase,
  mac: () => mac,
  md5_base64: () => md5_base64,
  md5_base64url: () => md5_base64url,
  md5_hex: () => md5_hex,
  nanoid: () => nanoid,
  null: () => _null,
  number: () => number,
  rfc5322Email: () => rfc5322Email,
  sha1_base64: () => sha1_base64,
  sha1_base64url: () => sha1_base64url,
  sha1_hex: () => sha1_hex,
  sha256_base64: () => sha256_base64,
  sha256_base64url: () => sha256_base64url,
  sha256_hex: () => sha256_hex,
  sha384_base64: () => sha384_base64,
  sha384_base64url: () => sha384_base64url,
  sha384_hex: () => sha384_hex,
  sha512_base64: () => sha512_base64,
  sha512_base64url: () => sha512_base64url,
  sha512_hex: () => sha512_hex,
  string: () => string,
  time: () => time,
  ulid: () => ulid,
  undefined: () => _undefined,
  unicodeEmail: () => unicodeEmail,
  uppercase: () => uppercase,
  uuid: () => uuid,
  uuid4: () => uuid4,
  uuid6: () => uuid6,
  uuid7: () => uuid7,
  xid: () => xid
});
var cuid = /^[cC][0-9a-z]{6,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var uuid = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
var uuid4 = /* @__PURE__ */ uuid(4);
var uuid6 = /* @__PURE__ */ uuid(6);
var uuid7 = /* @__PURE__ */ uuid(7);
var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
var idnEmail = unicodeEmail;
var browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
var mac = (delimiter) => {
  const escapedDelim = escapeRegex(delimiter != null ? delimiter : ":");
  return new RegExp(`^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`);
};
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^[A-Za-z0-9_-]*$/;
var hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
var domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
var httpProtocol = /^https?$/;
var e164 = /^\+[1-9]\d{6,14}$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time3 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time3}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var string = (params) => {
  var _a5, _b;
  const regex = params ? `[\\s\\S]{${(_a5 = params == null ? void 0 : params.minimum) != null ? _a5 : 0},${(_b = params == null ? void 0 : params.maximum) != null ? _b : ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var bigint = /^-?\d+n?$/;
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?$/;
var boolean = /^(?:true|false)$/i;
var _null = /^null$/i;
var _undefined = /^undefined$/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;
var hex = /^[0-9a-fA-F]*$/;
function fixedBase64(bodyLength, padding) {
  return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
function fixedBase64url(length) {
  return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
var md5_hex = /^[0-9a-fA-F]{32}$/;
var md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
var md5_base64url = /* @__PURE__ */ fixedBase64url(22);
var sha1_hex = /^[0-9a-fA-F]{40}$/;
var sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
var sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
var sha256_hex = /^[0-9a-fA-F]{64}$/;
var sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
var sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
var sha384_hex = /^[0-9a-fA-F]{96}$/;
var sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
var sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
var sha512_hex = /^[0-9a-fA-F]{128}$/;
var sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
var sha512_base64url = /* @__PURE__ */ fixedBase64url(86);

// node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a6, _b;
  var _a5;
  (_a6 = inst._zod) != null ? _a6 : inst._zod = {};
  inst._zod.def = def;
  (_b = (_a5 = inst._zod).onattach) != null ? _b : _a5.onattach = [];
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    var _a5;
    const bag = inst2._zod.bag;
    const curr = (_a5 = def.inclusive ? bag.maximum : bag.exclusiveMaximum) != null ? _a5 : Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    var _a5;
    const bag = inst2._zod.bag;
    const curr = (_a5 = def.inclusive ? bag.minimum : bag.exclusiveMinimum) != null ? _a5 : Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a6;
    var _a5;
    (_a6 = (_a5 = inst2._zod.bag).multipleOf) != null ? _a6 : _a5.multipleOf = def.value;
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  var _a5;
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = (_a5 = def.format) == null ? void 0 : _a5.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (input < minimum) {
      payload.issues.push({
        origin: "bigint",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "bigint",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
  var _a6;
  var _a5;
  $ZodCheck.init(inst, def);
  (_a6 = (_a5 = inst._zod.def).when) != null ? _a6 : _a5.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== void 0;
  };
  inst._zod.onattach.push((inst2) => {
    var _a7;
    const curr = (_a7 = inst2._zod.bag.maximum) != null ? _a7 : Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size <= def.maximum)
      return;
    payload.issues.push({
      origin: getSizableOrigin(input),
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
  var _a6;
  var _a5;
  $ZodCheck.init(inst, def);
  (_a6 = (_a5 = inst._zod.def).when) != null ? _a6 : _a5.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== void 0;
  };
  inst._zod.onattach.push((inst2) => {
    var _a7;
    const curr = (_a7 = inst2._zod.bag.minimum) != null ? _a7 : Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size >= def.minimum)
      return;
    payload.issues.push({
      origin: getSizableOrigin(input),
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
  var _a6;
  var _a5;
  $ZodCheck.init(inst, def);
  (_a6 = (_a5 = inst._zod.def).when) != null ? _a6 : _a5.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== void 0;
  };
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.size;
    bag.maximum = def.size;
    bag.size = def.size;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size === def.size)
      return;
    const tooBig = size > def.size;
    payload.issues.push({
      origin: getSizableOrigin(input),
      ...tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a6;
  var _a5;
  $ZodCheck.init(inst, def);
  (_a6 = (_a5 = inst._zod.def).when) != null ? _a6 : _a5.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  };
  inst._zod.onattach.push((inst2) => {
    var _a7;
    const curr = (_a7 = inst2._zod.bag.maximum) != null ? _a7 : Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a6;
  var _a5;
  $ZodCheck.init(inst, def);
  (_a6 = (_a5 = inst._zod.def).when) != null ? _a6 : _a5.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  };
  inst._zod.onattach.push((inst2) => {
    var _a7;
    const curr = (_a7 = inst2._zod.bag.minimum) != null ? _a7 : Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a6;
  var _a5;
  $ZodCheck.init(inst, def);
  (_a6 = (_a5 = inst._zod.def).when) != null ? _a6 : _a5.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  };
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a6, _b2;
  var _a5, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a7;
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      (_a7 = bag.patterns) != null ? _a7 : bag.patterns = /* @__PURE__ */ new Set();
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a6 = (_a5 = inst._zod).check) != null ? _a6 : _a5.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    };
  else
    (_b2 = (_b = inst._zod).check) != null ? _b2 : _b.check = () => {
    };
});
var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = lowercase;
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = uppercase;
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    var _a5;
    const bag = inst2._zod.bag;
    (_a5 = bag.patterns) != null ? _a5 : bag.patterns = /* @__PURE__ */ new Set();
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  var _a5;
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  (_a5 = def.pattern) != null ? _a5 : def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    var _a6;
    const bag = inst2._zod.bag;
    (_a6 = bag.patterns) != null ? _a6 : bag.patterns = /* @__PURE__ */ new Set();
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  var _a5;
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  (_a5 = def.pattern) != null ? _a5 : def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    var _a6;
    const bag = inst2._zod.bag;
    (_a6 = bag.patterns) != null ? _a6 : bag.patterns = /* @__PURE__ */ new Set();
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function handleCheckPropertyResult(result, payload, property) {
  if (result.issues.length) {
    payload.issues.push(...prefixIssues(property, result.issues));
  }
}
var $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    const result = def.schema._zod.run({
      value: payload.value[def.property],
      issues: []
    }, {});
    if (result instanceof Promise) {
      return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
    }
    handleCheckPropertyResult(result, payload, def.property);
    return;
  };
});
var $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
  $ZodCheck.init(inst, def);
  const mimeSet = new Set(def.mime);
  inst._zod.onattach.push((inst2) => {
    inst2._zod.bag.mime = def.mime;
  });
  inst._zod.check = (payload) => {
    if (mimeSet.has(payload.value.type))
      return;
    payload.issues.push({
      code: "invalid_value",
      values: def.mime,
      input: payload.value.type,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// node_modules/zod/v4/core/doc.js
var Doc = class {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split("\n").filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    var _a5;
    const F = Function;
    const args = this == null ? void 0 : this.args;
    const content = (_a5 = this == null ? void 0 : this.content) != null ? _a5 : [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join("\n"));
  }
};

// node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 4,
  patch: 3
};

// node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a6, _b, _c;
  var _a5;
  inst != null ? inst : inst = {};
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...(_a6 = inst._zod.def.checks) != null ? _a6 : []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_b = (_a5 = inst._zod).deferred) != null ? _b : _a5.deferred = [];
    (_c = inst._zod.deferred) == null ? void 0 : _c.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && (ctx == null ? void 0 : ctx.async) === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult != null ? asyncResult : Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      var _a7;
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: (_a7 = r.error) == null ? void 0 : _a7.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => {
          var _a8;
          return r.success ? { value: r.data } : { issues: (_a8 = r.error) == null ? void 0 : _a8.issues };
        });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  var _a5, _b, _c;
  $ZodType.init(inst, def);
  inst._zod.pattern = (_c = [...(_b = (_a5 = inst == null ? void 0 : inst._zod.bag) == null ? void 0 : _a5.patterns) != null ? _b : []].pop()) != null ? _c : string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = guid;
  $ZodStringFormat.init(inst, def);
});
var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  var _a5, _b;
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    (_a5 = def.pattern) != null ? _a5 : def.pattern = uuid(v);
  } else
    (_b = def.pattern) != null ? _b : def.pattern = uuid();
  $ZodStringFormat.init(inst, def);
});
var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = email;
  $ZodStringFormat.init(inst, def);
});
var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    var _a5;
    try {
      const trimmed = payload.value.trim();
      if (!def.normalize && ((_a5 = def.protocol) == null ? void 0 : _a5.source) === httpProtocol.source) {
        if (!/^https?:\/\//i.test(trimmed)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid URL format",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
      }
      const url2 = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url2.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url2.protocol.endsWith(":") ? url2.protocol.slice(0, -1) : url2.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url2.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = emoji();
  $ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = nanoid;
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = cuid;
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = cuid2;
  $ZodStringFormat.init(inst, def);
});
var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = ulid;
  $ZodStringFormat.init(inst, def);
});
var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = xid;
  $ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = ksuid;
  $ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = datetime(def);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = date;
  $ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = time(def);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = duration;
  $ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = ipv4;
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = ipv6;
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch (e) {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodMAC = /* @__PURE__ */ $constructor("$ZodMAC", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = mac(def.delimiter);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `mac`;
});
var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = cidrv4;
  $ZodStringFormat.init(inst, def);
});
var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = cidrv6;
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error();
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error();
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error();
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error();
      new URL(`http://[${address}]`);
    } catch (e) {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch (e) {
    return false;
  }
}
var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = base64;
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base643 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base643.padEnd(Math.ceil(base643.length / 4) * 4, "=");
  return isValidBase64(padded);
}
var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = base64url;
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  var _a5;
  (_a5 = def.pattern) != null ? _a5 : def.pattern = e164;
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && (parsedHeader == null ? void 0 : parsedHeader.typ) !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch (e) {
    return false;
  }
}
var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (def.fn(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: def.format,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  var _a5;
  $ZodType.init(inst, def);
  inst._zod.pattern = (_a5 = inst._zod.bag.pattern) != null ? _a5 : number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = bigint;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = BigInt(payload.value);
      } catch (_) {
      }
    if (typeof payload.value === "bigint")
      return payload;
    payload.issues.push({
      expected: "bigint",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigIntFormat", (inst, def) => {
  $ZodCheckBigIntFormat.init(inst, def);
  $ZodBigInt.init(inst, def);
});
var $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "symbol")
      return payload;
    payload.issues.push({
      expected: "symbol",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _undefined;
  inst._zod.values = /* @__PURE__ */ new Set([void 0]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "undefined")
      return payload;
    payload.issues.push({
      expected: "undefined",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null;
  inst._zod.values = /* @__PURE__ */ new Set([null]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input === null)
      return payload;
    payload.issues.push({
      expected: "null",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "undefined")
      return payload;
    payload.issues.push({
      expected: "void",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce) {
      try {
        payload.value = new Date(payload.value);
      } catch (_err) {
      }
    }
    const input = payload.value;
    const isDate = input instanceof Date;
    const isValidDate = isDate && !Number.isNaN(input.getTime());
    if (isValidDate)
      return payload;
    payload.issues.push({
      expected: "date",
      code: "invalid_type",
      input,
      ...isDate ? { received: "Invalid Date" } : {},
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
  const isPresent = key in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  var _a5, _b, _c, _d;
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!((_d = (_c = (_b = (_a5 = def.shape) == null ? void 0 : _a5[k]) == null ? void 0 : _b._zod) == null ? void 0 : _c.traits) == null ? void 0 : _d.has("$ZodType"))) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t2 = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (key === "__proto__")
      continue;
    if (keySet.has(key))
      continue;
    if (t2 === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!(desc == null ? void 0 : desc.get)) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    var _a5;
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        (_a5 = propValues[key]) != null ? _a5 : propValues[key] = /* @__PURE__ */ new Set();
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value != null ? value : value = _normalized.value;
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalIn = el._zod.optin === "optional";
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    var _a5, _b;
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = /* @__PURE__ */ Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      const schema = shape[key];
      const isOptionalIn = ((_a5 = schema == null ? void 0 : schema._zod) == null ? void 0 : _a5.optin) === "optional";
      const isOptionalOut = ((_b = schema == null ? void 0 : schema._zod) == null ? void 0 : _b.optout) === "optional";
      doc.write(`const ${id} = ${parseStr(key)};`);
      if (isOptionalIn && isOptionalOut) {
        doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      } else if (!isOptionalIn) {
        doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval2 = allowsEval;
  const fastEnabled = jit && allowsEval2.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value != null ? value : value = _normalized.value;
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && (ctx == null ? void 0 : ctx.async) === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
function handleExclusiveUnionResults(results, final, inst, ctx) {
  const successes = results.filter((r) => r.issues.length === 0);
  if (successes.length === 1) {
    final.value = successes[0].value;
    return final;
  }
  if (successes.length === 0) {
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
  } else {
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: [],
      inclusive: false
    });
  }
  return final;
}
var $ZodXor = /* @__PURE__ */ $constructor("$ZodXor", (inst, def) => {
  $ZodUnion.init(inst, def);
  def.inclusive = false;
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        results.push(result);
      }
    }
    if (!async)
      return handleExclusiveUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleExclusiveUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
  def.inclusive = false;
  $ZodUnion.init(inst, def);
  const _super = inst._zod.parse;
  defineLazy(inst._zod, "propValues", () => {
    const propValues = {};
    for (const option of def.options) {
      const pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
      for (const [k, v] of Object.entries(pv)) {
        if (!propValues[k])
          propValues[k] = /* @__PURE__ */ new Set();
        for (const val of v) {
          propValues[k].add(val);
        }
      }
    }
    return propValues;
  });
  const disc = cached(() => {
    var _a5;
    const opts = def.options;
    const map2 = /* @__PURE__ */ new Map();
    for (const o of opts) {
      const values = (_a5 = o._zod.propValues) == null ? void 0 : _a5[def.discriminator];
      if (!values || values.size === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
      for (const v of values) {
        if (map2.has(v)) {
          throw new Error(`Duplicate discriminator value "${String(v)}"`);
        }
        map2.set(v, o);
      }
    }
    return map2;
  });
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isObject(input)) {
      payload.issues.push({
        code: "invalid_type",
        expected: "object",
        input,
        inst
      });
      return payload;
    }
    const opt = disc.value.get(input == null ? void 0 : input[def.discriminator]);
    if (opt) {
      return opt._zod.run(payload, ctx);
    }
    if (def.unionFallback || ctx.direction === "backward") {
      return _super(payload, ctx);
    }
    payload.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      discriminator: def.discriminator,
      options: Array.from(disc.value.keys()),
      input,
      path: [def.discriminator],
      inst
    });
    return payload;
  };
});
var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue != null ? unrecIssue : unrecIssue = iss;
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
var $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
  $ZodType.init(inst, def);
  const items = def.items;
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        input,
        inst,
        expected: "tuple",
        code: "invalid_type"
      });
      return payload;
    }
    payload.value = [];
    const proms = [];
    const optinStart = getTupleOptStart(items, "optin");
    const optoutStart = getTupleOptStart(items, "optout");
    if (!def.rest) {
      if (input.length < optinStart) {
        payload.issues.push({
          code: "too_small",
          minimum: optinStart,
          inclusive: true,
          input,
          inst,
          origin: "array"
        });
        return payload;
      }
      if (input.length > items.length) {
        payload.issues.push({
          code: "too_big",
          maximum: items.length,
          inclusive: true,
          input,
          inst,
          origin: "array"
        });
      }
    }
    const itemResults = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const r = items[i]._zod.run({ value: input[i], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((rr) => {
          itemResults[i] = rr;
        }));
      } else {
        itemResults[i] = r;
      }
    }
    if (def.rest) {
      let i = items.length - 1;
      const rest = input.slice(items.length);
      for (const el of rest) {
        i++;
        const result = def.rest._zod.run({ value: el, issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((r) => handleTupleResult(r, payload, i)));
        } else {
          handleTupleResult(result, payload, i);
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => handleTupleResults(itemResults, payload, items, input, optoutStart));
    }
    return handleTupleResults(itemResults, payload, items, input, optoutStart);
  };
});
function getTupleOptStart(items, key) {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i]._zod[key] !== "optional")
      return i + 1;
  }
  return 0;
}
function handleTupleResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handleTupleResults(itemResults, final, items, input, optoutStart) {
  for (let i = 0; i < items.length; i++) {
    const r = itemResults[i];
    const isPresent = i < input.length;
    if (r.issues.length) {
      if (!isPresent && i >= optoutStart) {
        final.value.length = i;
        break;
      }
      final.issues.push(...prefixIssues(i, r.issues));
    }
    final.value[i] = r.value;
  }
  for (let i = final.value.length - 1; i >= input.length; i--) {
    if (items[i]._zod.optout === "optional" && final.value[i] === void 0) {
      final.value.length = i;
    } else {
      break;
    }
  }
  return final;
}
var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values = def.keyType._zod.values;
    if (values) {
      payload.value = {};
      const recordKeys = /* @__PURE__ */ new Set();
      for (const key of values) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          recordKeys.add(typeof key === "number" ? key.toString() : key);
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
            continue;
          }
          const outKey = keyResult.value;
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[outKey] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[outKey] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!recordKeys.has(key)) {
          unrecognized = unrecognized != null ? unrecognized : [];
          unrecognized.push(key);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        if (!Object.prototype.propertyIsEnumerable.call(input, key))
          continue;
        let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
        if (checkNumericKey) {
          const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
          if (retryResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (retryResult.issues.length === 0) {
            keyResult = retryResult;
          }
        }
        if (keyResult.issues.length) {
          if (def.mode === "loose") {
            payload.value[key] = input[key];
          } else {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
          }
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
var $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!(input instanceof Map)) {
      payload.issues.push({
        expected: "map",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    payload.value = /* @__PURE__ */ new Map();
    for (const [key, value] of input) {
      const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
      const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
      if (keyResult instanceof Promise || valueResult instanceof Promise) {
        proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
          handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
        }));
      } else {
        handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
      }
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
  if (keyResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, keyResult.issues));
    } else {
      final.issues.push({
        code: "invalid_key",
        origin: "map",
        input,
        inst,
        issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  if (valueResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, valueResult.issues));
    } else {
      final.issues.push({
        origin: "map",
        code: "invalid_element",
        input,
        inst,
        key,
        issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  final.value.set(keyResult.value, valueResult.value);
}
var $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!(input instanceof Set)) {
      payload.issues.push({
        input,
        inst,
        expected: "set",
        code: "invalid_type"
      });
      return payload;
    }
    const proms = [];
    payload.value = /* @__PURE__ */ new Set();
    for (const item of input) {
      const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleSetResult(result2, payload)));
      } else
        handleSetResult(result, payload);
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleSetResult(result, final) {
  if (result.issues.length) {
    final.issues.push(...result.issues);
  }
  final.value.add(result.value);
}
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  const values = new Set(def.values);
  inst._zod.values = values;
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input instanceof File)
      return payload;
    payload.issues.push({
      expected: "file",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        payload.fallback = true;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    payload.fallback = true;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (input === void 0 && (result.issues.length || result.fallback)) {
    return { issues: [], value: void 0 };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const input = payload.value;
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, input));
      return handleOptionalResult(result, input);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
var $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError("ZodSuccess");
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.issues.length === 0;
        return payload;
      });
    }
    payload.value = result.issues.length === 0;
    return payload;
  };
});
var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
          payload.fallback = true;
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
      payload.fallback = true;
    }
    return payload;
  };
});
var $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
      payload.issues.push({
        input: payload.value,
        inst,
        expected: "nan",
        code: "invalid_type"
      });
      return payload;
    }
    return payload;
  };
});
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues, fallback: left.fallback }, ctx);
}
var $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handleCodecAResult(left2, def, ctx));
      }
      return handleCodecAResult(left, def, ctx);
    } else {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handleCodecAResult(right2, def, ctx));
      }
      return handleCodecAResult(right, def, ctx);
    }
  };
});
function handleCodecAResult(result, def, ctx) {
  if (result.issues.length) {
    result.aborted = true;
    return result;
  }
  const direction = ctx.direction || "forward";
  if (direction === "forward") {
    const transformed = def.transform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
    }
    return handleCodecTxResult(result, transformed, def.out, ctx);
  } else {
    const transformed = def.reverseTransform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
    }
    return handleCodecTxResult(result, transformed, def.in, ctx);
  }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
var $ZodPreprocess = /* @__PURE__ */ $constructor("$ZodPreprocess", (inst, def) => {
  $ZodPipe.init(inst, def);
});
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => {
    var _a5, _b;
    return (_b = (_a5 = def.innerType) == null ? void 0 : _a5._zod) == null ? void 0 : _b.optin;
  });
  defineLazy(inst._zod, "optout", () => {
    var _a5, _b;
    return (_b = (_a5 = def.innerType) == null ? void 0 : _a5._zod) == null ? void 0 : _b.optout;
  });
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
var $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  const regexParts = [];
  for (const part of def.parts) {
    if (typeof part === "object" && part !== null) {
      if (!part._zod.pattern) {
        throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
      }
      const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
      if (!source)
        throw new Error(`Invalid template literal part: ${part._zod.traits}`);
      const start = source.startsWith("^") ? 1 : 0;
      const end = source.endsWith("$") ? source.length - 1 : source.length;
      regexParts.push(source.slice(start, end));
    } else if (part === null || primitiveTypes.has(typeof part)) {
      regexParts.push(escapeRegex(`${part}`));
    } else {
      throw new Error(`Invalid template literal part: ${part}`);
    }
  }
  inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
  inst._zod.parse = (payload, _ctx) => {
    var _a5;
    if (typeof payload.value !== "string") {
      payload.issues.push({
        input: payload.value,
        inst,
        expected: "string",
        code: "invalid_type"
      });
      return payload;
    }
    inst._zod.pattern.lastIndex = 0;
    if (!inst._zod.pattern.test(payload.value)) {
      payload.issues.push({
        input: payload.value,
        inst,
        code: "invalid_format",
        format: (_a5 = def.format) != null ? _a5 : "template_literal",
        pattern: inst._zod.pattern.source
      });
      return payload;
    }
    return payload;
  };
});
var $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
  $ZodType.init(inst, def);
  inst._def = def;
  inst._zod.def = def;
  inst.implement = (func) => {
    if (typeof func !== "function") {
      throw new Error("implement() must be called with a function");
    }
    return function(...args) {
      const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
      const result = Reflect.apply(func, this, parsedArgs);
      if (inst._def.output) {
        return parse(inst._def.output, result);
      }
      return result;
    };
  };
  inst.implementAsync = (func) => {
    if (typeof func !== "function") {
      throw new Error("implementAsync() must be called with a function");
    }
    return async function(...args) {
      const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
      const result = await Reflect.apply(func, this, parsedArgs);
      if (inst._def.output) {
        return await parseAsync(inst._def.output, result);
      }
      return result;
    };
  };
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "function") {
      payload.issues.push({
        code: "invalid_type",
        expected: "function",
        input: payload.value,
        inst
      });
      return payload;
    }
    const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
    if (hasPromiseOutput) {
      payload.value = inst.implementAsync(payload.value);
    } else {
      payload.value = inst.implement(payload.value);
    }
    return payload;
  };
  inst.input = (...args) => {
    const F = inst.constructor;
    if (Array.isArray(args[0])) {
      return new F({
        type: "function",
        input: new $ZodTuple({
          type: "tuple",
          items: args[0],
          rest: args[1]
        }),
        output: inst._def.output
      });
    }
    return new F({
      type: "function",
      input: args[0],
      output: inst._def.output
    });
  };
  inst.output = (output) => {
    const F = inst.constructor;
    return new F({
      type: "function",
      input: inst._def.input,
      output
    });
  };
  return inst;
});
var $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
  };
});
var $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "innerType", () => {
    const d = def;
    if (!d._cachedInner)
      d._cachedInner = def.getter();
    return d._cachedInner;
  });
  defineLazy(inst._zod, "pattern", () => {
    var _a5, _b;
    return (_b = (_a5 = inst._zod.innerType) == null ? void 0 : _a5._zod) == null ? void 0 : _b.pattern;
  });
  defineLazy(inst._zod, "propValues", () => {
    var _a5, _b;
    return (_b = (_a5 = inst._zod.innerType) == null ? void 0 : _a5._zod) == null ? void 0 : _b.propValues;
  });
  defineLazy(inst._zod, "optin", () => {
    var _a5, _b, _c;
    return (_c = (_b = (_a5 = inst._zod.innerType) == null ? void 0 : _a5._zod) == null ? void 0 : _b.optin) != null ? _c : void 0;
  });
  defineLazy(inst._zod, "optout", () => {
    var _a5, _b, _c;
    return (_c = (_b = (_a5 = inst._zod.innerType) == null ? void 0 : _a5._zod) == null ? void 0 : _b.optout) != null ? _c : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const inner = inst._zod.innerType;
    return inner._zod.run(payload, ctx);
  };
});
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  var _a5;
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...(_a5 = inst._zod.def.path) != null ? _a5 : []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}

// node_modules/zod/v4/locales/index.js
var locales_exports = {};
__export(locales_exports, {
  ar: () => ar_default,
  az: () => az_default,
  be: () => be_default,
  bg: () => bg_default,
  ca: () => ca_default,
  cs: () => cs_default,
  da: () => da_default,
  de: () => de_default,
  el: () => el_default,
  en: () => en_default,
  eo: () => eo_default,
  es: () => es_default,
  fa: () => fa_default,
  fi: () => fi_default,
  fr: () => fr_default,
  frCA: () => fr_CA_default,
  he: () => he_default,
  hr: () => hr_default,
  hu: () => hu_default,
  hy: () => hy_default,
  id: () => id_default,
  is: () => is_default,
  it: () => it_default,
  ja: () => ja_default,
  ka: () => ka_default,
  kh: () => kh_default,
  km: () => km_default,
  ko: () => ko_default,
  lt: () => lt_default,
  mk: () => mk_default,
  ms: () => ms_default,
  nl: () => nl_default,
  no: () => no_default,
  ota: () => ota_default,
  pl: () => pl_default,
  ps: () => ps_default,
  pt: () => pt_default,
  ro: () => ro_default,
  ru: () => ru_default,
  sl: () => sl_default,
  sv: () => sv_default,
  ta: () => ta_default,
  th: () => th_default,
  tr: () => tr_default,
  ua: () => ua_default,
  uk: () => uk_default,
  ur: () => ur_default,
  uz: () => uz_default,
  vi: () => vi_default,
  yo: () => yo_default,
  zhCN: () => zh_CN_default,
  zhTW: () => zh_TW_default
});

// node_modules/zod/v4/locales/ar.js
var error = () => {
  const Sizable = {
    string: { unit: "\u062D\u0631\u0641", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
    file: { unit: "\u0628\u0627\u064A\u062A", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
    array: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
    set: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0645\u062F\u062E\u0644",
    email: "\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
    url: "\u0631\u0627\u0628\u0637",
    emoji: "\u0625\u064A\u0645\u0648\u062C\u064A",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "\u062A\u0627\u0631\u064A\u062E \u0648\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
    date: "\u062A\u0627\u0631\u064A\u062E \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
    time: "\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
    duration: "\u0645\u062F\u0629 \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
    ipv4: "\u0639\u0646\u0648\u0627\u0646 IPv4",
    ipv6: "\u0639\u0646\u0648\u0627\u0646 IPv6",
    cidrv4: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv4",
    cidrv6: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv6",
    base64: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64-encoded",
    base64url: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64url-encoded",
    json_string: "\u0646\u064E\u0635 \u0639\u0644\u0649 \u0647\u064A\u0626\u0629 JSON",
    e164: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0628\u0645\u0639\u064A\u0627\u0631 E.164",
    jwt: "JWT",
    template_literal: "\u0645\u062F\u062E\u0644"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 instanceof ${issue2.expected}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${received}`;
        }
        return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${expected}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${stringifyPrimitive(issue2.values[0])}`;
        return `\u0627\u062E\u062A\u064A\u0627\u0631 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062A\u0648\u0642\u0639 \u0627\u0646\u062A\u0642\u0627\u0621 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return ` \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${(_c = issue2.origin) != null ? _c : "\u0627\u0644\u0642\u064A\u0645\u0629"} ${adj} ${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0639\u0646\u0635\u0631"}`;
        return `\u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${(_e = issue2.origin) != null ? _e : "\u0627\u0644\u0642\u064A\u0645\u0629"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${issue2.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${issue2.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 "${issue2.prefix}"`;
        if (_issue.format === "ends_with")
          return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0646\u062A\u0647\u064A \u0628\u0640 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0636\u0645\u0651\u064E\u0646 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0646\u0645\u0637 ${_issue.pattern}`;
        return `${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format} \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644`;
      }
      case "not_multiple_of":
        return `\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0646 \u0645\u0636\u0627\u0639\u0641\u0627\u062A ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\u0645\u0639\u0631\u0641${issue2.keys.length > 1 ? "\u0627\u062A" : ""} \u063A\u0631\u064A\u0628${issue2.keys.length > 1 ? "\u0629" : ""}: ${joinValues(issue2.keys, "\u060C ")}`;
      case "invalid_key":
        return `\u0645\u0639\u0631\u0641 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${issue2.origin}`;
      case "invalid_union":
        return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
      case "invalid_element":
        return `\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${issue2.origin}`;
      default:
        return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
    }
  };
};
function ar_default() {
  return {
    localeError: error()
  };
}

// node_modules/zod/v4/locales/az.js
var error2 = () => {
  const Sizable = {
    string: { unit: "simvol", verb: "olmal\u0131d\u0131r" },
    file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
    array: { unit: "element", verb: "olmal\u0131d\u0131r" },
    set: { unit: "element", verb: "olmal\u0131d\u0131r" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n instanceof ${issue2.expected}, daxil olan ${received}`;
        }
        return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${expected}, daxil olan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${stringifyPrimitive(issue2.values[0])}`;
        return `Yanl\u0131\u015F se\xE7im: a\u015Fa\u011F\u0131dak\u0131lardan biri olmal\u0131d\u0131r: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${(_c = issue2.origin) != null ? _c : "d\u0259y\u0259r"} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "element"}`;
        return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${(_e = issue2.origin) != null ? _e : "d\u0259y\u0259r"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Yanl\u0131\u015F m\u0259tn: "${_issue.prefix}" il\u0259 ba\u015Flamal\u0131d\u0131r`;
        if (_issue.format === "ends_with")
          return `Yanl\u0131\u015F m\u0259tn: "${_issue.suffix}" il\u0259 bitm\u0259lidir`;
        if (_issue.format === "includes")
          return `Yanl\u0131\u015F m\u0259tn: "${_issue.includes}" daxil olmal\u0131d\u0131r`;
        if (_issue.format === "regex")
          return `Yanl\u0131\u015F m\u0259tn: ${_issue.pattern} \u015Fablonuna uy\u011Fun olmal\u0131d\u0131r`;
        return `Yanl\u0131\u015F ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Yanl\u0131\u015F \u0259d\u0259d: ${issue2.divisor} il\u0259 b\xF6l\xFCn\u0259 bil\u0259n olmal\u0131d\u0131r`;
      case "unrecognized_keys":
        return `Tan\u0131nmayan a\xE7ar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} daxilind\u0259 yanl\u0131\u015F a\xE7ar`;
      case "invalid_union":
        return "Yanl\u0131\u015F d\u0259y\u0259r";
      case "invalid_element":
        return `${issue2.origin} daxilind\u0259 yanl\u0131\u015F d\u0259y\u0259r`;
      default:
        return `Yanl\u0131\u015F d\u0259y\u0259r`;
    }
  };
};
function az_default() {
  return {
    localeError: error2()
  };
}

// node_modules/zod/v4/locales/be.js
function getBelarusianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
var error3 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "\u0441\u0456\u043C\u0432\u0430\u043B",
        few: "\u0441\u0456\u043C\u0432\u0430\u043B\u044B",
        many: "\u0441\u0456\u043C\u0432\u0430\u043B\u0430\u045E"
      },
      verb: "\u043C\u0435\u0446\u044C"
    },
    array: {
      unit: {
        one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
        few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
        many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E"
      },
      verb: "\u043C\u0435\u0446\u044C"
    },
    set: {
      unit: {
        one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
        few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
        many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E"
      },
      verb: "\u043C\u0435\u0446\u044C"
    },
    file: {
      unit: {
        one: "\u0431\u0430\u0439\u0442",
        few: "\u0431\u0430\u0439\u0442\u044B",
        many: "\u0431\u0430\u0439\u0442\u0430\u045E"
      },
      verb: "\u043C\u0435\u0446\u044C"
    }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0443\u0432\u043E\u0434",
    email: "email \u0430\u0434\u0440\u0430\u0441",
    url: "URL",
    emoji: "\u044D\u043C\u043E\u0434\u0437\u0456",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \u0434\u0430\u0442\u0430 \u0456 \u0447\u0430\u0441",
    date: "ISO \u0434\u0430\u0442\u0430",
    time: "ISO \u0447\u0430\u0441",
    duration: "ISO \u043F\u0440\u0430\u0446\u044F\u0433\u043B\u0430\u0441\u0446\u044C",
    ipv4: "IPv4 \u0430\u0434\u0440\u0430\u0441",
    ipv6: "IPv6 \u0430\u0434\u0440\u0430\u0441",
    cidrv4: "IPv4 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
    cidrv6: "IPv6 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
    base64: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64",
    base64url: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64url",
    json_string: "JSON \u0440\u0430\u0434\u043E\u043A",
    e164: "\u043D\u0443\u043C\u0430\u0440 E.164",
    jwt: "JWT",
    template_literal: "\u0443\u0432\u043E\u0434"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u043B\u0456\u043A",
    array: "\u043C\u0430\u0441\u0456\u045E"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F instanceof ${issue2.expected}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${received}`;
        }
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F ${expected}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F ${stringifyPrimitive(issue2.values[0])}`;
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0432\u0430\u0440\u044B\u044F\u043D\u0442: \u0447\u0430\u043A\u0430\u045E\u0441\u044F \u0430\u0434\u0437\u0456\u043D \u0437 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${(_c = issue2.origin) != null ? _c : "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${sizing.verb} ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${(_d = issue2.origin) != null ? _d : "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${sizing.verb} ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u043F\u0430\u0447\u044B\u043D\u0430\u0446\u0446\u0430 \u0437 "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u0430\u043A\u0430\u043D\u0447\u0432\u0430\u0446\u0446\u0430 \u043D\u0430 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u043C\u044F\u0448\u0447\u0430\u0446\u044C "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0430\u0434\u043F\u0430\u0432\u044F\u0434\u0430\u0446\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B ${(_e = FormatDictionary[_issue.format]) != null ? _e : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043B\u0456\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0431\u044B\u0446\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\u041D\u0435\u0440\u0430\u0441\u043F\u0430\u0437\u043D\u0430\u043D\u044B ${issue2.keys.length > 1 ? "\u043A\u043B\u044E\u0447\u044B" : "\u043A\u043B\u044E\u0447"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043A\u043B\u044E\u0447 \u0443 ${issue2.origin}`;
      case "invalid_union":
        return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
      case "invalid_element":
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u0430\u0435 \u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435 \u045E ${issue2.origin}`;
      default:
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434`;
    }
  };
};
function be_default() {
  return {
    localeError: error3()
  };
}

// node_modules/zod/v4/locales/bg.js
var error4 = () => {
  const Sizable = {
    string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
    file: { unit: "\u0431\u0430\u0439\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
    array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
    set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0432\u0445\u043E\u0434",
    email: "\u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441",
    url: "URL",
    emoji: "\u0435\u043C\u043E\u0434\u0436\u0438",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \u0432\u0440\u0435\u043C\u0435",
    date: "ISO \u0434\u0430\u0442\u0430",
    time: "ISO \u0432\u0440\u0435\u043C\u0435",
    duration: "ISO \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442",
    ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
    ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
    cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
    cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
    base64: "base64-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
    base64url: "base64url-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
    json_string: "JSON \u043D\u0438\u0437",
    e164: "E.164 \u043D\u043E\u043C\u0435\u0440",
    jwt: "JWT",
    template_literal: "\u0432\u0445\u043E\u0434"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0447\u0438\u0441\u043B\u043E",
    array: "\u043C\u0430\u0441\u0438\u0432"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D instanceof ${issue2.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${received}`;
        }
        return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${stringifyPrimitive(issue2.values[0])}`;
        return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u043E\u043F\u0446\u0438\u044F: \u043E\u0447\u0430\u043A\u0432\u0430\u043D\u043E \u0435\u0434\u043D\u043E \u043E\u0442 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${(_c = issue2.origin) != null ? _c : "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430"}`;
        return `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${(_e = issue2.origin) != null ? _e : "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0431\u044A\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin} \u0434\u0430 \u0431\u044A\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u0432\u0430 \u0441 "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u0432\u044A\u0440\u0448\u0432\u0430 \u0441 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0432\u043A\u043B\u044E\u0447\u0432\u0430 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0441\u044A\u0432\u043F\u0430\u0434\u0430 \u0441 ${_issue.pattern}`;
        let invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D";
        if (_issue.format === "emoji")
          invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
        if (_issue.format === "datetime")
          invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
        if (_issue.format === "date")
          invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430";
        if (_issue.format === "time")
          invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
        if (_issue.format === "duration")
          invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430";
        return `${invalid_adj} ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0431\u044A\u0434\u0435 \u043A\u0440\u0430\u0442\u043D\u043E \u043D\u0430 ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\u041D\u0435\u0440\u0430\u0437\u043F\u043E\u0437\u043D\u0430\u0442${issue2.keys.length > 1 ? "\u0438" : ""} \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u043E\u0432\u0435" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043A\u043B\u044E\u0447 \u0432 ${issue2.origin}`;
      case "invalid_union":
        return "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434";
      case "invalid_element":
        return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442 \u0432 ${issue2.origin}`;
      default:
        return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434`;
    }
  };
};
function bg_default() {
  return {
    localeError: error4()
  };
}

// node_modules/zod/v4/locales/ca.js
var error5 = () => {
  const Sizable = {
    string: { unit: "car\xE0cters", verb: "contenir" },
    file: { unit: "bytes", verb: "contenir" },
    array: { unit: "elements", verb: "contenir" },
    set: { unit: "elements", verb: "contenir" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "entrada",
    email: "adre\xE7a electr\xF2nica",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "durada ISO",
    ipv4: "adre\xE7a IPv4",
    ipv6: "adre\xE7a IPv6",
    cidrv4: "rang IPv4",
    cidrv6: "rang IPv6",
    base64: "cadena codificada en base64",
    base64url: "cadena codificada en base64url",
    json_string: "cadena JSON",
    e164: "n\xFAmero E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Tipus inv\xE0lid: s'esperava instanceof ${issue2.expected}, s'ha rebut ${received}`;
        }
        return `Tipus inv\xE0lid: s'esperava ${expected}, s'ha rebut ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Valor inv\xE0lid: s'esperava ${stringifyPrimitive(issue2.values[0])}`;
        return `Opci\xF3 inv\xE0lida: s'esperava una de ${joinValues(issue2.values, " o ")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "com a m\xE0xim" : "menys de";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Massa gran: s'esperava que ${(_c = issue2.origin) != null ? _c : "el valor"} contingu\xE9s ${adj} ${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elements"}`;
        return `Massa gran: s'esperava que ${(_e = issue2.origin) != null ? _e : "el valor"} fos ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "com a m\xEDnim" : "m\xE9s de";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Massa petit: s'esperava que ${issue2.origin} contingu\xE9s ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Massa petit: s'esperava que ${issue2.origin} fos ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Format inv\xE0lid: ha de comen\xE7ar amb "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Format inv\xE0lid: ha d'acabar amb "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Format inv\xE0lid: ha d'incloure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Format inv\xE0lid: ha de coincidir amb el patr\xF3 ${_issue.pattern}`;
        return `Format inv\xE0lid per a ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `N\xFAmero inv\xE0lid: ha de ser m\xFAltiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clau${issue2.keys.length > 1 ? "s" : ""} no reconeguda${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clau inv\xE0lida a ${issue2.origin}`;
      case "invalid_union":
        return "Entrada inv\xE0lida";
      // Could also be "Tipus d'unió invàlid" but "Entrada invàlida" is more general
      case "invalid_element":
        return `Element inv\xE0lid a ${issue2.origin}`;
      default:
        return `Entrada inv\xE0lida`;
    }
  };
};
function ca_default() {
  return {
    localeError: error5()
  };
}

// node_modules/zod/v4/locales/cs.js
var error6 = () => {
  const Sizable = {
    string: { unit: "znak\u016F", verb: "m\xEDt" },
    file: { unit: "bajt\u016F", verb: "m\xEDt" },
    array: { unit: "prvk\u016F", verb: "m\xEDt" },
    set: { unit: "prvk\u016F", verb: "m\xEDt" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "regul\xE1rn\xED v\xFDraz",
    email: "e-mailov\xE1 adresa",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "datum a \u010Das ve form\xE1tu ISO",
    date: "datum ve form\xE1tu ISO",
    time: "\u010Das ve form\xE1tu ISO",
    duration: "doba trv\xE1n\xED ISO",
    ipv4: "IPv4 adresa",
    ipv6: "IPv6 adresa",
    cidrv4: "rozsah IPv4",
    cidrv6: "rozsah IPv6",
    base64: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64",
    base64url: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64url",
    json_string: "\u0159et\u011Bzec ve form\xE1tu JSON",
    e164: "\u010D\xEDslo E.164",
    jwt: "JWT",
    template_literal: "vstup"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u010D\xEDslo",
    string: "\u0159et\u011Bzec",
    function: "funkce",
    array: "pole"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h, _i;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no instanceof ${issue2.expected}, obdr\u017Eeno ${received}`;
        }
        return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${expected}, obdr\u017Eeno ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${stringifyPrimitive(issue2.values[0])}`;
        return `Neplatn\xE1 mo\u017Enost: o\u010Dek\xE1v\xE1na jedna z hodnot ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${(_c = issue2.origin) != null ? _c : "hodnota"} mus\xED m\xEDt ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "prvk\u016F"}`;
        }
        return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${(_e = issue2.origin) != null ? _e : "hodnota"} mus\xED b\xFDt ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${(_f = issue2.origin) != null ? _f : "hodnota"} mus\xED m\xEDt ${adj}${issue2.minimum.toString()} ${(_g = sizing.unit) != null ? _g : "prvk\u016F"}`;
        }
        return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${(_h = issue2.origin) != null ? _h : "hodnota"} mus\xED b\xFDt ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Neplatn\xFD \u0159et\u011Bzec: mus\xED za\u010D\xEDnat na "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Neplatn\xFD \u0159et\u011Bzec: mus\xED kon\u010Dit na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neplatn\xFD \u0159et\u011Bzec: mus\xED obsahovat "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neplatn\xFD \u0159et\u011Bzec: mus\xED odpov\xEDdat vzoru ${_issue.pattern}`;
        return `Neplatn\xFD form\xE1t ${(_i = FormatDictionary[_issue.format]) != null ? _i : issue2.format}`;
      }
      case "not_multiple_of":
        return `Neplatn\xE9 \u010D\xEDslo: mus\xED b\xFDt n\xE1sobkem ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nezn\xE1m\xE9 kl\xED\u010De: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neplatn\xFD kl\xED\u010D v ${issue2.origin}`;
      case "invalid_union":
        return "Neplatn\xFD vstup";
      case "invalid_element":
        return `Neplatn\xE1 hodnota v ${issue2.origin}`;
      default:
        return `Neplatn\xFD vstup`;
    }
  };
};
function cs_default() {
  return {
    localeError: error6()
  };
}

// node_modules/zod/v4/locales/da.js
var error7 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "havde" },
    file: { unit: "bytes", verb: "havde" },
    array: { unit: "elementer", verb: "indeholdt" },
    set: { unit: "elementer", verb: "indeholdt" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "e-mailadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkesl\xE6t",
    date: "ISO-dato",
    time: "ISO-klokkesl\xE6t",
    duration: "ISO-varighed",
    ipv4: "IPv4-omr\xE5de",
    ipv6: "IPv6-omr\xE5de",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodet streng",
    base64url: "base64url-kodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "streng",
    number: "tal",
    boolean: "boolean",
    array: "liste",
    object: "objekt",
    set: "s\xE6t",
    file: "fil"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ugyldigt input: forventede instanceof ${issue2.expected}, fik ${received}`;
        }
        return `Ugyldigt input: forventede ${expected}, fik ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig v\xE6rdi: forventede ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldigt valg: forventede en af f\xF8lgende ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = (_c = TypeDictionary[issue2.origin]) != null ? _c : issue2.origin;
        if (sizing)
          return `For stor: forventede ${origin != null ? origin : "value"} ${sizing.verb} ${adj} ${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elementer"}`;
        return `For stor: forventede ${origin != null ? origin : "value"} havde ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = (_e = TypeDictionary[issue2.origin]) != null ? _e : issue2.origin;
        if (sizing) {
          return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lille: forventede ${origin} havde ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: skal matche m\xF8nsteret ${_issue.pattern}`;
        return `Ugyldig ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldigt tal: skal v\xE6re deleligt med ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukendte n\xF8gler" : "Ukendt n\xF8gle"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig n\xF8gle i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldigt input: matcher ingen af de tilladte typer";
      case "invalid_element":
        return `Ugyldig v\xE6rdi i ${issue2.origin}`;
      default:
        return `Ugyldigt input`;
    }
  };
};
function da_default() {
  return {
    localeError: error7()
  };
}

// node_modules/zod/v4/locales/de.js
var error8 = () => {
  const Sizable = {
    string: { unit: "Zeichen", verb: "zu haben" },
    file: { unit: "Bytes", verb: "zu haben" },
    array: { unit: "Elemente", verb: "zu haben" },
    set: { unit: "Elemente", verb: "zu haben" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "Eingabe",
    email: "E-Mail-Adresse",
    url: "URL",
    emoji: "Emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-Datum und -Uhrzeit",
    date: "ISO-Datum",
    time: "ISO-Uhrzeit",
    duration: "ISO-Dauer",
    ipv4: "IPv4-Adresse",
    ipv6: "IPv6-Adresse",
    cidrv4: "IPv4-Bereich",
    cidrv6: "IPv6-Bereich",
    base64: "Base64-codierter String",
    base64url: "Base64-URL-codierter String",
    json_string: "JSON-String",
    e164: "E.164-Nummer",
    jwt: "JWT",
    template_literal: "Eingabe"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "Zahl",
    array: "Array"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ung\xFCltige Eingabe: erwartet instanceof ${issue2.expected}, erhalten ${received}`;
        }
        return `Ung\xFCltige Eingabe: erwartet ${expected}, erhalten ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ung\xFCltige Eingabe: erwartet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ung\xFCltige Option: erwartet eine von ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Zu gro\xDF: erwartet, dass ${(_c = issue2.origin) != null ? _c : "Wert"} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "Elemente"} hat`;
        return `Zu gro\xDF: erwartet, dass ${(_e = issue2.origin) != null ? _e : "Wert"} ${adj}${issue2.maximum.toString()} ist`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} hat`;
        }
        return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ist`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ung\xFCltiger String: muss mit "${_issue.prefix}" beginnen`;
        if (_issue.format === "ends_with")
          return `Ung\xFCltiger String: muss mit "${_issue.suffix}" enden`;
        if (_issue.format === "includes")
          return `Ung\xFCltiger String: muss "${_issue.includes}" enthalten`;
        if (_issue.format === "regex")
          return `Ung\xFCltiger String: muss dem Muster ${_issue.pattern} entsprechen`;
        return `Ung\xFCltig: ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Ung\xFCltige Zahl: muss ein Vielfaches von ${issue2.divisor} sein`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Unbekannte Schl\xFCssel" : "Unbekannter Schl\xFCssel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ung\xFCltiger Schl\xFCssel in ${issue2.origin}`;
      case "invalid_union":
        return "Ung\xFCltige Eingabe";
      case "invalid_element":
        return `Ung\xFCltiger Wert in ${issue2.origin}`;
      default:
        return `Ung\xFCltige Eingabe`;
    }
  };
};
function de_default() {
  return {
    localeError: error8()
  };
}

// node_modules/zod/v4/locales/el.js
var error9 = () => {
  const Sizable = {
    string: { unit: "\u03C7\u03B1\u03C1\u03B1\u03BA\u03C4\u03AE\u03C1\u03B5\u03C2", verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9" },
    file: { unit: "bytes", verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9" },
    array: { unit: "\u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1", verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9" },
    set: { unit: "\u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1", verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9" },
    map: { unit: "\u03BA\u03B1\u03C4\u03B1\u03C7\u03C9\u03C1\u03AE\u03C3\u03B5\u03B9\u03C2", verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2",
    email: "\u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7 email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1 \u03BA\u03B1\u03B9 \u03CE\u03C1\u03B1",
    date: "ISO \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1",
    time: "ISO \u03CE\u03C1\u03B1",
    duration: "ISO \u03B4\u03B9\u03AC\u03C1\u03BA\u03B5\u03B9\u03B1",
    ipv4: "\u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7 IPv4",
    ipv6: "\u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7 IPv6",
    mac: "\u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7 MAC",
    cidrv4: "\u03B5\u03CD\u03C1\u03BF\u03C2 IPv4",
    cidrv6: "\u03B5\u03CD\u03C1\u03BF\u03C2 IPv6",
    base64: "\u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC \u03BA\u03C9\u03B4\u03B9\u03BA\u03BF\u03C0\u03BF\u03B9\u03B7\u03BC\u03AD\u03BD\u03B7 \u03C3\u03B5 base64",
    base64url: "\u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC \u03BA\u03C9\u03B4\u03B9\u03BA\u03BF\u03C0\u03BF\u03B9\u03B7\u03BC\u03AD\u03BD\u03B7 \u03C3\u03B5 base64url",
    json_string: "\u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC JSON",
    e164: "\u03B1\u03C1\u03B9\u03B8\u03BC\u03CC\u03C2 E.164",
    jwt: "JWT",
    template_literal: "\u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (typeof issue2.expected === "string" && /^[A-Z]/.test(issue2.expected)) {
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD instanceof ${issue2.expected}, \u03BB\u03AE\u03C6\u03B8\u03B7\u03BA\u03B5 ${received}`;
        }
        return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${expected}, \u03BB\u03AE\u03C6\u03B8\u03B7\u03BA\u03B5 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${stringifyPrimitive(issue2.values[0])}`;
        return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03C0\u03B9\u03BB\u03BF\u03B3\u03AE: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD \u03AD\u03BD\u03B1 \u03B1\u03C0\u03CC ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u03A0\u03BF\u03BB\u03CD \u03BC\u03B5\u03B3\u03AC\u03BB\u03BF: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${(_c = issue2.origin) != null ? _c : "\u03C4\u03B9\u03BC\u03AE"} \u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9 ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1"}`;
        return `\u03A0\u03BF\u03BB\u03CD \u03BC\u03B5\u03B3\u03AC\u03BB\u03BF: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${(_e = issue2.origin) != null ? _e : "\u03C4\u03B9\u03BC\u03AE"} \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u03A0\u03BF\u03BB\u03CD \u03BC\u03B9\u03BA\u03C1\u03CC: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${issue2.origin} \u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u03A0\u03BF\u03BB\u03CD \u03BC\u03B9\u03BA\u03C1\u03CC: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${issue2.origin} \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03BE\u03B5\u03BA\u03B9\u03BD\u03AC \u03BC\u03B5 "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03C4\u03B5\u03BB\u03B5\u03B9\u03CE\u03BD\u03B5\u03B9 \u03BC\u03B5 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03C0\u03B5\u03C1\u03B9\u03AD\u03C7\u03B5\u03B9 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03C4\u03B1\u03B9\u03C1\u03B9\u03AC\u03B6\u03B5\u03B9 \u03BC\u03B5 \u03C4\u03BF \u03BC\u03BF\u03C4\u03AF\u03B2\u03BF ${_issue.pattern}`;
        return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03BF: ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03BF\u03C2 \u03B1\u03C1\u03B9\u03B8\u03BC\u03CC\u03C2: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03C0\u03BF\u03BB\u03BB\u03B1\u03C0\u03BB\u03AC\u03C3\u03B9\u03BF \u03C4\u03BF\u03C5 ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\u0386\u03B3\u03BD\u03C9\u03C3\u03C4${issue2.keys.length > 1 ? "\u03B1" : "\u03BF"} \u03BA\u03BB\u03B5\u03B9\u03B4${issue2.keys.length > 1 ? "\u03B9\u03AC" : "\u03AF"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03BF \u03BA\u03BB\u03B5\u03B9\u03B4\u03AF \u03C3\u03C4\u03BF ${issue2.origin}`;
      case "invalid_union":
        return "\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2";
      case "invalid_element":
        return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C4\u03B9\u03BC\u03AE \u03C3\u03C4\u03BF ${issue2.origin}`;
      default:
        return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2`;
    }
  };
};
function el_default() {
  return {
    localeError: error9()
  };
}

// node_modules/zod/v4/locales/en.js
var error10 = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    // Compatibility: "nan" -> "NaN" for display
    nan: "NaN"
    // All other type names omitted - they fall back to raw values via ?? operator
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        return `Invalid input: expected ${expected}, received ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${(_c = issue2.origin) != null ? _c : "value"} to have ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elements"}`;
        return `Too big: expected ${(_e = issue2.origin) != null ? _e : "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        if (issue2.options && Array.isArray(issue2.options) && issue2.options.length > 0) {
          const opts = issue2.options.map((o) => `'${o}'`).join(" | ");
          return `Invalid discriminator value. Expected ${opts}`;
        }
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
function en_default() {
  return {
    localeError: error10()
  };
}

// node_modules/zod/v4/locales/eo.js
var error11 = () => {
  const Sizable = {
    string: { unit: "karaktrojn", verb: "havi" },
    file: { unit: "bajtojn", verb: "havi" },
    array: { unit: "elementojn", verb: "havi" },
    set: { unit: "elementojn", verb: "havi" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "enigo",
    email: "retadreso",
    url: "URL",
    emoji: "emo\u011Dio",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datotempo",
    date: "ISO-dato",
    time: "ISO-tempo",
    duration: "ISO-da\u016Dro",
    ipv4: "IPv4-adreso",
    ipv6: "IPv6-adreso",
    cidrv4: "IPv4-rango",
    cidrv6: "IPv6-rango",
    base64: "64-ume kodita karaktraro",
    base64url: "URL-64-ume kodita karaktraro",
    json_string: "JSON-karaktraro",
    e164: "E.164-nombro",
    jwt: "JWT",
    template_literal: "enigo"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "nombro",
    array: "tabelo",
    null: "senvalora"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Nevalida enigo: atendi\u011Dis instanceof ${issue2.expected}, ricevi\u011Dis ${received}`;
        }
        return `Nevalida enigo: atendi\u011Dis ${expected}, ricevi\u011Dis ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nevalida enigo: atendi\u011Dis ${stringifyPrimitive(issue2.values[0])}`;
        return `Nevalida opcio: atendi\u011Dis unu el ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tro granda: atendi\u011Dis ke ${(_c = issue2.origin) != null ? _c : "valoro"} havu ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elementojn"}`;
        return `Tro granda: atendi\u011Dis ke ${(_e = issue2.origin) != null ? _e : "valoro"} havu ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Tro malgranda: atendi\u011Dis ke ${issue2.origin} havu ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Tro malgranda: atendi\u011Dis ke ${issue2.origin} estu ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nevalida karaktraro: devas komenci\u011Di per "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nevalida karaktraro: devas fini\u011Di per "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
        return `Nevalida ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Nevalida nombro: devas esti oblo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nekonata${issue2.keys.length > 1 ? "j" : ""} \u015Dlosilo${issue2.keys.length > 1 ? "j" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nevalida \u015Dlosilo en ${issue2.origin}`;
      case "invalid_union":
        return "Nevalida enigo";
      case "invalid_element":
        return `Nevalida valoro en ${issue2.origin}`;
      default:
        return `Nevalida enigo`;
    }
  };
};
function eo_default() {
  return {
    localeError: error11()
  };
}

// node_modules/zod/v4/locales/es.js
var error12 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "tener" },
    file: { unit: "bytes", verb: "tener" },
    array: { unit: "elementos", verb: "tener" },
    set: { unit: "elementos", verb: "tener" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "entrada",
    email: "direcci\xF3n de correo electr\xF3nico",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "fecha y hora ISO",
    date: "fecha ISO",
    time: "hora ISO",
    duration: "duraci\xF3n ISO",
    ipv4: "direcci\xF3n IPv4",
    ipv6: "direcci\xF3n IPv6",
    cidrv4: "rango IPv4",
    cidrv6: "rango IPv6",
    base64: "cadena codificada en base64",
    base64url: "URL codificada en base64",
    json_string: "cadena JSON",
    e164: "n\xFAmero E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "texto",
    number: "n\xFAmero",
    boolean: "booleano",
    array: "arreglo",
    object: "objeto",
    set: "conjunto",
    file: "archivo",
    date: "fecha",
    bigint: "n\xFAmero grande",
    symbol: "s\xEDmbolo",
    undefined: "indefinido",
    null: "nulo",
    function: "funci\xF3n",
    map: "mapa",
    record: "registro",
    tuple: "tupla",
    enum: "enumeraci\xF3n",
    union: "uni\xF3n",
    literal: "literal",
    promise: "promesa",
    void: "vac\xEDo",
    never: "nunca",
    unknown: "desconocido",
    any: "cualquiera"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entrada inv\xE1lida: se esperaba instanceof ${issue2.expected}, recibido ${received}`;
        }
        return `Entrada inv\xE1lida: se esperaba ${expected}, recibido ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inv\xE1lida: se esperaba ${stringifyPrimitive(issue2.values[0])}`;
        return `Opci\xF3n inv\xE1lida: se esperaba una de ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = (_c = TypeDictionary[issue2.origin]) != null ? _c : issue2.origin;
        if (sizing)
          return `Demasiado grande: se esperaba que ${origin != null ? origin : "valor"} tuviera ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elementos"}`;
        return `Demasiado grande: se esperaba que ${origin != null ? origin : "valor"} fuera ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = (_e = TypeDictionary[issue2.origin]) != null ? _e : issue2.origin;
        if (sizing) {
          return `Demasiado peque\xF1o: se esperaba que ${origin} tuviera ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Demasiado peque\xF1o: se esperaba que ${origin} fuera ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Cadena inv\xE1lida: debe comenzar con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Cadena inv\xE1lida: debe terminar en "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Cadena inv\xE1lida: debe incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Cadena inv\xE1lida: debe coincidir con el patr\xF3n ${_issue.pattern}`;
        return `Inv\xE1lido ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `N\xFAmero inv\xE1lido: debe ser m\xFAltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Llave${issue2.keys.length > 1 ? "s" : ""} desconocida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Llave inv\xE1lida en ${(_g = TypeDictionary[issue2.origin]) != null ? _g : issue2.origin}`;
      case "invalid_union":
        return "Entrada inv\xE1lida";
      case "invalid_element":
        return `Valor inv\xE1lido en ${(_h = TypeDictionary[issue2.origin]) != null ? _h : issue2.origin}`;
      default:
        return `Entrada inv\xE1lida`;
    }
  };
};
function es_default() {
  return {
    localeError: error12()
  };
}

// node_modules/zod/v4/locales/fa.js
var error13 = () => {
  const Sizable = {
    string: { unit: "\u06A9\u0627\u0631\u0627\u06A9\u062A\u0631", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
    file: { unit: "\u0628\u0627\u06CC\u062A", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
    array: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
    set: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0648\u0631\u0648\u062F\u06CC",
    email: "\u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644",
    url: "URL",
    emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
    date: "\u062A\u0627\u0631\u06CC\u062E \u0627\u06CC\u0632\u0648",
    time: "\u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
    duration: "\u0645\u062F\u062A \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
    ipv4: "IPv4 \u0622\u062F\u0631\u0633",
    ipv6: "IPv6 \u0622\u062F\u0631\u0633",
    cidrv4: "IPv4 \u062F\u0627\u0645\u0646\u0647",
    cidrv6: "IPv6 \u062F\u0627\u0645\u0646\u0647",
    base64: "base64-encoded \u0631\u0634\u062A\u0647",
    base64url: "base64url-encoded \u0631\u0634\u062A\u0647",
    json_string: "JSON \u0631\u0634\u062A\u0647",
    e164: "E.164 \u0639\u062F\u062F",
    jwt: "JWT",
    template_literal: "\u0648\u0631\u0648\u062F\u06CC"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0639\u062F\u062F",
    array: "\u0622\u0631\u0627\u06CC\u0647"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A instanceof ${issue2.expected} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${received} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`;
        }
        return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${expected} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${received} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`;
      }
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${stringifyPrimitive(issue2.values[0])} \u0645\u06CC\u200C\u0628\u0648\u062F`;
        }
        return `\u06AF\u0632\u06CC\u0646\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A \u06CC\u06A9\u06CC \u0627\u0632 ${joinValues(issue2.values, "|")} \u0645\u06CC\u200C\u0628\u0648\u062F`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${(_c = issue2.origin) != null ? _c : "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0639\u0646\u0635\u0631"} \u0628\u0627\u0634\u062F`;
        }
        return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${(_e = issue2.origin) != null ? _e : "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} \u0628\u0627\u0634\u062F`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0628\u0627\u0634\u062F`;
        }
        return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} \u0628\u0627\u0634\u062F`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${_issue.prefix}" \u0634\u0631\u0648\u0639 \u0634\u0648\u062F`;
        }
        if (_issue.format === "ends_with") {
          return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${_issue.suffix}" \u062A\u0645\u0627\u0645 \u0634\u0648\u062F`;
        }
        if (_issue.format === "includes") {
          return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0634\u0627\u0645\u0644 "${_issue.includes}" \u0628\u0627\u0634\u062F`;
        }
        if (_issue.format === "regex") {
          return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 \u0627\u0644\u06AF\u0648\u06CC ${_issue.pattern} \u0645\u0637\u0627\u0628\u0642\u062A \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F`;
        }
        return `${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format} \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
      }
      case "not_multiple_of":
        return `\u0639\u062F\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0645\u0636\u0631\u0628 ${issue2.divisor} \u0628\u0627\u0634\u062F`;
      case "unrecognized_keys":
        return `\u06A9\u0644\u06CC\u062F${issue2.keys.length > 1 ? "\u0647\u0627\u06CC" : ""} \u0646\u0627\u0634\u0646\u0627\u0633: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u06A9\u0644\u06CC\u062F \u0646\u0627\u0634\u0646\u0627\u0633 \u062F\u0631 ${issue2.origin}`;
      case "invalid_union":
        return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
      case "invalid_element":
        return `\u0645\u0642\u062F\u0627\u0631 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u062F\u0631 ${issue2.origin}`;
      default:
        return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
    }
  };
};
function fa_default() {
  return {
    localeError: error13()
  };
}

// node_modules/zod/v4/locales/fi.js
var error14 = () => {
  const Sizable = {
    string: { unit: "merkki\xE4", subject: "merkkijonon" },
    file: { unit: "tavua", subject: "tiedoston" },
    array: { unit: "alkiota", subject: "listan" },
    set: { unit: "alkiota", subject: "joukon" },
    number: { unit: "", subject: "luvun" },
    bigint: { unit: "", subject: "suuren kokonaisluvun" },
    int: { unit: "", subject: "kokonaisluvun" },
    date: { unit: "", subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "s\xE4\xE4nn\xF6llinen lauseke",
    email: "s\xE4hk\xF6postiosoite",
    url: "URL-osoite",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-aikaleima",
    date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4",
    time: "ISO-aika",
    duration: "ISO-kesto",
    ipv4: "IPv4-osoite",
    ipv6: "IPv6-osoite",
    cidrv4: "IPv4-alue",
    cidrv6: "IPv6-alue",
    base64: "base64-koodattu merkkijono",
    base64url: "base64url-koodattu merkkijono",
    json_string: "JSON-merkkijono",
    e164: "E.164-luku",
    jwt: "JWT",
    template_literal: "templaattimerkkijono"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Virheellinen tyyppi: odotettiin instanceof ${issue2.expected}, oli ${received}`;
        }
        return `Virheellinen tyyppi: odotettiin ${expected}, oli ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Virheellinen sy\xF6te: t\xE4ytyy olla ${stringifyPrimitive(issue2.values[0])}`;
        return `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian suuri: ${sizing.subject} t\xE4ytyy olla ${adj}${issue2.maximum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian suuri: arvon t\xE4ytyy olla ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian pieni: ${sizing.subject} t\xE4ytyy olla ${adj}${issue2.minimum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian pieni: arvon t\xE4ytyy olla ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Virheellinen sy\xF6te: t\xE4ytyy loppua "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${_issue.includes}"`;
        if (_issue.format === "regex") {
          return `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${_issue.pattern}`;
        }
        return `Virheellinen ${(_c = FormatDictionary[_issue.format]) != null ? _c : issue2.format}`;
      }
      case "not_multiple_of":
        return `Virheellinen luku: t\xE4ytyy olla luvun ${issue2.divisor} monikerta`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Virheellinen avain tietueessa";
      case "invalid_union":
        return "Virheellinen unioni";
      case "invalid_element":
        return "Virheellinen arvo joukossa";
      default:
        return `Virheellinen sy\xF6te`;
    }
  };
};
function fi_default() {
  return {
    localeError: error14()
  };
}

// node_modules/zod/v4/locales/fr.js
var error15 = () => {
  const Sizable = {
    string: { unit: "caract\xE8res", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "\xE9l\xE9ments", verb: "avoir" },
    set: { unit: "\xE9l\xE9ments", verb: "avoir" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "entr\xE9e",
    email: "adresse e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date et heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "dur\xE9e ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "cha\xEEne encod\xE9e en base64",
    base64url: "cha\xEEne encod\xE9e en base64url",
    json_string: "cha\xEEne JSON",
    e164: "num\xE9ro E.164",
    jwt: "JWT",
    template_literal: "entr\xE9e"
  };
  const TypeDictionary = {
    string: "cha\xEEne",
    number: "nombre",
    int: "entier",
    boolean: "bool\xE9en",
    bigint: "grand entier",
    symbol: "symbole",
    undefined: "ind\xE9fini",
    null: "null",
    never: "jamais",
    void: "vide",
    date: "date",
    array: "tableau",
    object: "objet",
    tuple: "tuple",
    record: "enregistrement",
    map: "carte",
    set: "ensemble",
    file: "fichier",
    nonoptional: "non-optionnel",
    nan: "NaN",
    function: "fonction"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entr\xE9e invalide : instanceof ${issue2.expected} attendu, ${received} re\xE7u`;
        }
        return `Entr\xE9e invalide : ${expected} attendu, ${received} re\xE7u`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entr\xE9e invalide : ${stringifyPrimitive(issue2.values[0])} attendu`;
        return `Option invalide : une valeur parmi ${joinValues(issue2.values, "|")} attendue`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : ${(_c = TypeDictionary[issue2.origin]) != null ? _c : "valeur"} doit ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\xE9l\xE9ment(s)"}`;
        return `Trop grand : ${(_e = TypeDictionary[issue2.origin]) != null ? _e : "valeur"} doit \xEAtre ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop petit : ${(_f = TypeDictionary[issue2.origin]) != null ? _f : "valeur"} doit ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Trop petit : ${(_g = TypeDictionary[issue2.origin]) != null ? _g : "valeur"} doit \xEAtre ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Cha\xEEne invalide : doit commencer par "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Cha\xEEne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Cha\xEEne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Cha\xEEne invalide : doit correspondre au mod\xE8le ${_issue.pattern}`;
        return `${(_h = FormatDictionary[_issue.format]) != null ? _h : issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit \xEAtre un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Cl\xE9${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Cl\xE9 invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entr\xE9e invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entr\xE9e invalide`;
    }
  };
};
function fr_default() {
  return {
    localeError: error15()
  };
}

// node_modules/zod/v4/locales/fr-CA.js
var error16 = () => {
  const Sizable = {
    string: { unit: "caract\xE8res", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "\xE9l\xE9ments", verb: "avoir" },
    set: { unit: "\xE9l\xE9ments", verb: "avoir" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "entr\xE9e",
    email: "adresse courriel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date-heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "dur\xE9e ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "cha\xEEne encod\xE9e en base64",
    base64url: "cha\xEEne encod\xE9e en base64url",
    json_string: "cha\xEEne JSON",
    e164: "num\xE9ro E.164",
    jwt: "JWT",
    template_literal: "entr\xE9e"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entr\xE9e invalide : attendu instanceof ${issue2.expected}, re\xE7u ${received}`;
        }
        return `Entr\xE9e invalide : attendu ${expected}, re\xE7u ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entr\xE9e invalide : attendu ${stringifyPrimitive(issue2.values[0])}`;
        return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "\u2264" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : attendu que ${(_c = issue2.origin) != null ? _c : "la valeur"} ait ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `Trop grand : attendu que ${(_d = issue2.origin) != null ? _d : "la valeur"} soit ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "\u2265" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Trop petit : attendu que ${issue2.origin} ait ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Trop petit : attendu que ${issue2.origin} soit ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Cha\xEEne invalide : doit commencer par "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Cha\xEEne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Cha\xEEne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Cha\xEEne invalide : doit correspondre au motif ${_issue.pattern}`;
        return `${(_e = FormatDictionary[_issue.format]) != null ? _e : issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit \xEAtre un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Cl\xE9${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Cl\xE9 invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entr\xE9e invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entr\xE9e invalide`;
    }
  };
};
function fr_CA_default() {
  return {
    localeError: error16()
  };
}

// node_modules/zod/v4/locales/he.js
var error17 = () => {
  const TypeNames = {
    string: { label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA", gender: "f" },
    number: { label: "\u05DE\u05E1\u05E4\u05E8", gender: "m" },
    boolean: { label: "\u05E2\u05E8\u05DA \u05D1\u05D5\u05DC\u05D9\u05D0\u05E0\u05D9", gender: "m" },
    bigint: { label: "BigInt", gender: "m" },
    date: { label: "\u05EA\u05D0\u05E8\u05D9\u05DA", gender: "m" },
    array: { label: "\u05DE\u05E2\u05E8\u05DA", gender: "m" },
    object: { label: "\u05D0\u05D5\u05D1\u05D9\u05D9\u05E7\u05D8", gender: "m" },
    null: { label: "\u05E2\u05E8\u05DA \u05E8\u05D9\u05E7 (null)", gender: "m" },
    undefined: { label: "\u05E2\u05E8\u05DA \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8 (undefined)", gender: "m" },
    symbol: { label: "\u05E1\u05D9\u05DE\u05D1\u05D5\u05DC (Symbol)", gender: "m" },
    function: { label: "\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4", gender: "f" },
    map: { label: "\u05DE\u05E4\u05D4 (Map)", gender: "f" },
    set: { label: "\u05E7\u05D1\u05D5\u05E6\u05D4 (Set)", gender: "f" },
    file: { label: "\u05E7\u05D5\u05D1\u05E5", gender: "m" },
    promise: { label: "Promise", gender: "m" },
    NaN: { label: "NaN", gender: "m" },
    unknown: { label: "\u05E2\u05E8\u05DA \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2", gender: "m" },
    value: { label: "\u05E2\u05E8\u05DA", gender: "m" }
  };
  const Sizable = {
    string: { unit: "\u05EA\u05D5\u05D5\u05D9\u05DD", shortLabel: "\u05E7\u05E6\u05E8", longLabel: "\u05D0\u05E8\u05D5\u05DA" },
    file: { unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD", shortLabel: "\u05E7\u05D8\u05DF", longLabel: "\u05D2\u05D3\u05D5\u05DC" },
    array: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", shortLabel: "\u05E7\u05D8\u05DF", longLabel: "\u05D2\u05D3\u05D5\u05DC" },
    set: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", shortLabel: "\u05E7\u05D8\u05DF", longLabel: "\u05D2\u05D3\u05D5\u05DC" },
    number: { unit: "", shortLabel: "\u05E7\u05D8\u05DF", longLabel: "\u05D2\u05D3\u05D5\u05DC" }
    // no unit
  };
  const typeEntry = (t2) => t2 ? TypeNames[t2] : void 0;
  const typeLabel = (t2) => {
    const e = typeEntry(t2);
    if (e)
      return e.label;
    return t2 != null ? t2 : TypeNames.unknown.label;
  };
  const withDefinite = (t2) => `\u05D4${typeLabel(t2)}`;
  const verbFor = (t2) => {
    var _a5;
    const e = typeEntry(t2);
    const gender = (_a5 = e == null ? void 0 : e.gender) != null ? _a5 : "m";
    return gender === "f" ? "\u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05D9\u05D5\u05EA" : "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA";
  };
  const getSizing = (origin) => {
    var _a5;
    if (!origin)
      return null;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  };
  const FormatDictionary = {
    regex: { label: "\u05E7\u05DC\u05D8", gender: "m" },
    email: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC", gender: "f" },
    url: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA", gender: "f" },
    emoji: { label: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9", gender: "m" },
    uuid: { label: "UUID", gender: "m" },
    nanoid: { label: "nanoid", gender: "m" },
    guid: { label: "GUID", gender: "m" },
    cuid: { label: "cuid", gender: "m" },
    cuid2: { label: "cuid2", gender: "m" },
    ulid: { label: "ULID", gender: "m" },
    xid: { label: "XID", gender: "m" },
    ksuid: { label: "KSUID", gender: "m" },
    datetime: { label: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO", gender: "m" },
    date: { label: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO", gender: "m" },
    time: { label: "\u05D6\u05DE\u05DF ISO", gender: "m" },
    duration: { label: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO", gender: "m" },
    ipv4: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4", gender: "f" },
    ipv6: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6", gender: "f" },
    cidrv4: { label: "\u05D8\u05D5\u05D5\u05D7 IPv4", gender: "m" },
    cidrv6: { label: "\u05D8\u05D5\u05D5\u05D7 IPv6", gender: "m" },
    base64: { label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64", gender: "f" },
    base64url: { label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA", gender: "f" },
    json_string: { label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON", gender: "f" },
    e164: { label: "\u05DE\u05E1\u05E4\u05E8 E.164", gender: "m" },
    jwt: { label: "JWT", gender: "m" },
    ends_with: { label: "\u05E7\u05DC\u05D8", gender: "m" },
    includes: { label: "\u05E7\u05DC\u05D8", gender: "m" },
    lowercase: { label: "\u05E7\u05DC\u05D8", gender: "m" },
    starts_with: { label: "\u05E7\u05DC\u05D8", gender: "m" },
    uppercase: { label: "\u05E7\u05DC\u05D8", gender: "m" }
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u;
    switch (issue2.code) {
      case "invalid_type": {
        const expectedKey = issue2.expected;
        const expected = (_a5 = TypeDictionary[expectedKey != null ? expectedKey : ""]) != null ? _a5 : typeLabel(expectedKey);
        const receivedType = parsedType(issue2.input);
        const received = (_d = (_c = TypeDictionary[receivedType]) != null ? _c : (_b = TypeNames[receivedType]) == null ? void 0 : _b.label) != null ? _d : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA instanceof ${issue2.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${received}`;
        }
        return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${received}`;
      }
      case "invalid_value": {
        if (issue2.values.length === 1) {
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05E2\u05E8\u05DA \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA ${stringifyPrimitive(issue2.values[0])}`;
        }
        const stringified = issue2.values.map((v) => stringifyPrimitive(v));
        if (issue2.values.length === 2) {
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05DF ${stringified[0]} \u05D0\u05D5 ${stringified[1]}`;
        }
        const lastValue = stringified[stringified.length - 1];
        const restValues = stringified.slice(0, -1).join(", ");
        return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05DF ${restValues} \u05D0\u05D5 ${lastValue}`;
      }
      case "too_big": {
        const sizing = getSizing(issue2.origin);
        const subject = withDefinite((_e = issue2.origin) != null ? _e : "value");
        if (issue2.origin === "string") {
          return `${(_f = sizing == null ? void 0 : sizing.longLabel) != null ? _f : "\u05D0\u05E8\u05D5\u05DA"} \u05DE\u05D3\u05D9: ${subject} \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05DB\u05D9\u05DC ${issue2.maximum.toString()} ${(_g = sizing == null ? void 0 : sizing.unit) != null ? _g : ""} ${issue2.inclusive ? "\u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA" : "\u05DC\u05DB\u05DC \u05D4\u05D9\u05D5\u05EA\u05E8"}`.trim();
        }
        if (issue2.origin === "number") {
          const comparison = issue2.inclusive ? `\u05E7\u05D8\u05DF \u05D0\u05D5 \u05E9\u05D5\u05D5\u05D4 \u05DC-${issue2.maximum}` : `\u05E7\u05D8\u05DF \u05DE-${issue2.maximum}`;
          return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${subject} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${comparison}`;
        }
        if (issue2.origin === "array" || issue2.origin === "set") {
          const verb = issue2.origin === "set" ? "\u05E6\u05E8\u05D9\u05DB\u05D4" : "\u05E6\u05E8\u05D9\u05DA";
          const comparison = issue2.inclusive ? `${issue2.maximum} ${(_h = sizing == null ? void 0 : sizing.unit) != null ? _h : ""} \u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA` : `\u05E4\u05D7\u05D5\u05EA \u05DE-${issue2.maximum} ${(_i = sizing == null ? void 0 : sizing.unit) != null ? _i : ""}`;
          return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${subject} ${verb} \u05DC\u05D4\u05DB\u05D9\u05DC ${comparison}`.trim();
        }
        const adj = issue2.inclusive ? "<=" : "<";
        const be = verbFor((_j = issue2.origin) != null ? _j : "value");
        if (sizing == null ? void 0 : sizing.unit) {
          return `${sizing.longLabel} \u05DE\u05D3\u05D9: ${subject} ${be} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        }
        return `${(_k = sizing == null ? void 0 : sizing.longLabel) != null ? _k : "\u05D2\u05D3\u05D5\u05DC"} \u05DE\u05D3\u05D9: ${subject} ${be} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const sizing = getSizing(issue2.origin);
        const subject = withDefinite((_l = issue2.origin) != null ? _l : "value");
        if (issue2.origin === "string") {
          return `${(_m = sizing == null ? void 0 : sizing.shortLabel) != null ? _m : "\u05E7\u05E6\u05E8"} \u05DE\u05D3\u05D9: ${subject} \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05DB\u05D9\u05DC ${issue2.minimum.toString()} ${(_n = sizing == null ? void 0 : sizing.unit) != null ? _n : ""} ${issue2.inclusive ? "\u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8" : "\u05DC\u05E4\u05D7\u05D5\u05EA"}`.trim();
        }
        if (issue2.origin === "number") {
          const comparison = issue2.inclusive ? `\u05D2\u05D3\u05D5\u05DC \u05D0\u05D5 \u05E9\u05D5\u05D5\u05D4 \u05DC-${issue2.minimum}` : `\u05D2\u05D3\u05D5\u05DC \u05DE-${issue2.minimum}`;
          return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${subject} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${comparison}`;
        }
        if (issue2.origin === "array" || issue2.origin === "set") {
          const verb = issue2.origin === "set" ? "\u05E6\u05E8\u05D9\u05DB\u05D4" : "\u05E6\u05E8\u05D9\u05DA";
          if (issue2.minimum === 1 && issue2.inclusive) {
            const singularPhrase = issue2.origin === "set" ? "\u05DC\u05E4\u05D7\u05D5\u05EA \u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3" : "\u05DC\u05E4\u05D7\u05D5\u05EA \u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3";
            return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${subject} ${verb} \u05DC\u05D4\u05DB\u05D9\u05DC ${singularPhrase}`;
          }
          const comparison = issue2.inclusive ? `${issue2.minimum} ${(_o = sizing == null ? void 0 : sizing.unit) != null ? _o : ""} \u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8` : `\u05D9\u05D5\u05EA\u05E8 \u05DE-${issue2.minimum} ${(_p = sizing == null ? void 0 : sizing.unit) != null ? _p : ""}`;
          return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${subject} ${verb} \u05DC\u05D4\u05DB\u05D9\u05DC ${comparison}`.trim();
        }
        const adj = issue2.inclusive ? ">=" : ">";
        const be = verbFor((_q = issue2.origin) != null ? _q : "value");
        if (sizing == null ? void 0 : sizing.unit) {
          return `${sizing.shortLabel} \u05DE\u05D3\u05D9: ${subject} ${be} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `${(_r = sizing == null ? void 0 : sizing.shortLabel) != null ? _r : "\u05E7\u05D8\u05DF"} \u05DE\u05D3\u05D9: ${subject} ${be} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1 "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${_issue.pattern}`;
        const nounEntry = FormatDictionary[_issue.format];
        const noun = (_s = nounEntry == null ? void 0 : nounEntry.label) != null ? _s : _issue.format;
        const gender = (_t = nounEntry == null ? void 0 : nounEntry.gender) != null ? _t : "m";
        const adjective = gender === "f" ? "\u05EA\u05E7\u05D9\u05E0\u05D4" : "\u05EA\u05E7\u05D9\u05DF";
        return `${noun} \u05DC\u05D0 ${adjective}`;
      }
      case "not_multiple_of":
        return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\u05DE\u05E4\u05EA\u05D7${issue2.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${issue2.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key": {
        return `\u05E9\u05D3\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1\u05D0\u05D5\u05D1\u05D9\u05D9\u05E7\u05D8`;
      }
      case "invalid_union":
        return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
      case "invalid_element": {
        const place = withDefinite((_u = issue2.origin) != null ? _u : "array");
        return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${place}`;
      }
      default:
        return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
    }
  };
};
function he_default() {
  return {
    localeError: error17()
  };
}

// node_modules/zod/v4/locales/hr.js
var error18 = () => {
  const Sizable = {
    string: { unit: "znakova", verb: "imati" },
    file: { unit: "bajtova", verb: "imati" },
    array: { unit: "stavki", verb: "imati" },
    set: { unit: "stavki", verb: "imati" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "unos",
    email: "email adresa",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum i vrijeme",
    date: "ISO datum",
    time: "ISO vrijeme",
    duration: "ISO trajanje",
    ipv4: "IPv4 adresa",
    ipv6: "IPv6 adresa",
    cidrv4: "IPv4 raspon",
    cidrv6: "IPv6 raspon",
    base64: "base64 kodirani tekst",
    base64url: "base64url kodirani tekst",
    json_string: "JSON tekst",
    e164: "E.164 broj",
    jwt: "JWT",
    template_literal: "unos"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "tekst",
    number: "broj",
    boolean: "boolean",
    array: "niz",
    object: "objekt",
    set: "skup",
    file: "datoteka",
    date: "datum",
    bigint: "bigint",
    symbol: "simbol",
    undefined: "undefined",
    null: "null",
    function: "funkcija",
    map: "mapa"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neispravan unos: o\u010Dekuje se instanceof ${issue2.expected}, a primljeno je ${received}`;
        }
        return `Neispravan unos: o\u010Dekuje se ${expected}, a primljeno je ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neispravna vrijednost: o\u010Dekivano ${stringifyPrimitive(issue2.values[0])}`;
        return `Neispravna opcija: o\u010Dekivano jedno od ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = (_c = TypeDictionary[issue2.origin]) != null ? _c : issue2.origin;
        if (sizing)
          return `Preveliko: o\u010Dekivano da ${origin != null ? origin : "vrijednost"} ima ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elemenata"}`;
        return `Preveliko: o\u010Dekivano da ${origin != null ? origin : "vrijednost"} bude ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = (_e = TypeDictionary[issue2.origin]) != null ? _e : issue2.origin;
        if (sizing) {
          return `Premalo: o\u010Dekivano da ${origin} ima ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Premalo: o\u010Dekivano da ${origin} bude ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Neispravan tekst: mora zapo\u010Dinjati s "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Neispravan tekst: mora zavr\u0161avati s "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neispravan tekst: mora sadr\u017Eavati "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neispravan tekst: mora odgovarati uzorku ${_issue.pattern}`;
        return `Neispravna ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Neispravan broj: mora biti vi\u0161ekratnik od ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznat${issue2.keys.length > 1 ? "i klju\u010Devi" : " klju\u010D"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neispravan klju\u010D u ${(_g = TypeDictionary[issue2.origin]) != null ? _g : issue2.origin}`;
      case "invalid_union":
        return "Neispravan unos";
      case "invalid_element":
        return `Neispravna vrijednost u ${(_h = TypeDictionary[issue2.origin]) != null ? _h : issue2.origin}`;
      default:
        return `Neispravan unos`;
    }
  };
};
function hr_default() {
  return {
    localeError: error18()
  };
}

// node_modules/zod/v4/locales/hu.js
var error19 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "legyen" },
    file: { unit: "byte", verb: "legyen" },
    array: { unit: "elem", verb: "legyen" },
    set: { unit: "elem", verb: "legyen" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "bemenet",
    email: "email c\xEDm",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO id\u0151b\xE9lyeg",
    date: "ISO d\xE1tum",
    time: "ISO id\u0151",
    duration: "ISO id\u0151intervallum",
    ipv4: "IPv4 c\xEDm",
    ipv6: "IPv6 c\xEDm",
    cidrv4: "IPv4 tartom\xE1ny",
    cidrv6: "IPv6 tartom\xE1ny",
    base64: "base64-k\xF3dolt string",
    base64url: "base64url-k\xF3dolt string",
    json_string: "JSON string",
    e164: "E.164 sz\xE1m",
    jwt: "JWT",
    template_literal: "bemenet"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "sz\xE1m",
    array: "t\xF6mb"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k instanceof ${issue2.expected}, a kapott \xE9rt\xE9k ${received}`;
        }
        return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${expected}, a kapott \xE9rt\xE9k ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${stringifyPrimitive(issue2.values[0])}`;
        return `\xC9rv\xE9nytelen opci\xF3: valamelyik \xE9rt\xE9k v\xE1rt ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `T\xFAl nagy: ${(_c = issue2.origin) != null ? _c : "\xE9rt\xE9k"} m\xE9rete t\xFAl nagy ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elem"}`;
        return `T\xFAl nagy: a bemeneti \xE9rt\xE9k ${(_e = issue2.origin) != null ? _e : "\xE9rt\xE9k"} t\xFAl nagy: ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${issue2.origin} m\xE9rete t\xFAl kicsi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${issue2.origin} t\xFAl kicsi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\xC9rv\xE9nytelen string: "${_issue.prefix}" \xE9rt\xE9kkel kell kezd\u0151dnie`;
        if (_issue.format === "ends_with")
          return `\xC9rv\xE9nytelen string: "${_issue.suffix}" \xE9rt\xE9kkel kell v\xE9gz\u0151dnie`;
        if (_issue.format === "includes")
          return `\xC9rv\xE9nytelen string: "${_issue.includes}" \xE9rt\xE9ket kell tartalmaznia`;
        if (_issue.format === "regex")
          return `\xC9rv\xE9nytelen string: ${_issue.pattern} mint\xE1nak kell megfelelnie`;
        return `\xC9rv\xE9nytelen ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\xC9rv\xE9nytelen sz\xE1m: ${issue2.divisor} t\xF6bbsz\xF6r\xF6s\xE9nek kell lennie`;
      case "unrecognized_keys":
        return `Ismeretlen kulcs${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\xC9rv\xE9nytelen kulcs ${issue2.origin}`;
      case "invalid_union":
        return "\xC9rv\xE9nytelen bemenet";
      case "invalid_element":
        return `\xC9rv\xE9nytelen \xE9rt\xE9k: ${issue2.origin}`;
      default:
        return `\xC9rv\xE9nytelen bemenet`;
    }
  };
};
function hu_default() {
  return {
    localeError: error19()
  };
}

// node_modules/zod/v4/locales/hy.js
function getArmenianPlural(count, one, many) {
  return Math.abs(count) === 1 ? one : many;
}
function withDefiniteArticle(word) {
  if (!word)
    return "";
  const vowels = ["\u0561", "\u0565", "\u0568", "\u056B", "\u0578", "\u0578\u0582", "\u0585"];
  const lastChar = word[word.length - 1];
  return word + (vowels.includes(lastChar) ? "\u0576" : "\u0568");
}
var error20 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "\u0576\u0577\u0561\u0576",
        many: "\u0576\u0577\u0561\u0576\u0576\u0565\u0580"
      },
      verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C"
    },
    file: {
      unit: {
        one: "\u0562\u0561\u0575\u0569",
        many: "\u0562\u0561\u0575\u0569\u0565\u0580"
      },
      verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C"
    },
    array: {
      unit: {
        one: "\u057F\u0561\u0580\u0580",
        many: "\u057F\u0561\u0580\u0580\u0565\u0580"
      },
      verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C"
    },
    set: {
      unit: {
        one: "\u057F\u0561\u0580\u0580",
        many: "\u057F\u0561\u0580\u0580\u0565\u0580"
      },
      verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C"
    }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0574\u0578\u0582\u057F\u0584",
    email: "\u0567\u056C. \u0570\u0561\u057D\u0581\u0565",
    url: "URL",
    emoji: "\u0567\u0574\u0578\u057B\u056B",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \u0561\u0574\u057D\u0561\u0569\u056B\u057E \u0587 \u056A\u0561\u0574",
    date: "ISO \u0561\u0574\u057D\u0561\u0569\u056B\u057E",
    time: "ISO \u056A\u0561\u0574",
    duration: "ISO \u057F\u0587\u0578\u0572\u0578\u0582\u0569\u0575\u0578\u0582\u0576",
    ipv4: "IPv4 \u0570\u0561\u057D\u0581\u0565",
    ipv6: "IPv6 \u0570\u0561\u057D\u0581\u0565",
    cidrv4: "IPv4 \u0574\u056B\u057B\u0561\u056F\u0561\u0575\u0584",
    cidrv6: "IPv6 \u0574\u056B\u057B\u0561\u056F\u0561\u0575\u0584",
    base64: "base64 \u0571\u0587\u0561\u0579\u0561\u0583\u0578\u057E \u057F\u0578\u0572",
    base64url: "base64url \u0571\u0587\u0561\u0579\u0561\u0583\u0578\u057E \u057F\u0578\u0572",
    json_string: "JSON \u057F\u0578\u0572",
    e164: "E.164 \u0570\u0561\u0574\u0561\u0580",
    jwt: "JWT",
    template_literal: "\u0574\u0578\u0582\u057F\u0584"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0569\u056B\u057E",
    array: "\u0566\u0561\u0576\u0563\u057E\u0561\u056E"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567\u0580 instanceof ${issue2.expected}, \u057D\u057F\u0561\u0581\u057E\u0565\u056C \u0567 ${received}`;
        }
        return `\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567\u0580 ${expected}, \u057D\u057F\u0561\u0581\u057E\u0565\u056C \u0567 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567\u0580 ${stringifyPrimitive(issue2.values[1])}`;
        return `\u054D\u056D\u0561\u056C \u057F\u0561\u0580\u0562\u0565\u0580\u0561\u056F\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567\u0580 \u0570\u0565\u057F\u0587\u0575\u0561\u056C\u0576\u0565\u0580\u056B\u0581 \u0574\u0565\u056F\u0568\u055D ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getArmenianPlural(maxValue, sizing.unit.one, sizing.unit.many);
          return `\u0549\u0561\u0583\u0561\u0566\u0561\u0576\u0581 \u0574\u0565\u056E \u0561\u0580\u056A\u0565\u0584\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567, \u0578\u0580 ${withDefiniteArticle((_c = issue2.origin) != null ? _c : "\u0561\u0580\u056A\u0565\u0584")} \u056F\u0578\u0582\u0576\u0565\u0576\u0561 ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `\u0549\u0561\u0583\u0561\u0566\u0561\u0576\u0581 \u0574\u0565\u056E \u0561\u0580\u056A\u0565\u0584\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567, \u0578\u0580 ${withDefiniteArticle((_d = issue2.origin) != null ? _d : "\u0561\u0580\u056A\u0565\u0584")} \u056C\u056B\u0576\u056B ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getArmenianPlural(minValue, sizing.unit.one, sizing.unit.many);
          return `\u0549\u0561\u0583\u0561\u0566\u0561\u0576\u0581 \u0583\u0578\u0584\u0580 \u0561\u0580\u056A\u0565\u0584\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567, \u0578\u0580 ${withDefiniteArticle(issue2.origin)} \u056F\u0578\u0582\u0576\u0565\u0576\u0561 ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `\u0549\u0561\u0583\u0561\u0566\u0561\u0576\u0581 \u0583\u0578\u0584\u0580 \u0561\u0580\u056A\u0565\u0584\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567, \u0578\u0580 ${withDefiniteArticle(issue2.origin)} \u056C\u056B\u0576\u056B ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u054D\u056D\u0561\u056C \u057F\u0578\u0572\u2024 \u057A\u0565\u057F\u0584 \u0567 \u057D\u056F\u057D\u057E\u056B "${_issue.prefix}"-\u0578\u057E`;
        if (_issue.format === "ends_with")
          return `\u054D\u056D\u0561\u056C \u057F\u0578\u0572\u2024 \u057A\u0565\u057F\u0584 \u0567 \u0561\u057E\u0561\u0580\u057F\u057E\u056B "${_issue.suffix}"-\u0578\u057E`;
        if (_issue.format === "includes")
          return `\u054D\u056D\u0561\u056C \u057F\u0578\u0572\u2024 \u057A\u0565\u057F\u0584 \u0567 \u057A\u0561\u0580\u0578\u0582\u0576\u0561\u056F\u056B "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u054D\u056D\u0561\u056C \u057F\u0578\u0572\u2024 \u057A\u0565\u057F\u0584 \u0567 \u0570\u0561\u0574\u0561\u057A\u0561\u057F\u0561\u057D\u056D\u0561\u0576\u056B ${_issue.pattern} \u0571\u0587\u0561\u0579\u0561\u0583\u056B\u0576`;
        return `\u054D\u056D\u0561\u056C ${(_e = FormatDictionary[_issue.format]) != null ? _e : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u054D\u056D\u0561\u056C \u0569\u056B\u057E\u2024 \u057A\u0565\u057F\u0584 \u0567 \u0562\u0561\u0566\u0574\u0561\u057A\u0561\u057F\u056B\u056F \u056C\u056B\u0576\u056B ${issue2.divisor}-\u056B`;
      case "unrecognized_keys":
        return `\u0549\u0573\u0561\u0576\u0561\u0579\u057E\u0561\u056E \u0562\u0561\u0576\u0561\u056C\u056B${issue2.keys.length > 1 ? "\u0576\u0565\u0580" : ""}. ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u054D\u056D\u0561\u056C \u0562\u0561\u0576\u0561\u056C\u056B ${withDefiniteArticle(issue2.origin)}-\u0578\u0582\u0574`;
      case "invalid_union":
        return "\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574";
      case "invalid_element":
        return `\u054D\u056D\u0561\u056C \u0561\u0580\u056A\u0565\u0584 ${withDefiniteArticle(issue2.origin)}-\u0578\u0582\u0574`;
      default:
        return `\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574`;
    }
  };
};
function hy_default() {
  return {
    localeError: error20()
  };
}

// node_modules/zod/v4/locales/id.js
var error21 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "memiliki" },
    file: { unit: "byte", verb: "memiliki" },
    array: { unit: "item", verb: "memiliki" },
    set: { unit: "item", verb: "memiliki" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "alamat email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tanggal dan waktu format ISO",
    date: "tanggal format ISO",
    time: "jam format ISO",
    duration: "durasi format ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "rentang alamat IPv4",
    cidrv6: "rentang alamat IPv6",
    base64: "string dengan enkode base64",
    base64url: "string dengan enkode base64url",
    json_string: "string JSON",
    e164: "angka E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input tidak valid: diharapkan instanceof ${issue2.expected}, diterima ${received}`;
        }
        return `Input tidak valid: diharapkan ${expected}, diterima ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak valid: diharapkan ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: diharapkan ${(_c = issue2.origin) != null ? _c : "value"} memiliki ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elemen"}`;
        return `Terlalu besar: diharapkan ${(_e = issue2.origin) != null ? _e : "value"} menjadi ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: diharapkan ${issue2.origin} memiliki ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: diharapkan ${issue2.origin} menjadi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak valid: harus menyertakan "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
        return `${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format} tidak valid`;
      }
      case "not_multiple_of":
        return `Angka tidak valid: harus kelipatan dari ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak valid di ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak valid";
      case "invalid_element":
        return `Nilai tidak valid di ${issue2.origin}`;
      default:
        return `Input tidak valid`;
    }
  };
};
function id_default() {
  return {
    localeError: error21()
  };
}

// node_modules/zod/v4/locales/is.js
var error22 = () => {
  const Sizable = {
    string: { unit: "stafi", verb: "a\xF0 hafa" },
    file: { unit: "b\xE6ti", verb: "a\xF0 hafa" },
    array: { unit: "hluti", verb: "a\xF0 hafa" },
    set: { unit: "hluti", verb: "a\xF0 hafa" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "gildi",
    email: "netfang",
    url: "vefsl\xF3\xF0",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dagsetning og t\xEDmi",
    date: "ISO dagsetning",
    time: "ISO t\xEDmi",
    duration: "ISO t\xEDmalengd",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded strengur",
    base64url: "base64url-encoded strengur",
    json_string: "JSON strengur",
    e164: "E.164 t\xF6lugildi",
    jwt: "JWT",
    template_literal: "gildi"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "n\xFAmer",
    array: "fylki"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Rangt gildi: \xDE\xFA sl\xF3st inn ${received} \xFEar sem \xE1 a\xF0 vera instanceof ${issue2.expected}`;
        }
        return `Rangt gildi: \xDE\xFA sl\xF3st inn ${received} \xFEar sem \xE1 a\xF0 vera ${expected}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Rangt gildi: gert r\xE1\xF0 fyrir ${stringifyPrimitive(issue2.values[0])}`;
        return `\xD3gilt val: m\xE1 vera eitt af eftirfarandi ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${(_c = issue2.origin) != null ? _c : "gildi"} hafi ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "hluti"}`;
        return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${(_e = issue2.origin) != null ? _e : "gildi"} s\xE9 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin} hafi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin} s\xE9 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\xD3gildur strengur: ver\xF0ur a\xF0 byrja \xE1 "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `\xD3gildur strengur: ver\xF0ur a\xF0 enda \xE1 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\xD3gildur strengur: ver\xF0ur a\xF0 innihalda "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\xD3gildur strengur: ver\xF0ur a\xF0 fylgja mynstri ${_issue.pattern}`;
        return `Rangt ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `R\xF6ng tala: ver\xF0ur a\xF0 vera margfeldi af ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\xD3\xFEekkt ${issue2.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Rangur lykill \xED ${issue2.origin}`;
      case "invalid_union":
        return "Rangt gildi";
      case "invalid_element":
        return `Rangt gildi \xED ${issue2.origin}`;
      default:
        return `Rangt gildi`;
    }
  };
};
function is_default() {
  return {
    localeError: error22()
  };
}

// node_modules/zod/v4/locales/it.js
var error23 = () => {
  const Sizable = {
    string: { unit: "caratteri", verb: "avere" },
    file: { unit: "byte", verb: "avere" },
    array: { unit: "elementi", verb: "avere" },
    set: { unit: "elementi", verb: "avere" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "indirizzo email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e ora ISO",
    date: "data ISO",
    time: "ora ISO",
    duration: "durata ISO",
    ipv4: "indirizzo IPv4",
    ipv6: "indirizzo IPv6",
    cidrv4: "intervallo IPv4",
    cidrv6: "intervallo IPv6",
    base64: "stringa codificata in base64",
    base64url: "URL codificata in base64",
    json_string: "stringa JSON",
    e164: "numero E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "numero",
    array: "vettore"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input non valido: atteso instanceof ${issue2.expected}, ricevuto ${received}`;
        }
        return `Input non valido: atteso ${expected}, ricevuto ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input non valido: atteso ${stringifyPrimitive(issue2.values[0])}`;
        return `Opzione non valida: atteso uno tra ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Troppo grande: ${(_c = issue2.origin) != null ? _c : "valore"} deve avere ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elementi"}`;
        return `Troppo grande: ${(_e = issue2.origin) != null ? _e : "valore"} deve essere ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Troppo piccolo: ${issue2.origin} deve avere ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Troppo piccolo: ${issue2.origin} deve essere ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Stringa non valida: deve includere "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
        return `Input non valido: ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Numero non valido: deve essere un multiplo di ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chiav${issue2.keys.length > 1 ? "i" : "e"} non riconosciut${issue2.keys.length > 1 ? "e" : "a"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chiave non valida in ${issue2.origin}`;
      case "invalid_union":
        return "Input non valido";
      case "invalid_element":
        return `Valore non valido in ${issue2.origin}`;
      default:
        return `Input non valido`;
    }
  };
};
function it_default() {
  return {
    localeError: error23()
  };
}

// node_modules/zod/v4/locales/ja.js
var error24 = () => {
  const Sizable = {
    string: { unit: "\u6587\u5B57", verb: "\u3067\u3042\u308B" },
    file: { unit: "\u30D0\u30A4\u30C8", verb: "\u3067\u3042\u308B" },
    array: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
    set: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u5165\u529B\u5024",
    email: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9",
    url: "URL",
    emoji: "\u7D75\u6587\u5B57",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO\u65E5\u6642",
    date: "ISO\u65E5\u4ED8",
    time: "ISO\u6642\u523B",
    duration: "ISO\u671F\u9593",
    ipv4: "IPv4\u30A2\u30C9\u30EC\u30B9",
    ipv6: "IPv6\u30A2\u30C9\u30EC\u30B9",
    cidrv4: "IPv4\u7BC4\u56F2",
    cidrv6: "IPv6\u7BC4\u56F2",
    base64: "base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
    base64url: "base64url\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
    json_string: "JSON\u6587\u5B57\u5217",
    e164: "E.164\u756A\u53F7",
    jwt: "JWT",
    template_literal: "\u5165\u529B\u5024"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u6570\u5024",
    array: "\u914D\u5217"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u7121\u52B9\u306A\u5165\u529B: instanceof ${issue2.expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${received}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
        }
        return `\u7121\u52B9\u306A\u5165\u529B: ${expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${received}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u7121\u52B9\u306A\u5165\u529B: ${stringifyPrimitive(issue2.values[0])}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F`;
        return `\u7121\u52B9\u306A\u9078\u629E: ${joinValues(issue2.values, "\u3001")}\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
      case "too_big": {
        const adj = issue2.inclusive ? "\u4EE5\u4E0B\u3067\u3042\u308B" : "\u3088\u308A\u5C0F\u3055\u3044";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u5927\u304D\u3059\u304E\u308B\u5024: ${(_c = issue2.origin) != null ? _c : "\u5024"}\u306F${issue2.maximum.toString()}${(_d = sizing.unit) != null ? _d : "\u8981\u7D20"}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        return `\u5927\u304D\u3059\u304E\u308B\u5024: ${(_e = issue2.origin) != null ? _e : "\u5024"}\u306F${issue2.maximum.toString()}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "\u4EE5\u4E0A\u3067\u3042\u308B" : "\u3088\u308A\u5927\u304D\u3044";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${issue2.origin}\u306F${issue2.minimum.toString()}${sizing.unit}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${issue2.origin}\u306F${issue2.minimum.toString()}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.prefix}"\u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        if (_issue.format === "ends_with")
          return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.suffix}"\u3067\u7D42\u308F\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        if (_issue.format === "includes")
          return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.includes}"\u3092\u542B\u3080\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        if (_issue.format === "regex")
          return `\u7121\u52B9\u306A\u6587\u5B57\u5217: \u30D1\u30BF\u30FC\u30F3${_issue.pattern}\u306B\u4E00\u81F4\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        return `\u7121\u52B9\u306A${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u7121\u52B9\u306A\u6570\u5024: ${issue2.divisor}\u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
      case "unrecognized_keys":
        return `\u8A8D\u8B58\u3055\u308C\u3066\u3044\u306A\u3044\u30AD\u30FC${issue2.keys.length > 1 ? "\u7FA4" : ""}: ${joinValues(issue2.keys, "\u3001")}`;
      case "invalid_key":
        return `${issue2.origin}\u5185\u306E\u7121\u52B9\u306A\u30AD\u30FC`;
      case "invalid_union":
        return "\u7121\u52B9\u306A\u5165\u529B";
      case "invalid_element":
        return `${issue2.origin}\u5185\u306E\u7121\u52B9\u306A\u5024`;
      default:
        return `\u7121\u52B9\u306A\u5165\u529B`;
    }
  };
};
function ja_default() {
  return {
    localeError: error24()
  };
}

// node_modules/zod/v4/locales/ka.js
var error25 = () => {
  const Sizable = {
    string: { unit: "\u10E1\u10D8\u10DB\u10D1\u10DD\u10DA\u10DD", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
    file: { unit: "\u10D1\u10D0\u10D8\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
    array: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
    set: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0",
    email: "\u10D4\u10DA-\u10E4\u10DD\u10E1\u10E2\u10D8\u10E1 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
    url: "URL",
    emoji: "\u10D4\u10DB\u10DD\u10EF\u10D8",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8-\u10D3\u10E0\u10DD",
    date: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8",
    time: "\u10D3\u10E0\u10DD",
    duration: "\u10EE\u10D0\u10DC\u10D2\u10E0\u10EB\u10DA\u10D8\u10D5\u10DD\u10D1\u10D0",
    ipv4: "IPv4 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
    ipv6: "IPv6 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
    cidrv4: "IPv4 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
    cidrv6: "IPv6 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
    base64: "base64-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10D5\u10D4\u10DA\u10D8",
    base64url: "base64url-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10D5\u10D4\u10DA\u10D8",
    json_string: "JSON \u10D5\u10D4\u10DA\u10D8",
    e164: "E.164 \u10DC\u10DD\u10DB\u10D4\u10E0\u10D8",
    jwt: "JWT",
    template_literal: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8",
    string: "\u10D5\u10D4\u10DA\u10D8",
    boolean: "\u10D1\u10E3\u10DA\u10D4\u10D0\u10DC\u10D8",
    function: "\u10E4\u10E3\u10DC\u10E5\u10EA\u10D8\u10D0",
    array: "\u10DB\u10D0\u10E1\u10D8\u10D5\u10D8"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 instanceof ${issue2.expected}, \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8 ${received}`;
        }
        return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${expected}, \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${stringifyPrimitive(issue2.values[0])}`;
        return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8\u10D0 \u10D4\u10E0\u10D7-\u10D4\u10E0\u10D7\u10D8 ${joinValues(issue2.values, "|")}-\u10D3\u10D0\u10DC`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${(_c = issue2.origin) != null ? _c : "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${(_d = issue2.origin) != null ? _d : "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} \u10D8\u10E7\u10DD\u10E1 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin} \u10D8\u10E7\u10DD\u10E1 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D4\u10DA\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10EC\u10E7\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${_issue.prefix}"-\u10D8\u10D7`;
        }
        if (_issue.format === "ends_with")
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D4\u10DA\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10DB\u10D7\u10D0\u10D5\u10E0\u10D3\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${_issue.suffix}"-\u10D8\u10D7`;
        if (_issue.format === "includes")
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D4\u10DA\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1 "${_issue.includes}"-\u10E1`;
        if (_issue.format === "regex")
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D4\u10DA\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D4\u10E1\u10D0\u10D1\u10D0\u10DB\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 \u10E8\u10D0\u10D1\u10DA\u10DD\u10DC\u10E1 ${_issue.pattern}`;
        return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 ${(_e = FormatDictionary[_issue.format]) != null ? _e : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E0\u10D8\u10EA\u10EE\u10D5\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 ${issue2.divisor}-\u10D8\u10E1 \u10EF\u10D4\u10E0\u10D0\u10D3\u10D8`;
      case "unrecognized_keys":
        return `\u10E3\u10EA\u10DC\u10DD\u10D1\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1${issue2.keys.length > 1 ? "\u10D4\u10D1\u10D8" : "\u10D8"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1\u10D8 ${issue2.origin}-\u10E8\u10D8`;
      case "invalid_union":
        return "\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0";
      case "invalid_element":
        return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0 ${issue2.origin}-\u10E8\u10D8`;
      default:
        return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0`;
    }
  };
};
function ka_default() {
  return {
    localeError: error25()
  };
}

// node_modules/zod/v4/locales/km.js
var error26 = () => {
  const Sizable = {
    string: { unit: "\u178F\u17BD\u17A2\u1780\u17D2\u179F\u179A", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
    file: { unit: "\u1794\u17C3", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
    array: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
    set: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B",
    email: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793\u17A2\u17CA\u17B8\u1798\u17C2\u179B",
    url: "URL",
    emoji: "\u179F\u1789\u17D2\u1789\u17B6\u17A2\u17B6\u179A\u1798\u17D2\u1798\u178E\u17CD",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 \u1793\u17B7\u1784\u1798\u17C9\u17C4\u1784 ISO",
    date: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 ISO",
    time: "\u1798\u17C9\u17C4\u1784 ISO",
    duration: "\u179A\u1799\u17C8\u1796\u17C1\u179B ISO",
    ipv4: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
    ipv6: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
    cidrv4: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
    cidrv6: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
    base64: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64",
    base64url: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64url",
    json_string: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A JSON",
    e164: "\u179B\u17C1\u1781 E.164",
    jwt: "JWT",
    template_literal: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u179B\u17C1\u1781",
    array: "\u17A2\u17B6\u179A\u17C1 (Array)",
    null: "\u1782\u17D2\u1798\u17B6\u1793\u178F\u1798\u17D2\u179B\u17C3 (null)"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A instanceof ${issue2.expected} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${received}`;
        }
        return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${expected} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${stringifyPrimitive(issue2.values[0])}`;
        return `\u1787\u1798\u17D2\u179A\u17BE\u179F\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1787\u17B6\u1798\u17BD\u1799\u1780\u17D2\u1793\u17BB\u1784\u1785\u17C6\u178E\u17C4\u1798 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${(_c = issue2.origin) != null ? _c : "\u178F\u1798\u17D2\u179B\u17C3"} ${adj} ${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u1792\u17B6\u178F\u17BB"}`;
        return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${(_e = issue2.origin) != null ? _e : "\u178F\u1798\u17D2\u179B\u17C3"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin} ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1785\u17B6\u1794\u17CB\u1795\u17D2\u178F\u17BE\u1798\u178A\u17C4\u1799 "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1794\u1789\u17D2\u1785\u1794\u17CB\u178A\u17C4\u1799 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1798\u17B6\u1793 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1795\u17D2\u1782\u17BC\u1795\u17D2\u1782\u1784\u1793\u17B9\u1784\u1791\u1798\u17D2\u179A\u1784\u17CB\u178A\u17C2\u179B\u1794\u17B6\u1793\u1780\u17C6\u178E\u178F\u17CB ${_issue.pattern}`;
        return `\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u179B\u17C1\u1781\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1787\u17B6\u1796\u17A0\u17BB\u1782\u17BB\u178E\u1793\u17C3 ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\u179A\u1780\u1783\u17BE\u1789\u179F\u17C4\u1798\u17B7\u1793\u179F\u17D2\u1782\u17B6\u179B\u17CB\u17D6 ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u179F\u17C4\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${issue2.origin}`;
      case "invalid_union":
        return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C`;
      case "invalid_element":
        return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${issue2.origin}`;
      default:
        return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C`;
    }
  };
};
function km_default() {
  return {
    localeError: error26()
  };
}

// node_modules/zod/v4/locales/kh.js
function kh_default() {
  return km_default();
}

// node_modules/zod/v4/locales/ko.js
var error27 = () => {
  const Sizable = {
    string: { unit: "\uBB38\uC790", verb: "to have" },
    file: { unit: "\uBC14\uC774\uD2B8", verb: "to have" },
    array: { unit: "\uAC1C", verb: "to have" },
    set: { unit: "\uAC1C", verb: "to have" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\uC785\uB825",
    email: "\uC774\uBA54\uC77C \uC8FC\uC18C",
    url: "URL",
    emoji: "\uC774\uBAA8\uC9C0",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \uB0A0\uC9DC\uC2DC\uAC04",
    date: "ISO \uB0A0\uC9DC",
    time: "ISO \uC2DC\uAC04",
    duration: "ISO \uAE30\uAC04",
    ipv4: "IPv4 \uC8FC\uC18C",
    ipv6: "IPv6 \uC8FC\uC18C",
    cidrv4: "IPv4 \uBC94\uC704",
    cidrv6: "IPv6 \uBC94\uC704",
    base64: "base64 \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
    base64url: "base64url \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
    json_string: "JSON \uBB38\uC790\uC5F4",
    e164: "E.164 \uBC88\uD638",
    jwt: "JWT",
    template_literal: "\uC785\uB825"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h, _i;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 instanceof ${issue2.expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${received}\uC785\uB2C8\uB2E4`;
        }
        return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 ${expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${received}\uC785\uB2C8\uB2E4`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\uC798\uBABB\uB41C \uC785\uB825: \uAC12\uC740 ${stringifyPrimitive(issue2.values[0])} \uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`;
        return `\uC798\uBABB\uB41C \uC635\uC158: ${joinValues(issue2.values, "\uB610\uB294 ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
      case "too_big": {
        const adj = issue2.inclusive ? "\uC774\uD558" : "\uBBF8\uB9CC";
        const suffix = adj === "\uBBF8\uB9CC" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4";
        const sizing = getSizing(issue2.origin);
        const unit = (_c = sizing == null ? void 0 : sizing.unit) != null ? _c : "\uC694\uC18C";
        if (sizing)
          return `${(_d = issue2.origin) != null ? _d : "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${issue2.maximum.toString()}${unit} ${adj}${suffix}`;
        return `${(_e = issue2.origin) != null ? _e : "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${issue2.maximum.toString()} ${adj}${suffix}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "\uC774\uC0C1" : "\uCD08\uACFC";
        const suffix = adj === "\uC774\uC0C1" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4";
        const sizing = getSizing(issue2.origin);
        const unit = (_f = sizing == null ? void 0 : sizing.unit) != null ? _f : "\uC694\uC18C";
        if (sizing) {
          return `${(_g = issue2.origin) != null ? _g : "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${issue2.minimum.toString()}${unit} ${adj}${suffix}`;
        }
        return `${(_h = issue2.origin) != null ? _h : "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${issue2.minimum.toString()} ${adj}${suffix}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.prefix}"(\uC73C)\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4`;
        }
        if (_issue.format === "ends_with")
          return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.suffix}"(\uC73C)\uB85C \uB05D\uB098\uC57C \uD569\uB2C8\uB2E4`;
        if (_issue.format === "includes")
          return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.includes}"\uC744(\uB97C) \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4`;
        if (_issue.format === "regex")
          return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: \uC815\uADDC\uC2DD ${_issue.pattern} \uD328\uD134\uACFC \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4`;
        return `\uC798\uBABB\uB41C ${(_i = FormatDictionary[_issue.format]) != null ? _i : issue2.format}`;
      }
      case "not_multiple_of":
        return `\uC798\uBABB\uB41C \uC22B\uC790: ${issue2.divisor}\uC758 \uBC30\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
      case "unrecognized_keys":
        return `\uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD0A4: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\uC798\uBABB\uB41C \uD0A4: ${issue2.origin}`;
      case "invalid_union":
        return `\uC798\uBABB\uB41C \uC785\uB825`;
      case "invalid_element":
        return `\uC798\uBABB\uB41C \uAC12: ${issue2.origin}`;
      default:
        return `\uC798\uBABB\uB41C \uC785\uB825`;
    }
  };
};
function ko_default() {
  return {
    localeError: error27()
  };
}

// node_modules/zod/v4/locales/lt.js
var capitalizeFirstCharacter = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};
function getUnitTypeFromNumber(number4) {
  const abs = Math.abs(number4);
  const last = abs % 10;
  const last2 = abs % 100;
  if (last2 >= 11 && last2 <= 19 || last === 0)
    return "many";
  if (last === 1)
    return "one";
  return "few";
}
var error28 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "simbolis",
        few: "simboliai",
        many: "simboli\u0173"
      },
      verb: {
        smaller: {
          inclusive: "turi b\u016Bti ne ilgesn\u0117 kaip",
          notInclusive: "turi b\u016Bti trumpesn\u0117 kaip"
        },
        bigger: {
          inclusive: "turi b\u016Bti ne trumpesn\u0117 kaip",
          notInclusive: "turi b\u016Bti ilgesn\u0117 kaip"
        }
      }
    },
    file: {
      unit: {
        one: "baitas",
        few: "baitai",
        many: "bait\u0173"
      },
      verb: {
        smaller: {
          inclusive: "turi b\u016Bti ne didesnis kaip",
          notInclusive: "turi b\u016Bti ma\u017Eesnis kaip"
        },
        bigger: {
          inclusive: "turi b\u016Bti ne ma\u017Eesnis kaip",
          notInclusive: "turi b\u016Bti didesnis kaip"
        }
      }
    },
    array: {
      unit: {
        one: "element\u0105",
        few: "elementus",
        many: "element\u0173"
      },
      verb: {
        smaller: {
          inclusive: "turi tur\u0117ti ne daugiau kaip",
          notInclusive: "turi tur\u0117ti ma\u017Eiau kaip"
        },
        bigger: {
          inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
          notInclusive: "turi tur\u0117ti daugiau kaip"
        }
      }
    },
    set: {
      unit: {
        one: "element\u0105",
        few: "elementus",
        many: "element\u0173"
      },
      verb: {
        smaller: {
          inclusive: "turi tur\u0117ti ne daugiau kaip",
          notInclusive: "turi tur\u0117ti ma\u017Eiau kaip"
        },
        bigger: {
          inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
          notInclusive: "turi tur\u0117ti daugiau kaip"
        }
      }
    }
  };
  function getSizing(origin, unitType, inclusive, targetShouldBe) {
    var _a5;
    const result = (_a5 = Sizable[origin]) != null ? _a5 : null;
    if (result === null)
      return result;
    return {
      unit: result.unit[unitType],
      verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
    };
  }
  const FormatDictionary = {
    regex: "\u012Fvestis",
    email: "el. pa\u0161to adresas",
    url: "URL",
    emoji: "jaustukas",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO data ir laikas",
    date: "ISO data",
    time: "ISO laikas",
    duration: "ISO trukm\u0117",
    ipv4: "IPv4 adresas",
    ipv6: "IPv6 adresas",
    cidrv4: "IPv4 tinklo prefiksas (CIDR)",
    cidrv6: "IPv6 tinklo prefiksas (CIDR)",
    base64: "base64 u\u017Ekoduota eilut\u0117",
    base64url: "base64url u\u017Ekoduota eilut\u0117",
    json_string: "JSON eilut\u0117",
    e164: "E.164 numeris",
    jwt: "JWT",
    template_literal: "\u012Fvestis"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "skai\u010Dius",
    bigint: "sveikasis skai\u010Dius",
    string: "eilut\u0117",
    boolean: "login\u0117 reik\u0161m\u0117",
    undefined: "neapibr\u0117\u017Eta reik\u0161m\u0117",
    function: "funkcija",
    symbol: "simbolis",
    array: "masyvas",
    object: "objektas",
    null: "nulin\u0117 reik\u0161m\u0117"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Gautas tipas ${received}, o tik\u0117tasi - instanceof ${issue2.expected}`;
        }
        return `Gautas tipas ${received}, o tik\u0117tasi - ${expected}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Privalo b\u016Bti ${stringifyPrimitive(issue2.values[0])}`;
        return `Privalo b\u016Bti vienas i\u0161 ${joinValues(issue2.values, "|")} pasirinkim\u0173`;
      case "too_big": {
        const origin = (_c = TypeDictionary[issue2.origin]) != null ? _c : issue2.origin;
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.maximum)), (_d = issue2.inclusive) != null ? _d : false, "smaller");
        if (sizing == null ? void 0 : sizing.verb)
          return `${capitalizeFirstCharacter((_e = origin != null ? origin : issue2.origin) != null ? _e : "reik\u0161m\u0117")} ${sizing.verb} ${issue2.maximum.toString()} ${(_f = sizing.unit) != null ? _f : "element\u0173"}`;
        const adj = issue2.inclusive ? "ne didesnis kaip" : "ma\u017Eesnis kaip";
        return `${capitalizeFirstCharacter((_g = origin != null ? origin : issue2.origin) != null ? _g : "reik\u0161m\u0117")} turi b\u016Bti ${adj} ${issue2.maximum.toString()} ${sizing == null ? void 0 : sizing.unit}`;
      }
      case "too_small": {
        const origin = (_h = TypeDictionary[issue2.origin]) != null ? _h : issue2.origin;
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.minimum)), (_i = issue2.inclusive) != null ? _i : false, "bigger");
        if (sizing == null ? void 0 : sizing.verb)
          return `${capitalizeFirstCharacter((_j = origin != null ? origin : issue2.origin) != null ? _j : "reik\u0161m\u0117")} ${sizing.verb} ${issue2.minimum.toString()} ${(_k = sizing.unit) != null ? _k : "element\u0173"}`;
        const adj = issue2.inclusive ? "ne ma\u017Eesnis kaip" : "didesnis kaip";
        return `${capitalizeFirstCharacter((_l = origin != null ? origin : issue2.origin) != null ? _l : "reik\u0161m\u0117")} turi b\u016Bti ${adj} ${issue2.minimum.toString()} ${sizing == null ? void 0 : sizing.unit}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Eilut\u0117 privalo prasid\u0117ti "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Eilut\u0117 privalo pasibaigti "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Eilut\u0117 privalo \u012Ftraukti "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Eilut\u0117 privalo atitikti ${_issue.pattern}`;
        return `Neteisingas ${(_m = FormatDictionary[_issue.format]) != null ? _m : issue2.format}`;
      }
      case "not_multiple_of":
        return `Skai\u010Dius privalo b\u016Bti ${issue2.divisor} kartotinis.`;
      case "unrecognized_keys":
        return `Neatpa\u017Eint${issue2.keys.length > 1 ? "i" : "as"} rakt${issue2.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Rastas klaidingas raktas";
      case "invalid_union":
        return "Klaidinga \u012Fvestis";
      case "invalid_element": {
        const origin = (_n = TypeDictionary[issue2.origin]) != null ? _n : issue2.origin;
        return `${capitalizeFirstCharacter((_o = origin != null ? origin : issue2.origin) != null ? _o : "reik\u0161m\u0117")} turi klaiding\u0105 \u012Fvest\u012F`;
      }
      default:
        return "Klaidinga \u012Fvestis";
    }
  };
};
function lt_default() {
  return {
    localeError: error28()
  };
}

// node_modules/zod/v4/locales/mk.js
var error29 = () => {
  const Sizable = {
    string: { unit: "\u0437\u043D\u0430\u0446\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
    file: { unit: "\u0431\u0430\u0458\u0442\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
    array: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
    set: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0432\u043D\u0435\u0441",
    email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u043D\u0430 \u0435-\u043F\u043E\u0448\u0442\u0430",
    url: "URL",
    emoji: "\u0435\u043C\u043E\u045F\u0438",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \u0434\u0430\u0442\u0443\u043C \u0438 \u0432\u0440\u0435\u043C\u0435",
    date: "ISO \u0434\u0430\u0442\u0443\u043C",
    time: "ISO \u0432\u0440\u0435\u043C\u0435",
    duration: "ISO \u0432\u0440\u0435\u043C\u0435\u0442\u0440\u0430\u0435\u045A\u0435",
    ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441\u0430",
    ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441\u0430",
    cidrv4: "IPv4 \u043E\u043F\u0441\u0435\u0433",
    cidrv6: "IPv6 \u043E\u043F\u0441\u0435\u0433",
    base64: "base64-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
    base64url: "base64url-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
    json_string: "JSON \u043D\u0438\u0437\u0430",
    e164: "E.164 \u0431\u0440\u043E\u0458",
    jwt: "JWT",
    template_literal: "\u0432\u043D\u0435\u0441"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0431\u0440\u043E\u0458",
    array: "\u043D\u0438\u0437\u0430"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 instanceof ${issue2.expected}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${received}`;
        }
        return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${expected}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `\u0413\u0440\u0435\u0448\u0430\u043D\u0430 \u043E\u043F\u0446\u0438\u0458\u0430: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 \u0435\u0434\u043D\u0430 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${(_c = issue2.origin) != null ? _c : "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0438\u043C\u0430 ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438"}`;
        return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${(_e = issue2.origin) != null ? _e : "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0431\u0438\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin} \u0434\u0430 \u0438\u043C\u0430 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin} \u0434\u0430 \u0431\u0438\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0443\u0432\u0430 \u0441\u043E "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u0432\u0440\u0448\u0443\u0432\u0430 \u0441\u043E "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0432\u043A\u043B\u0443\u0447\u0443\u0432\u0430 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u043E\u0434\u0433\u043E\u0430\u0440\u0430 \u043D\u0430 \u043F\u0430\u0442\u0435\u0440\u043D\u043E\u0442 ${_issue.pattern}`;
        return `Invalid ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u0413\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u043E\u0458: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0431\u0438\u0434\u0435 \u0434\u0435\u043B\u0438\u0432 \u0441\u043E ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D\u0438 \u043A\u043B\u0443\u0447\u0435\u0432\u0438" : "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D \u043A\u043B\u0443\u0447"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u0413\u0440\u0435\u0448\u0435\u043D \u043A\u043B\u0443\u0447 \u0432\u043E ${issue2.origin}`;
      case "invalid_union":
        return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
      case "invalid_element":
        return `\u0413\u0440\u0435\u0448\u043D\u0430 \u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442 \u0432\u043E ${issue2.origin}`;
      default:
        return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441`;
    }
  };
};
function mk_default() {
  return {
    localeError: error29()
  };
}

// node_modules/zod/v4/locales/ms.js
var error30 = () => {
  const Sizable = {
    string: { unit: "aksara", verb: "mempunyai" },
    file: { unit: "bait", verb: "mempunyai" },
    array: { unit: "elemen", verb: "mempunyai" },
    set: { unit: "elemen", verb: "mempunyai" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "alamat e-mel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tarikh masa ISO",
    date: "tarikh ISO",
    time: "masa ISO",
    duration: "tempoh ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "julat IPv4",
    cidrv6: "julat IPv6",
    base64: "string dikodkan base64",
    base64url: "string dikodkan base64url",
    json_string: "string JSON",
    e164: "nombor E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "nombor"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input tidak sah: dijangka instanceof ${issue2.expected}, diterima ${received}`;
        }
        return `Input tidak sah: dijangka ${expected}, diterima ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak sah: dijangka ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: dijangka ${(_c = issue2.origin) != null ? _c : "nilai"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elemen"}`;
        return `Terlalu besar: dijangka ${(_e = issue2.origin) != null ? _e : "nilai"} adalah ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: dijangka ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: dijangka ${issue2.origin} adalah ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
        return `${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format} tidak sah`;
      }
      case "not_multiple_of":
        return `Nombor tidak sah: perlu gandaan ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak sah dalam ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak sah";
      case "invalid_element":
        return `Nilai tidak sah dalam ${issue2.origin}`;
      default:
        return `Input tidak sah`;
    }
  };
};
function ms_default() {
  return {
    localeError: error30()
  };
}

// node_modules/zod/v4/locales/nl.js
var error31 = () => {
  const Sizable = {
    string: { unit: "tekens", verb: "heeft" },
    file: { unit: "bytes", verb: "heeft" },
    array: { unit: "elementen", verb: "heeft" },
    set: { unit: "elementen", verb: "heeft" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "invoer",
    email: "emailadres",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum en tijd",
    date: "ISO datum",
    time: "ISO tijd",
    duration: "ISO duur",
    ipv4: "IPv4-adres",
    ipv6: "IPv6-adres",
    cidrv4: "IPv4-bereik",
    cidrv6: "IPv6-bereik",
    base64: "base64-gecodeerde tekst",
    base64url: "base64 URL-gecodeerde tekst",
    json_string: "JSON string",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "invoer"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "getal"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ongeldige invoer: verwacht instanceof ${issue2.expected}, ontving ${received}`;
        }
        return `Ongeldige invoer: verwacht ${expected}, ontving ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue2.values[0])}`;
        return `Ongeldige optie: verwacht \xE9\xE9n van ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const longName = issue2.origin === "date" ? "laat" : issue2.origin === "string" ? "lang" : "groot";
        if (sizing)
          return `Te ${longName}: verwacht dat ${(_c = issue2.origin) != null ? _c : "waarde"} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elementen"} ${sizing.verb}`;
        return `Te ${longName}: verwacht dat ${(_e = issue2.origin) != null ? _e : "waarde"} ${adj}${issue2.maximum.toString()} is`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const shortName = issue2.origin === "date" ? "vroeg" : issue2.origin === "string" ? "kort" : "klein";
        if (sizing) {
          return `Te ${shortName}: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
        }
        return `Te ${shortName}: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} is`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
        }
        if (_issue.format === "ends_with")
          return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
        if (_issue.format === "includes")
          return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
        if (_issue.format === "regex")
          return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
        return `Ongeldig: ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Ongeldig getal: moet een veelvoud van ${issue2.divisor} zijn`;
      case "unrecognized_keys":
        return `Onbekende key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ongeldige key in ${issue2.origin}`;
      case "invalid_union":
        return "Ongeldige invoer";
      case "invalid_element":
        return `Ongeldige waarde in ${issue2.origin}`;
      default:
        return `Ongeldige invoer`;
    }
  };
};
function nl_default() {
  return {
    localeError: error31()
  };
}

// node_modules/zod/v4/locales/no.js
var error32 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "\xE5 ha" },
    file: { unit: "bytes", verb: "\xE5 ha" },
    array: { unit: "elementer", verb: "\xE5 inneholde" },
    set: { unit: "elementer", verb: "\xE5 inneholde" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "e-postadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslett",
    date: "ISO-dato",
    time: "ISO-klokkeslett",
    duration: "ISO-varighet",
    ipv4: "IPv4-omr\xE5de",
    ipv6: "IPv6-omr\xE5de",
    cidrv4: "IPv4-spekter",
    cidrv6: "IPv6-spekter",
    base64: "base64-enkodet streng",
    base64url: "base64url-enkodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "tall",
    array: "liste"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ugyldig input: forventet instanceof ${issue2.expected}, fikk ${received}`;
        }
        return `Ugyldig input: forventet ${expected}, fikk ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig verdi: forventet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldig valg: forventet en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `For stor(t): forventet ${(_c = issue2.origin) != null ? _c : "value"} til \xE5 ha ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elementer"}`;
        return `For stor(t): forventet ${(_e = issue2.origin) != null ? _e : "value"} til \xE5 ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `For lite(n): forventet ${issue2.origin} til \xE5 ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lite(n): forventet ${issue2.origin} til \xE5 ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: m\xE5 starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: m\xE5 ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: m\xE5 inneholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: m\xE5 matche m\xF8nsteret ${_issue.pattern}`;
        return `Ugyldig ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig n\xF8kkel i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldig input";
      case "invalid_element":
        return `Ugyldig verdi i ${issue2.origin}`;
      default:
        return `Ugyldig input`;
    }
  };
};
function no_default() {
  return {
    localeError: error32()
  };
}

// node_modules/zod/v4/locales/ota.js
var error33 = () => {
  const Sizable = {
    string: { unit: "harf", verb: "olmal\u0131d\u0131r" },
    file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
    array: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
    set: { unit: "unsur", verb: "olmal\u0131d\u0131r" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "giren",
    email: "epostag\xE2h",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO heng\xE2m\u0131",
    date: "ISO tarihi",
    time: "ISO zaman\u0131",
    duration: "ISO m\xFCddeti",
    ipv4: "IPv4 ni\u015F\xE2n\u0131",
    ipv6: "IPv6 ni\u015F\xE2n\u0131",
    cidrv4: "IPv4 menzili",
    cidrv6: "IPv6 menzili",
    base64: "base64-\u015Fifreli metin",
    base64url: "base64url-\u015Fifreli metin",
    json_string: "JSON metin",
    e164: "E.164 say\u0131s\u0131",
    jwt: "JWT",
    template_literal: "giren"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "numara",
    array: "saf",
    null: "gayb"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `F\xE2sit giren: umulan instanceof ${issue2.expected}, al\u0131nan ${received}`;
        }
        return `F\xE2sit giren: umulan ${expected}, al\u0131nan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `F\xE2sit giren: umulan ${stringifyPrimitive(issue2.values[0])}`;
        return `F\xE2sit tercih: m\xFBteberler ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Fazla b\xFCy\xFCk: ${(_c = issue2.origin) != null ? _c : "value"}, ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elements"} sahip olmal\u0131yd\u0131.`;
        return `Fazla b\xFCy\xFCk: ${(_e = issue2.origin) != null ? _e : "value"}, ${adj}${issue2.maximum.toString()} olmal\u0131yd\u0131.`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Fazla k\xFC\xE7\xFCk: ${issue2.origin}, ${adj}${issue2.minimum.toString()} ${sizing.unit} sahip olmal\u0131yd\u0131.`;
        }
        return `Fazla k\xFC\xE7\xFCk: ${issue2.origin}, ${adj}${issue2.minimum.toString()} olmal\u0131yd\u0131.`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `F\xE2sit metin: "${_issue.prefix}" ile ba\u015Flamal\u0131.`;
        if (_issue.format === "ends_with")
          return `F\xE2sit metin: "${_issue.suffix}" ile bitmeli.`;
        if (_issue.format === "includes")
          return `F\xE2sit metin: "${_issue.includes}" ihtiv\xE2 etmeli.`;
        if (_issue.format === "regex")
          return `F\xE2sit metin: ${_issue.pattern} nak\u015F\u0131na uymal\u0131.`;
        return `F\xE2sit ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `F\xE2sit say\u0131: ${issue2.divisor} kat\u0131 olmal\u0131yd\u0131.`;
      case "unrecognized_keys":
        return `Tan\u0131nmayan anahtar ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} i\xE7in tan\u0131nmayan anahtar var.`;
      case "invalid_union":
        return "Giren tan\u0131namad\u0131.";
      case "invalid_element":
        return `${issue2.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
      default:
        return `K\u0131ymet tan\u0131namad\u0131.`;
    }
  };
};
function ota_default() {
  return {
    localeError: error33()
  };
}

// node_modules/zod/v4/locales/ps.js
var error34 = () => {
  const Sizable = {
    string: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
    file: { unit: "\u0628\u0627\u06CC\u067C\u0633", verb: "\u0648\u0644\u0631\u064A" },
    array: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
    set: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0648\u0631\u0648\u062F\u064A",
    email: "\u0628\u0631\u06CC\u069A\u0646\u0627\u0644\u06CC\u06A9",
    url: "\u06CC\u0648 \u0622\u0631 \u0627\u0644",
    emoji: "\u0627\u06CC\u0645\u0648\u062C\u064A",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "\u0646\u06CC\u067C\u0647 \u0627\u0648 \u0648\u062E\u062A",
    date: "\u0646\u06D0\u067C\u0647",
    time: "\u0648\u062E\u062A",
    duration: "\u0645\u0648\u062F\u0647",
    ipv4: "\u062F IPv4 \u067E\u062A\u0647",
    ipv6: "\u062F IPv6 \u067E\u062A\u0647",
    cidrv4: "\u062F IPv4 \u0633\u0627\u062D\u0647",
    cidrv6: "\u062F IPv6 \u0633\u0627\u062D\u0647",
    base64: "base64-encoded \u0645\u062A\u0646",
    base64url: "base64url-encoded \u0645\u062A\u0646",
    json_string: "JSON \u0645\u062A\u0646",
    e164: "\u062F E.164 \u0634\u0645\u06D0\u0631\u0647",
    jwt: "JWT",
    template_literal: "\u0648\u0631\u0648\u062F\u064A"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0639\u062F\u062F",
    array: "\u0627\u0631\u06D0"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F instanceof ${issue2.expected} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${received} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`;
        }
        return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${expected} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${received} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`;
      }
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${stringifyPrimitive(issue2.values[0])} \u0648\u0627\u06CC`;
        }
        return `\u0646\u0627\u0633\u0645 \u0627\u0646\u062A\u062E\u0627\u0628: \u0628\u0627\u06CC\u062F \u06CC\u0648 \u0644\u0647 ${joinValues(issue2.values, "|")} \u0685\u062E\u0647 \u0648\u0627\u06CC`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${(_c = issue2.origin) != null ? _c : "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0639\u0646\u0635\u0631\u0648\u0646\u0647"} \u0648\u0644\u0631\u064A`;
        }
        return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${(_e = issue2.origin) != null ? _e : "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} \u0648\u064A`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0648\u0644\u0631\u064A`;
        }
        return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} \u0648\u064A`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${_issue.prefix}" \u0633\u0631\u0647 \u067E\u06CC\u0644 \u0634\u064A`;
        }
        if (_issue.format === "ends_with") {
          return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${_issue.suffix}" \u0633\u0631\u0647 \u067E\u0627\u06CC \u062A\u0647 \u0648\u0631\u0633\u064A\u0696\u064A`;
        }
        if (_issue.format === "includes") {
          return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F "${_issue.includes}" \u0648\u0644\u0631\u064A`;
        }
        if (_issue.format === "regex") {
          return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F ${_issue.pattern} \u0633\u0631\u0647 \u0645\u0637\u0627\u0628\u0642\u062A \u0648\u0644\u0631\u064A`;
        }
        return `${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format} \u0646\u0627\u0633\u0645 \u062F\u06CC`;
      }
      case "not_multiple_of":
        return `\u0646\u0627\u0633\u0645 \u0639\u062F\u062F: \u0628\u0627\u06CC\u062F \u062F ${issue2.divisor} \u0645\u0636\u0631\u0628 \u0648\u064A`;
      case "unrecognized_keys":
        return `\u0646\u0627\u0633\u0645 ${issue2.keys.length > 1 ? "\u06A9\u0644\u06CC\u0689\u0648\u0646\u0647" : "\u06A9\u0644\u06CC\u0689"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u0646\u0627\u0633\u0645 \u06A9\u0644\u06CC\u0689 \u067E\u0647 ${issue2.origin} \u06A9\u06D0`;
      case "invalid_union":
        return `\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A`;
      case "invalid_element":
        return `\u0646\u0627\u0633\u0645 \u0639\u0646\u0635\u0631 \u067E\u0647 ${issue2.origin} \u06A9\u06D0`;
      default:
        return `\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A`;
    }
  };
};
function ps_default() {
  return {
    localeError: error34()
  };
}

// node_modules/zod/v4/locales/pl.js
var error35 = () => {
  const Sizable = {
    string: { unit: "znak\xF3w", verb: "mie\u0107" },
    file: { unit: "bajt\xF3w", verb: "mie\u0107" },
    array: { unit: "element\xF3w", verb: "mie\u0107" },
    set: { unit: "element\xF3w", verb: "mie\u0107" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "wyra\u017Cenie",
    email: "adres email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i godzina w formacie ISO",
    date: "data w formacie ISO",
    time: "godzina w formacie ISO",
    duration: "czas trwania ISO",
    ipv4: "adres IPv4",
    ipv6: "adres IPv6",
    cidrv4: "zakres IPv4",
    cidrv6: "zakres IPv6",
    base64: "ci\u0105g znak\xF3w zakodowany w formacie base64",
    base64url: "ci\u0105g znak\xF3w zakodowany w formacie base64url",
    json_string: "ci\u0105g znak\xF3w w formacie JSON",
    e164: "liczba E.164",
    jwt: "JWT",
    template_literal: "wej\u015Bcie"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "liczba",
    array: "tablica"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h, _i;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano instanceof ${issue2.expected}, otrzymano ${received}`;
        }
        return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${expected}, otrzymano ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${stringifyPrimitive(issue2.values[0])}`;
        return `Nieprawid\u0142owa opcja: oczekiwano jednej z warto\u015Bci ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za du\u017Ca warto\u015B\u0107: oczekiwano, \u017Ce ${(_c = issue2.origin) != null ? _c : "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "element\xF3w"}`;
        }
        return `Zbyt du\u017C(y/a/e): oczekiwano, \u017Ce ${(_e = issue2.origin) != null ? _e : "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za ma\u0142a warto\u015B\u0107: oczekiwano, \u017Ce ${(_f = issue2.origin) != null ? _f : "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${adj}${issue2.minimum.toString()} ${(_g = sizing.unit) != null ? _g : "element\xF3w"}`;
        }
        return `Zbyt ma\u0142(y/a/e): oczekiwano, \u017Ce ${(_h = issue2.origin) != null ? _h : "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zaczyna\u0107 si\u0119 od "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi ko\u0144czy\u0107 si\u0119 na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zawiera\u0107 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi odpowiada\u0107 wzorcowi ${_issue.pattern}`;
        return `Nieprawid\u0142ow(y/a/e) ${(_i = FormatDictionary[_issue.format]) != null ? _i : issue2.format}`;
      }
      case "not_multiple_of":
        return `Nieprawid\u0142owa liczba: musi by\u0107 wielokrotno\u015Bci\u0105 ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nierozpoznane klucze${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nieprawid\u0142owy klucz w ${issue2.origin}`;
      case "invalid_union":
        return "Nieprawid\u0142owe dane wej\u015Bciowe";
      case "invalid_element":
        return `Nieprawid\u0142owa warto\u015B\u0107 w ${issue2.origin}`;
      default:
        return `Nieprawid\u0142owe dane wej\u015Bciowe`;
    }
  };
};
function pl_default() {
  return {
    localeError: error35()
  };
}

// node_modules/zod/v4/locales/pt.js
var error36 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "ter" },
    file: { unit: "bytes", verb: "ter" },
    array: { unit: "itens", verb: "ter" },
    set: { unit: "itens", verb: "ter" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "padr\xE3o",
    email: "endere\xE7o de e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "dura\xE7\xE3o ISO",
    ipv4: "endere\xE7o IPv4",
    ipv6: "endere\xE7o IPv6",
    cidrv4: "faixa de IPv4",
    cidrv6: "faixa de IPv6",
    base64: "texto codificado em base64",
    base64url: "URL codificada em base64",
    json_string: "texto JSON",
    e164: "n\xFAmero E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "n\xFAmero",
    null: "nulo"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Tipo inv\xE1lido: esperado instanceof ${issue2.expected}, recebido ${received}`;
        }
        return `Tipo inv\xE1lido: esperado ${expected}, recebido ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inv\xE1lida: esperado ${stringifyPrimitive(issue2.values[0])}`;
        return `Op\xE7\xE3o inv\xE1lida: esperada uma das ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Muito grande: esperado que ${(_c = issue2.origin) != null ? _c : "valor"} tivesse ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elementos"}`;
        return `Muito grande: esperado que ${(_e = issue2.origin) != null ? _e : "valor"} fosse ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Muito pequeno: esperado que ${issue2.origin} tivesse ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Muito pequeno: esperado que ${issue2.origin} fosse ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Texto inv\xE1lido: deve come\xE7ar com "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Texto inv\xE1lido: deve terminar com "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Texto inv\xE1lido: deve incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${_issue.pattern}`;
        return `${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format} inv\xE1lido`;
      }
      case "not_multiple_of":
        return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chave${issue2.keys.length > 1 ? "s" : ""} desconhecida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chave inv\xE1lida em ${issue2.origin}`;
      case "invalid_union":
        return "Entrada inv\xE1lida";
      case "invalid_element":
        return `Valor inv\xE1lido em ${issue2.origin}`;
      default:
        return `Campo inv\xE1lido`;
    }
  };
};
function pt_default() {
  return {
    localeError: error36()
  };
}

// node_modules/zod/v4/locales/ro.js
var error37 = () => {
  const Sizable = {
    string: { unit: "caractere", verb: "s\u0103 aib\u0103" },
    file: { unit: "octe\u021Bi", verb: "s\u0103 aib\u0103" },
    array: { unit: "elemente", verb: "s\u0103 aib\u0103" },
    set: { unit: "elemente", verb: "s\u0103 aib\u0103" },
    map: { unit: "intr\u0103ri", verb: "s\u0103 aib\u0103" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "intrare",
    email: "adres\u0103 de email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "dat\u0103 \u0219i or\u0103 ISO",
    date: "dat\u0103 ISO",
    time: "or\u0103 ISO",
    duration: "durat\u0103 ISO",
    ipv4: "adres\u0103 IPv4",
    ipv6: "adres\u0103 IPv6",
    mac: "adres\u0103 MAC",
    cidrv4: "interval IPv4",
    cidrv6: "interval IPv6",
    base64: "\u0219ir codat base64",
    base64url: "\u0219ir codat base64url",
    json_string: "\u0219ir JSON",
    e164: "num\u0103r E.164",
    jwt: "JWT",
    template_literal: "intrare"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "\u0219ir",
    number: "num\u0103r",
    boolean: "boolean",
    function: "func\u021Bie",
    array: "matrice",
    object: "obiect",
    undefined: "nedefinit",
    symbol: "simbol",
    bigint: "num\u0103r mare",
    void: "void",
    never: "never",
    map: "hart\u0103",
    set: "set"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        return `Intrare invalid\u0103: a\u0219teptat ${expected}, primit ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Intrare invalid\u0103: a\u0219teptat ${stringifyPrimitive(issue2.values[0])}`;
        return `Op\u021Biune invalid\u0103: a\u0219teptat una dintre ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Prea mare: a\u0219teptat ca ${(_c = issue2.origin) != null ? _c : "valoarea"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elemente"}`;
        return `Prea mare: a\u0219teptat ca ${(_e = issue2.origin) != null ? _e : "valoarea"} s\u0103 fie ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Prea mic: a\u0219teptat ca ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Prea mic: a\u0219teptat ca ${issue2.origin} s\u0103 fie ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u0218ir invalid: trebuie s\u0103 \xEEnceap\u0103 cu "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `\u0218ir invalid: trebuie s\u0103 se termine cu "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u0218ir invalid: trebuie s\u0103 includ\u0103 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u0218ir invalid: trebuie s\u0103 se potriveasc\u0103 cu modelul ${_issue.pattern}`;
        return `Format invalid: ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Num\u0103r invalid: trebuie s\u0103 fie multiplu de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chei nerecunoscute: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Cheie invalid\u0103 \xEEn ${issue2.origin}`;
      case "invalid_union":
        return "Intrare invalid\u0103";
      case "invalid_element":
        return `Valoare invalid\u0103 \xEEn ${issue2.origin}`;
      default:
        return `Intrare invalid\u0103`;
    }
  };
};
function ro_default() {
  return {
    localeError: error37()
  };
}

// node_modules/zod/v4/locales/ru.js
function getRussianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
var error38 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "\u0441\u0438\u043C\u0432\u043E\u043B",
        few: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430",
        many: "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"
      },
      verb: "\u0438\u043C\u0435\u0442\u044C"
    },
    file: {
      unit: {
        one: "\u0431\u0430\u0439\u0442",
        few: "\u0431\u0430\u0439\u0442\u0430",
        many: "\u0431\u0430\u0439\u0442"
      },
      verb: "\u0438\u043C\u0435\u0442\u044C"
    },
    array: {
      unit: {
        one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
        few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
        many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
      },
      verb: "\u0438\u043C\u0435\u0442\u044C"
    },
    set: {
      unit: {
        one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
        few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
        many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
      },
      verb: "\u0438\u043C\u0435\u0442\u044C"
    }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0432\u0432\u043E\u0434",
    email: "email \u0430\u0434\u0440\u0435\u0441",
    url: "URL",
    emoji: "\u044D\u043C\u043E\u0434\u0437\u0438",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \u0434\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F",
    date: "ISO \u0434\u0430\u0442\u0430",
    time: "ISO \u0432\u0440\u0435\u043C\u044F",
    duration: "ISO \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
    ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
    ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
    cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
    cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
    base64: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64",
    base64url: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64url",
    json_string: "JSON \u0441\u0442\u0440\u043E\u043A\u0430",
    e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
    jwt: "JWT",
    template_literal: "\u0432\u0432\u043E\u0434"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0447\u0438\u0441\u043B\u043E",
    array: "\u043C\u0430\u0441\u0441\u0438\u0432"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C instanceof ${issue2.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${received}`;
        }
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${stringifyPrimitive(issue2.values[0])}`;
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043D\u043E \u0438\u0437 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${(_c = issue2.origin) != null ? _c : "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${(_d = issue2.origin) != null ? _d : "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin} \u0431\u0443\u0434\u0435\u0442 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 ${(_e = FormatDictionary[_issue.format]) != null ? _e : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E: \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D${issue2.keys.length > 1 ? "\u044B\u0435" : "\u044B\u0439"} \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u0438" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0432 ${issue2.origin}`;
      case "invalid_union":
        return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
      case "invalid_element":
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 ${issue2.origin}`;
      default:
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435`;
    }
  };
};
function ru_default() {
  return {
    localeError: error38()
  };
}

// node_modules/zod/v4/locales/sl.js
var error39 = () => {
  const Sizable = {
    string: { unit: "znakov", verb: "imeti" },
    file: { unit: "bajtov", verb: "imeti" },
    array: { unit: "elementov", verb: "imeti" },
    set: { unit: "elementov", verb: "imeti" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "vnos",
    email: "e-po\u0161tni naslov",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum in \u010Das",
    date: "ISO datum",
    time: "ISO \u010Das",
    duration: "ISO trajanje",
    ipv4: "IPv4 naslov",
    ipv6: "IPv6 naslov",
    cidrv4: "obseg IPv4",
    cidrv6: "obseg IPv6",
    base64: "base64 kodiran niz",
    base64url: "base64url kodiran niz",
    json_string: "JSON niz",
    e164: "E.164 \u0161tevilka",
    jwt: "JWT",
    template_literal: "vnos"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0161tevilo",
    array: "tabela"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neveljaven vnos: pri\u010Dakovano instanceof ${issue2.expected}, prejeto ${received}`;
        }
        return `Neveljaven vnos: pri\u010Dakovano ${expected}, prejeto ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neveljaven vnos: pri\u010Dakovano ${stringifyPrimitive(issue2.values[0])}`;
        return `Neveljavna mo\u017Enost: pri\u010Dakovano eno izmed ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Preveliko: pri\u010Dakovano, da bo ${(_c = issue2.origin) != null ? _c : "vrednost"} imelo ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "elementov"}`;
        return `Preveliko: pri\u010Dakovano, da bo ${(_e = issue2.origin) != null ? _e : "vrednost"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Premajhno: pri\u010Dakovano, da bo ${issue2.origin} imelo ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Premajhno: pri\u010Dakovano, da bo ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Neveljaven niz: mora se za\u010Deti z "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Neveljaven niz: mora se kon\u010Dati z "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
        return `Neveljaven ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Neveljavno \u0161tevilo: mora biti ve\u010Dkratnik ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznan${issue2.keys.length > 1 ? "i klju\u010Di" : " klju\u010D"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neveljaven klju\u010D v ${issue2.origin}`;
      case "invalid_union":
        return "Neveljaven vnos";
      case "invalid_element":
        return `Neveljavna vrednost v ${issue2.origin}`;
      default:
        return "Neveljaven vnos";
    }
  };
};
function sl_default() {
  return {
    localeError: error39()
  };
}

// node_modules/zod/v4/locales/sv.js
var error40 = () => {
  const Sizable = {
    string: { unit: "tecken", verb: "att ha" },
    file: { unit: "bytes", verb: "att ha" },
    array: { unit: "objekt", verb: "att inneh\xE5lla" },
    set: { unit: "objekt", verb: "att inneh\xE5lla" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "regulj\xE4rt uttryck",
    email: "e-postadress",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datum och tid",
    date: "ISO-datum",
    time: "ISO-tid",
    duration: "ISO-varaktighet",
    ipv4: "IPv4-intervall",
    ipv6: "IPv6-intervall",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodad str\xE4ng",
    base64url: "base64url-kodad str\xE4ng",
    json_string: "JSON-str\xE4ng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "mall-literal"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "antal",
    array: "lista"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ogiltig inmatning: f\xF6rv\xE4ntat instanceof ${issue2.expected}, fick ${received}`;
        }
        return `Ogiltig inmatning: f\xF6rv\xE4ntat ${expected}, fick ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ogiltig inmatning: f\xF6rv\xE4ntat ${stringifyPrimitive(issue2.values[0])}`;
        return `Ogiltigt val: f\xF6rv\xE4ntade en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `F\xF6r stor(t): f\xF6rv\xE4ntade ${(_c = issue2.origin) != null ? _c : "v\xE4rdet"} att ha ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "element"}`;
        }
        return `F\xF6r stor(t): f\xF6rv\xE4ntat ${(_e = issue2.origin) != null ? _e : "v\xE4rdet"} att ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `F\xF6r lite(t): f\xF6rv\xE4ntade ${(_f = issue2.origin) != null ? _f : "v\xE4rdet"} att ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `F\xF6r lite(t): f\xF6rv\xE4ntade ${(_g = issue2.origin) != null ? _g : "v\xE4rdet"} att ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ogiltig str\xE4ng: m\xE5ste b\xF6rja med "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ogiltig str\xE4ng: m\xE5ste sluta med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ogiltig str\xE4ng: m\xE5ste inneh\xE5lla "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ogiltig str\xE4ng: m\xE5ste matcha m\xF6nstret "${_issue.pattern}"`;
        return `Ogiltig(t) ${(_h = FormatDictionary[_issue.format]) != null ? _h : issue2.format}`;
      }
      case "not_multiple_of":
        return `Ogiltigt tal: m\xE5ste vara en multipel av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ok\xE4nda nycklar" : "Ok\xE4nd nyckel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ogiltig nyckel i ${(_i = issue2.origin) != null ? _i : "v\xE4rdet"}`;
      case "invalid_union":
        return "Ogiltig input";
      case "invalid_element":
        return `Ogiltigt v\xE4rde i ${(_j = issue2.origin) != null ? _j : "v\xE4rdet"}`;
      default:
        return `Ogiltig input`;
    }
  };
};
function sv_default() {
  return {
    localeError: error40()
  };
}

// node_modules/zod/v4/locales/ta.js
var error41 = () => {
  const Sizable = {
    string: { unit: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
    file: { unit: "\u0BAA\u0BC8\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
    array: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
    set: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1",
    email: "\u0BAE\u0BBF\u0BA9\u0BCD\u0BA9\u0B9E\u0BCD\u0B9A\u0BB2\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \u0BA4\u0BC7\u0BA4\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
    date: "ISO \u0BA4\u0BC7\u0BA4\u0BBF",
    time: "ISO \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
    duration: "ISO \u0B95\u0BBE\u0BB2 \u0B85\u0BB3\u0BB5\u0BC1",
    ipv4: "IPv4 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
    ipv6: "IPv6 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
    cidrv4: "IPv4 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
    cidrv6: "IPv6 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
    base64: "base64-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
    base64url: "base64url-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
    json_string: "JSON \u0B9A\u0BB0\u0BAE\u0BCD",
    e164: "E.164 \u0B8E\u0BA3\u0BCD",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0B8E\u0BA3\u0BCD",
    array: "\u0B85\u0BA3\u0BBF",
    null: "\u0BB5\u0BC6\u0BB1\u0BC1\u0BAE\u0BC8"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 instanceof ${issue2.expected}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${received}`;
        }
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${expected}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${stringifyPrimitive(issue2.values[0])}`;
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${joinValues(issue2.values, "|")} \u0B87\u0BB2\u0BCD \u0B92\u0BA9\u0BCD\u0BB1\u0BC1`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${(_c = issue2.origin) != null ? _c : "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD"} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${(_e = issue2.origin) != null ? _e : "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${adj}${issue2.maximum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin} ${adj}${issue2.minimum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.prefix}" \u0B87\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        if (_issue.format === "ends_with")
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.suffix}" \u0B87\u0BB2\u0BCD \u0BAE\u0BC1\u0B9F\u0BBF\u0BB5\u0B9F\u0BC8\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        if (_issue.format === "includes")
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.includes}" \u0B90 \u0B89\u0BB3\u0BCD\u0BB3\u0B9F\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        if (_issue.format === "regex")
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: ${_issue.pattern} \u0BAE\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B9F\u0BA9\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B8E\u0BA3\u0BCD: ${issue2.divisor} \u0B87\u0BA9\u0BCD \u0BAA\u0BB2\u0BAE\u0BBE\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
      case "unrecognized_keys":
        return `\u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD \u0BA4\u0BC6\u0BB0\u0BBF\u0BAF\u0BBE\u0BA4 \u0BB5\u0BBF\u0B9A\u0BC8${issue2.keys.length > 1 ? "\u0B95\u0BB3\u0BCD" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0B9A\u0BC8`;
      case "invalid_union":
        return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
      case "invalid_element":
        return `${issue2.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1`;
      default:
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1`;
    }
  };
};
function ta_default() {
  return {
    localeError: error41()
  };
}

// node_modules/zod/v4/locales/th.js
var error42 = () => {
  const Sizable = {
    string: { unit: "\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
    file: { unit: "\u0E44\u0E1A\u0E15\u0E4C", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
    array: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
    set: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19",
    email: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2D\u0E35\u0E40\u0E21\u0E25",
    url: "URL",
    emoji: "\u0E2D\u0E34\u0E42\u0E21\u0E08\u0E34",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
    date: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E1A ISO",
    time: "\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
    duration: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
    ipv4: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv4",
    ipv6: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv6",
    cidrv4: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv4",
    cidrv6: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv6",
    base64: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64",
    base64url: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A URL",
    json_string: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A JSON",
    e164: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28 (E.164)",
    jwt: "\u0E42\u0E17\u0E40\u0E04\u0E19 JWT",
    template_literal: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02",
    array: "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E23\u0E22\u0E4C (Array)",
    null: "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 (null)"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 instanceof ${issue2.expected} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${received}`;
        }
        return `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${expected} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u0E04\u0E48\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${stringifyPrimitive(issue2.values[0])}`;
        return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E43\u0E19 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19" : "\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${(_c = issue2.origin) != null ? _c : "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"}`;
        return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${(_e = issue2.origin) != null ? _e : "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22" : "\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E17\u0E49\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 "${_issue.includes}" \u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`;
        if (_issue.format === "regex")
          return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 ${_issue.pattern}`;
        return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E32\u0E23\u0E14\u0E49\u0E27\u0E22 ${issue2.divisor} \u0E44\u0E14\u0E49\u0E25\u0E07\u0E15\u0E31\u0E27`;
      case "unrecognized_keys":
        return `\u0E1E\u0E1A\u0E04\u0E35\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u0E04\u0E35\u0E22\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${issue2.origin}`;
      case "invalid_union":
        return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E22\u0E39\u0E40\u0E19\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E27\u0E49";
      case "invalid_element":
        return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${issue2.origin}`;
      default:
        return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`;
    }
  };
};
function th_default() {
  return {
    localeError: error42()
  };
}

// node_modules/zod/v4/locales/tr.js
var error43 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "olmal\u0131" },
    file: { unit: "bayt", verb: "olmal\u0131" },
    array: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
    set: { unit: "\xF6\u011Fe", verb: "olmal\u0131" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "girdi",
    email: "e-posta adresi",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO tarih ve saat",
    date: "ISO tarih",
    time: "ISO saat",
    duration: "ISO s\xFCre",
    ipv4: "IPv4 adresi",
    ipv6: "IPv6 adresi",
    cidrv4: "IPv4 aral\u0131\u011F\u0131",
    cidrv6: "IPv6 aral\u0131\u011F\u0131",
    base64: "base64 ile \u015Fifrelenmi\u015F metin",
    base64url: "base64url ile \u015Fifrelenmi\u015F metin",
    json_string: "JSON dizesi",
    e164: "E.164 say\u0131s\u0131",
    jwt: "JWT",
    template_literal: "\u015Eablon dizesi"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ge\xE7ersiz de\u011Fer: beklenen instanceof ${issue2.expected}, al\u0131nan ${received}`;
        }
        return `Ge\xE7ersiz de\u011Fer: beklenen ${expected}, al\u0131nan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ge\xE7ersiz de\u011Fer: beklenen ${stringifyPrimitive(issue2.values[0])}`;
        return `Ge\xE7ersiz se\xE7enek: a\u015Fa\u011F\u0131dakilerden biri olmal\u0131: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\xC7ok b\xFCy\xFCk: beklenen ${(_c = issue2.origin) != null ? _c : "de\u011Fer"} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\xF6\u011Fe"}`;
        return `\xC7ok b\xFCy\xFCk: beklenen ${(_e = issue2.origin) != null ? _e : "de\u011Fer"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\xC7ok k\xFC\xE7\xFCk: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `\xC7ok k\xFC\xE7\xFCk: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ge\xE7ersiz metin: "${_issue.prefix}" ile ba\u015Flamal\u0131`;
        if (_issue.format === "ends_with")
          return `Ge\xE7ersiz metin: "${_issue.suffix}" ile bitmeli`;
        if (_issue.format === "includes")
          return `Ge\xE7ersiz metin: "${_issue.includes}" i\xE7ermeli`;
        if (_issue.format === "regex")
          return `Ge\xE7ersiz metin: ${_issue.pattern} desenine uymal\u0131`;
        return `Ge\xE7ersiz ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `Ge\xE7ersiz say\u0131: ${issue2.divisor} ile tam b\xF6l\xFCnebilmeli`;
      case "unrecognized_keys":
        return `Tan\u0131nmayan anahtar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} i\xE7inde ge\xE7ersiz anahtar`;
      case "invalid_union":
        return "Ge\xE7ersiz de\u011Fer";
      case "invalid_element":
        return `${issue2.origin} i\xE7inde ge\xE7ersiz de\u011Fer`;
      default:
        return `Ge\xE7ersiz de\u011Fer`;
    }
  };
};
function tr_default() {
  return {
    localeError: error43()
  };
}

// node_modules/zod/v4/locales/uk.js
var error44 = () => {
  const Sizable = {
    string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
    file: { unit: "\u0431\u0430\u0439\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
    array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
    set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456",
    email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u0435\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u043E\u0457 \u043F\u043E\u0448\u0442\u0438",
    url: "URL",
    emoji: "\u0435\u043C\u043E\u0434\u0437\u0456",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "\u0434\u0430\u0442\u0430 \u0442\u0430 \u0447\u0430\u0441 ISO",
    date: "\u0434\u0430\u0442\u0430 ISO",
    time: "\u0447\u0430\u0441 ISO",
    duration: "\u0442\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C ISO",
    ipv4: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv4",
    ipv6: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv6",
    cidrv4: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv4",
    cidrv6: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv6",
    base64: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64",
    base64url: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64url",
    json_string: "\u0440\u044F\u0434\u043E\u043A JSON",
    e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
    jwt: "JWT",
    template_literal: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0447\u0438\u0441\u043B\u043E",
    array: "\u043C\u0430\u0441\u0438\u0432"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F instanceof ${issue2.expected}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${received}`;
        }
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${expected}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${stringifyPrimitive(issue2.values[0])}`;
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0430 \u043E\u043F\u0446\u0456\u044F: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u043E\u0434\u043D\u0435 \u0437 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${(_c = issue2.origin) != null ? _c : "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432"}`;
        return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${(_e = issue2.origin) != null ? _e : "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} \u0431\u0443\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin} \u0431\u0443\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043F\u043E\u0447\u0438\u043D\u0430\u0442\u0438\u0441\u044F \u0437 "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043D\u0430 "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043C\u0456\u0441\u0442\u0438\u0442\u0438 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0442\u0438 \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0447\u0438\u0441\u043B\u043E: \u043F\u043E\u0432\u0438\u043D\u043D\u043E \u0431\u0443\u0442\u0438 \u043A\u0440\u0430\u0442\u043D\u0438\u043C ${issue2.divisor}`;
      case "unrecognized_keys":
        return `\u041D\u0435\u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0438\u0439 \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u0456" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u043A\u043B\u044E\u0447 \u0443 ${issue2.origin}`;
      case "invalid_union":
        return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
      case "invalid_element":
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F \u0443 ${issue2.origin}`;
      default:
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456`;
    }
  };
};
function uk_default() {
  return {
    localeError: error44()
  };
}

// node_modules/zod/v4/locales/ua.js
function ua_default() {
  return uk_default();
}

// node_modules/zod/v4/locales/ur.js
var error45 = () => {
  const Sizable = {
    string: { unit: "\u062D\u0631\u0648\u0641", verb: "\u06C1\u0648\u0646\u0627" },
    file: { unit: "\u0628\u0627\u0626\u0679\u0633", verb: "\u06C1\u0648\u0646\u0627" },
    array: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" },
    set: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0627\u0646 \u067E\u0679",
    email: "\u0627\u06CC \u0645\u06CC\u0644 \u0627\u06CC\u0688\u0631\u06CC\u0633",
    url: "\u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644",
    emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
    uuid: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
    uuidv4: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 4",
    uuidv6: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 6",
    nanoid: "\u0646\u06CC\u0646\u0648 \u0622\u0626\u06CC \u0688\u06CC",
    guid: "\u062C\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
    cuid: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
    cuid2: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC 2",
    ulid: "\u06CC\u0648 \u0627\u06CC\u0644 \u0622\u0626\u06CC \u0688\u06CC",
    xid: "\u0627\u06CC\u06A9\u0633 \u0622\u0626\u06CC \u0688\u06CC",
    ksuid: "\u06A9\u06D2 \u0627\u06CC\u0633 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
    datetime: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0688\u06CC\u0679 \u0679\u0627\u0626\u0645",
    date: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u062A\u0627\u0631\u06CC\u062E",
    time: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0648\u0642\u062A",
    duration: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0645\u062F\u062A",
    ipv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0627\u06CC\u0688\u0631\u06CC\u0633",
    ipv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0627\u06CC\u0688\u0631\u06CC\u0633",
    cidrv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0631\u06CC\u0646\u062C",
    cidrv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0631\u06CC\u0646\u062C",
    base64: "\u0628\u06CC\u0633 64 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
    base64url: "\u0628\u06CC\u0633 64 \u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
    json_string: "\u062C\u06D2 \u0627\u06CC\u0633 \u0627\u0648 \u0627\u06CC\u0646 \u0633\u0679\u0631\u0646\u06AF",
    e164: "\u0627\u06CC 164 \u0646\u0645\u0628\u0631",
    jwt: "\u062C\u06D2 \u0688\u0628\u0644\u06CC\u0648 \u0679\u06CC",
    template_literal: "\u0627\u0646 \u067E\u0679"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u0646\u0645\u0628\u0631",
    array: "\u0622\u0631\u06D2",
    null: "\u0646\u0644"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: instanceof ${issue2.expected} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${received} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`;
        }
        return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${expected} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${received} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${stringifyPrimitive(issue2.values[0])} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        return `\u063A\u0644\u0637 \u0622\u067E\u0634\u0646: ${joinValues(issue2.values, "|")} \u0645\u06CC\u06BA \u0633\u06D2 \u0627\u06CC\u06A9 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${(_c = issue2.origin) != null ? _c : "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u06D2 ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u0639\u0646\u0627\u0635\u0631"} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
        return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${(_e = issue2.origin) != null ? _e : "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u0627 ${adj}${issue2.maximum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${issue2.origin} \u06A9\u06D2 ${adj}${issue2.minimum.toString()} ${sizing.unit} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
        }
        return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${issue2.origin} \u06A9\u0627 ${adj}${issue2.minimum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.prefix}" \u0633\u06D2 \u0634\u0631\u0648\u0639 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        }
        if (_issue.format === "ends_with")
          return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.suffix}" \u067E\u0631 \u062E\u062A\u0645 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        if (_issue.format === "includes")
          return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.includes}" \u0634\u0627\u0645\u0644 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        if (_issue.format === "regex")
          return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: \u067E\u06CC\u0679\u0631\u0646 ${_issue.pattern} \u0633\u06D2 \u0645\u06CC\u0686 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        return `\u063A\u0644\u0637 ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u063A\u0644\u0637 \u0646\u0645\u0628\u0631: ${issue2.divisor} \u06A9\u0627 \u0645\u0636\u0627\u0639\u0641 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
      case "unrecognized_keys":
        return `\u063A\u06CC\u0631 \u062A\u0633\u0644\u06CC\u0645 \u0634\u062F\u06C1 \u06A9\u06CC${issue2.keys.length > 1 ? "\u0632" : ""}: ${joinValues(issue2.keys, "\u060C ")}`;
      case "invalid_key":
        return `${issue2.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u06A9\u06CC`;
      case "invalid_union":
        return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
      case "invalid_element":
        return `${issue2.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u0648\u06CC\u0644\u06CC\u0648`;
      default:
        return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679`;
    }
  };
};
function ur_default() {
  return {
    localeError: error45()
  };
}

// node_modules/zod/v4/locales/uz.js
var error46 = () => {
  const Sizable = {
    string: { unit: "belgi", verb: "bo\u2018lishi kerak" },
    file: { unit: "bayt", verb: "bo\u2018lishi kerak" },
    array: { unit: "element", verb: "bo\u2018lishi kerak" },
    set: { unit: "element", verb: "bo\u2018lishi kerak" },
    map: { unit: "yozuv", verb: "bo\u2018lishi kerak" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "kirish",
    email: "elektron pochta manzili",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO sana va vaqti",
    date: "ISO sana",
    time: "ISO vaqt",
    duration: "ISO davomiylik",
    ipv4: "IPv4 manzil",
    ipv6: "IPv6 manzil",
    mac: "MAC manzil",
    cidrv4: "IPv4 diapazon",
    cidrv6: "IPv6 diapazon",
    base64: "base64 kodlangan satr",
    base64url: "base64url kodlangan satr",
    json_string: "JSON satr",
    e164: "E.164 raqam",
    jwt: "JWT",
    template_literal: "kirish"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "raqam",
    array: "massiv"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Noto\u2018g\u2018ri kirish: kutilgan instanceof ${issue2.expected}, qabul qilingan ${received}`;
        }
        return `Noto\u2018g\u2018ri kirish: kutilgan ${expected}, qabul qilingan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Noto\u2018g\u2018ri kirish: kutilgan ${stringifyPrimitive(issue2.values[0])}`;
        return `Noto\u2018g\u2018ri variant: quyidagilardan biri kutilgan ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Juda katta: kutilgan ${(_c = issue2.origin) != null ? _c : "qiymat"} ${adj}${issue2.maximum.toString()} ${sizing.unit} ${sizing.verb}`;
        return `Juda katta: kutilgan ${(_d = issue2.origin) != null ? _d : "qiymat"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Juda kichik: kutilgan ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
        }
        return `Juda kichik: kutilgan ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Noto\u2018g\u2018ri satr: "${_issue.prefix}" bilan boshlanishi kerak`;
        if (_issue.format === "ends_with")
          return `Noto\u2018g\u2018ri satr: "${_issue.suffix}" bilan tugashi kerak`;
        if (_issue.format === "includes")
          return `Noto\u2018g\u2018ri satr: "${_issue.includes}" ni o\u2018z ichiga olishi kerak`;
        if (_issue.format === "regex")
          return `Noto\u2018g\u2018ri satr: ${_issue.pattern} shabloniga mos kelishi kerak`;
        return `Noto\u2018g\u2018ri ${(_e = FormatDictionary[_issue.format]) != null ? _e : issue2.format}`;
      }
      case "not_multiple_of":
        return `Noto\u2018g\u2018ri raqam: ${issue2.divisor} ning karralisi bo\u2018lishi kerak`;
      case "unrecognized_keys":
        return `Noma\u2019lum kalit${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} dagi kalit noto\u2018g\u2018ri`;
      case "invalid_union":
        return "Noto\u2018g\u2018ri kirish";
      case "invalid_element":
        return `${issue2.origin} da noto\u2018g\u2018ri qiymat`;
      default:
        return `Noto\u2018g\u2018ri kirish`;
    }
  };
};
function uz_default() {
  return {
    localeError: error46()
  };
}

// node_modules/zod/v4/locales/vi.js
var error47 = () => {
  const Sizable = {
    string: { unit: "k\xFD t\u1EF1", verb: "c\xF3" },
    file: { unit: "byte", verb: "c\xF3" },
    array: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
    set: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u0111\u1EA7u v\xE0o",
    email: "\u0111\u1ECBa ch\u1EC9 email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ng\xE0y gi\u1EDD ISO",
    date: "ng\xE0y ISO",
    time: "gi\u1EDD ISO",
    duration: "kho\u1EA3ng th\u1EDDi gian ISO",
    ipv4: "\u0111\u1ECBa ch\u1EC9 IPv4",
    ipv6: "\u0111\u1ECBa ch\u1EC9 IPv6",
    cidrv4: "d\u1EA3i IPv4",
    cidrv6: "d\u1EA3i IPv6",
    base64: "chu\u1ED7i m\xE3 h\xF3a base64",
    base64url: "chu\u1ED7i m\xE3 h\xF3a base64url",
    json_string: "chu\u1ED7i JSON",
    e164: "s\u1ED1 E.164",
    jwt: "JWT",
    template_literal: "\u0111\u1EA7u v\xE0o"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "s\u1ED1",
    array: "m\u1EA3ng"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i instanceof ${issue2.expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${received}`;
        }
        return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${stringifyPrimitive(issue2.values[0])}`;
        return `T\xF9y ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i m\u1ED9t trong c\xE1c gi\xE1 tr\u1ECB ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${(_c = issue2.origin) != null ? _c : "gi\xE1 tr\u1ECB"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "ph\u1EA7n t\u1EED"}`;
        return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${(_e = issue2.origin) != null ? _e : "gi\xE1 tr\u1ECB"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i k\u1EBFt th\xFAc b\u1EB1ng "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i bao g\u1ED3m "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i kh\u1EDBp v\u1EDBi m\u1EABu ${_issue.pattern}`;
        return `${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format} kh\xF4ng h\u1EE3p l\u1EC7`;
      }
      case "not_multiple_of":
        return `S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i l\xE0 b\u1ED9i s\u1ED1 c\u1EE7a ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kh\xF3a kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kh\xF3a kh\xF4ng h\u1EE3p l\u1EC7 trong ${issue2.origin}`;
      case "invalid_union":
        return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
      case "invalid_element":
        return `Gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 trong ${issue2.origin}`;
      default:
        return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7`;
    }
  };
};
function vi_default() {
  return {
    localeError: error47()
  };
}

// node_modules/zod/v4/locales/zh-CN.js
var error48 = () => {
  const Sizable = {
    string: { unit: "\u5B57\u7B26", verb: "\u5305\u542B" },
    file: { unit: "\u5B57\u8282", verb: "\u5305\u542B" },
    array: { unit: "\u9879", verb: "\u5305\u542B" },
    set: { unit: "\u9879", verb: "\u5305\u542B" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u8F93\u5165",
    email: "\u7535\u5B50\u90AE\u4EF6",
    url: "URL",
    emoji: "\u8868\u60C5\u7B26\u53F7",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO\u65E5\u671F\u65F6\u95F4",
    date: "ISO\u65E5\u671F",
    time: "ISO\u65F6\u95F4",
    duration: "ISO\u65F6\u957F",
    ipv4: "IPv4\u5730\u5740",
    ipv6: "IPv6\u5730\u5740",
    cidrv4: "IPv4\u7F51\u6BB5",
    cidrv6: "IPv6\u7F51\u6BB5",
    base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32",
    base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32",
    json_string: "JSON\u5B57\u7B26\u4E32",
    e164: "E.164\u53F7\u7801",
    jwt: "JWT",
    template_literal: "\u8F93\u5165"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "\u6570\u5B57",
    array: "\u6570\u7EC4",
    null: "\u7A7A\u503C(null)"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B instanceof ${issue2.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${received}`;
        }
        return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${stringifyPrimitive(issue2.values[0])}`;
        return `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${(_c = issue2.origin) != null ? _c : "\u503C"} ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u4E2A\u5143\u7D20"}`;
        return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${(_e = issue2.origin) != null ? _e : "\u503C"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.prefix}" \u5F00\u5934`;
        if (_issue.format === "ends_with")
          return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.suffix}" \u7ED3\u5C3E`;
        if (_issue.format === "includes")
          return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${_issue.pattern}`;
        return `\u65E0\u6548${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${issue2.divisor} \u7684\u500D\u6570`;
      case "unrecognized_keys":
        return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
      case "invalid_union":
        return "\u65E0\u6548\u8F93\u5165";
      case "invalid_element":
        return `${issue2.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
      default:
        return `\u65E0\u6548\u8F93\u5165`;
    }
  };
};
function zh_CN_default() {
  return {
    localeError: error48()
  };
}

// node_modules/zod/v4/locales/zh-TW.js
var error49 = () => {
  const Sizable = {
    string: { unit: "\u5B57\u5143", verb: "\u64C1\u6709" },
    file: { unit: "\u4F4D\u5143\u7D44", verb: "\u64C1\u6709" },
    array: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
    set: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u8F38\u5165",
    email: "\u90F5\u4EF6\u5730\u5740",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO \u65E5\u671F\u6642\u9593",
    date: "ISO \u65E5\u671F",
    time: "ISO \u6642\u9593",
    duration: "ISO \u671F\u9593",
    ipv4: "IPv4 \u4F4D\u5740",
    ipv6: "IPv6 \u4F4D\u5740",
    cidrv4: "IPv4 \u7BC4\u570D",
    cidrv6: "IPv6 \u7BC4\u570D",
    base64: "base64 \u7DE8\u78BC\u5B57\u4E32",
    base64url: "base64url \u7DE8\u78BC\u5B57\u4E32",
    json_string: "JSON \u5B57\u4E32",
    e164: "E.164 \u6578\u503C",
    jwt: "JWT",
    template_literal: "\u8F38\u5165"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    var _a5, _b, _c, _d, _e, _f;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA instanceof ${issue2.expected}\uFF0C\u4F46\u6536\u5230 ${received}`;
        }
        return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${expected}\uFF0C\u4F46\u6536\u5230 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${stringifyPrimitive(issue2.values[0])}`;
        return `\u7121\u6548\u7684\u9078\u9805\uFF1A\u9810\u671F\u70BA\u4EE5\u4E0B\u5176\u4E2D\u4E4B\u4E00 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${(_c = issue2.origin) != null ? _c : "\u503C"} \u61C9\u70BA ${adj}${issue2.maximum.toString()} ${(_d = sizing.unit) != null ? _d : "\u500B\u5143\u7D20"}`;
        return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${(_e = issue2.origin) != null ? _e : "\u503C"} \u61C9\u70BA ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${issue2.origin} \u61C9\u70BA ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${issue2.origin} \u61C9\u70BA ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${_issue.prefix}" \u958B\u982D`;
        }
        if (_issue.format === "ends_with")
          return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${_issue.suffix}" \u7D50\u5C3E`;
        if (_issue.format === "includes")
          return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u5305\u542B "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u7B26\u5408\u683C\u5F0F ${_issue.pattern}`;
        return `\u7121\u6548\u7684 ${(_f = FormatDictionary[_issue.format]) != null ? _f : issue2.format}`;
      }
      case "not_multiple_of":
        return `\u7121\u6548\u7684\u6578\u5B57\uFF1A\u5FC5\u9808\u70BA ${issue2.divisor} \u7684\u500D\u6578`;
      case "unrecognized_keys":
        return `\u7121\u6CD5\u8B58\u5225\u7684\u9375\u503C${issue2.keys.length > 1 ? "\u5011" : ""}\uFF1A${joinValues(issue2.keys, "\u3001")}`;
      case "invalid_key":
        return `${issue2.origin} \u4E2D\u6709\u7121\u6548\u7684\u9375\u503C`;
      case "invalid_union":
        return "\u7121\u6548\u7684\u8F38\u5165\u503C";
      case "invalid_element":
        return `${issue2.origin} \u4E2D\u6709\u7121\u6548\u7684\u503C`;
      default:
        return `\u7121\u6548\u7684\u8F38\u5165\u503C`;
    }
  };
};
function zh_TW_default() {
  return {
    localeError: error49()
  };
}

// node_modules/zod/v4/locales/yo.js
var error50 = () => {
  const Sizable = {
    string: { unit: "\xE0mi", verb: "n\xED" },
    file: { unit: "bytes", verb: "n\xED" },
    array: { unit: "nkan", verb: "n\xED" },
    set: { unit: "nkan", verb: "n\xED" }
  };
  function getSizing(origin) {
    var _a5;
    return (_a5 = Sizable[origin]) != null ? _a5 : null;
  }
  const FormatDictionary = {
    regex: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9",
    email: "\xE0d\xEDr\u1EB9\u0301s\xEC \xECm\u1EB9\u0301l\xEC",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "\xE0k\xF3k\xF2 ISO",
    date: "\u1ECDj\u1ECD\u0301 ISO",
    time: "\xE0k\xF3k\xF2 ISO",
    duration: "\xE0k\xF3k\xF2 t\xF3 p\xE9 ISO",
    ipv4: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv4",
    ipv6: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv6",
    cidrv4: "\xE0gb\xE8gb\xE8 IPv4",
    cidrv6: "\xE0gb\xE8gb\xE8 IPv6",
    base64: "\u1ECD\u0300r\u1ECD\u0300 t\xED a k\u1ECD\u0301 n\xED base64",
    base64url: "\u1ECD\u0300r\u1ECD\u0300 base64url",
    json_string: "\u1ECD\u0300r\u1ECD\u0300 JSON",
    e164: "n\u1ECD\u0301mb\xE0 E.164",
    jwt: "JWT",
    template_literal: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "n\u1ECD\u0301mb\xE0",
    array: "akop\u1ECD"
  };
  return (issue2) => {
    var _a5, _b, _c, _d;
    switch (issue2.code) {
      case "invalid_type": {
        const expected = (_a5 = TypeDictionary[issue2.expected]) != null ? _a5 : issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = (_b = TypeDictionary[receivedType]) != null ? _b : receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi instanceof ${issue2.expected}, \xE0m\u1ECD\u0300 a r\xED ${received}`;
        }
        return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${expected}, \xE0m\u1ECD\u0300 a r\xED ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${stringifyPrimitive(issue2.values[0])}`;
        return `\xC0\u1E63\xE0y\xE0n a\u1E63\xEC\u1E63e: yan \u1ECD\u0300kan l\xE1ra ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${(_c = issue2.origin) != null ? _c : "iye"} ${sizing.verb} ${adj}${issue2.maximum} ${sizing.unit}`;
        return `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 ${adj}${issue2.maximum}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum} ${sizing.unit}`;
        return `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 ${adj}${issue2.minimum}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\u1EB9\u0300r\u1EB9\u0300 p\u1EB9\u0300l\xFA "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 par\xED p\u1EB9\u0300l\xFA "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 n\xED "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\xE1 \xE0p\u1EB9\u1EB9r\u1EB9 mu ${_issue.pattern}`;
        return `A\u1E63\xEC\u1E63e: ${(_d = FormatDictionary[_issue.format]) != null ? _d : issue2.format}`;
      }
      case "not_multiple_of":
        return `N\u1ECD\u0301mb\xE0 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 j\u1EB9\u0301 \xE8y\xE0 p\xEDp\xEDn ti ${issue2.divisor}`;
      case "unrecognized_keys":
        return `B\u1ECDt\xECn\xEC \xE0\xECm\u1ECD\u0300: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `B\u1ECDt\xECn\xEC a\u1E63\xEC\u1E63e n\xEDn\xFA ${issue2.origin}`;
      case "invalid_union":
        return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
      case "invalid_element":
        return `Iye a\u1E63\xEC\u1E63e n\xEDn\xFA ${issue2.origin}`;
      default:
        return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
    }
  };
};
function yo_default() {
  return {
    localeError: error50()
  };
}

// node_modules/zod/v4/core/registries.js
var _a3;
var $output = Symbol("ZodOutput");
var $input = Symbol("ZodInput");
var $ZodRegistry = class {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema, ..._meta) {
    const meta3 = _meta[0];
    this._map.set(schema, meta3);
    if (meta3 && typeof meta3 === "object" && "id" in meta3) {
      this._idmap.set(meta3.id, schema);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema) {
    const meta3 = this._map.get(schema);
    if (meta3 && typeof meta3 === "object" && "id" in meta3) {
      this._idmap.delete(meta3.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    var _a5;
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...(_a5 = this.get(p)) != null ? _a5 : {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : void 0;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
};
function registry() {
  return new $ZodRegistry();
}
var _a4;
(_a4 = (_a3 = globalThis).__zod_globalRegistry) != null ? _a4 : _a3.__zod_globalRegistry = registry();
var globalRegistry = globalThis.__zod_globalRegistry;

// node_modules/zod/v4/core/api.js
// @__NO_SIDE_EFFECTS__
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedString(Class2, params) {
  return new Class2({
    type: "string",
    coerce: true,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _mac(Class2, params) {
  return new Class2({
    type: "string",
    format: "mac",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
var TimePrecision = {
  Any: null,
  Minute: -1,
  Second: 0,
  Millisecond: 3,
  Microsecond: 6
};
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedNumber(Class2, params) {
  return new Class2({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _float32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float32",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _float64(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float64",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "int32",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uint32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "uint32",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedBoolean(Class2, params) {
  return new Class2({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _bigint(Class2, params) {
  return new Class2({
    type: "bigint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedBigint(Class2, params) {
  return new Class2({
    type: "bigint",
    coerce: true,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "int64",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uint64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "uint64",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _symbol(Class2, params) {
  return new Class2({
    type: "symbol",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _undefined2(Class2, params) {
  return new Class2({
    type: "undefined",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _any(Class2) {
  return new Class2({
    type: "any"
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _void(Class2, params) {
  return new Class2({
    type: "void",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _date(Class2, params) {
  return new Class2({
    type: "date",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedDate(Class2, params) {
  return new Class2({
    type: "date",
    coerce: true,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nan(Class2, params) {
  return new Class2({
    type: "nan",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _positive(params) {
  return /* @__PURE__ */ _gt(0, params);
}
// @__NO_SIDE_EFFECTS__
function _negative(params) {
  return /* @__PURE__ */ _lt(0, params);
}
// @__NO_SIDE_EFFECTS__
function _nonpositive(params) {
  return /* @__PURE__ */ _lte(0, params);
}
// @__NO_SIDE_EFFECTS__
function _nonnegative(params) {
  return /* @__PURE__ */ _gte(0, params);
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxSize(maximum, params) {
  return new $ZodCheckMaxSize({
    check: "max_size",
    ...normalizeParams(params),
    maximum
  });
}
// @__NO_SIDE_EFFECTS__
function _minSize(minimum, params) {
  return new $ZodCheckMinSize({
    check: "min_size",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _size(size, params) {
  return new $ZodCheckSizeEquals({
    check: "size_equals",
    ...normalizeParams(params),
    size
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _property(property, schema, params) {
  return new $ZodCheckProperty({
    check: "property",
    property,
    schema,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _mime(types, params) {
  return new $ZodCheckMimeType({
    check: "mime_type",
    mime: types,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _union(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
function _xor(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    inclusive: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _discriminatedUnion(Class2, discriminator, options, params) {
  return new Class2({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _intersection(Class2, left, right) {
  return new Class2({
    type: "intersection",
    left,
    right
  });
}
// @__NO_SIDE_EFFECTS__
function _tuple(Class2, items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new Class2({
    type: "tuple",
    items,
    rest,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _record(Class2, keyType, valueType, params) {
  return new Class2({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _map(Class2, keyType, valueType, params) {
  return new Class2({
    type: "map",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _set(Class2, valueType, params) {
  return new Class2({
    type: "set",
    valueType,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _enum(Class2, values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nativeEnum(Class2, entries, params) {
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _literal(Class2, value, params) {
  return new Class2({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _file(Class2, params) {
  return new Class2({
    type: "file",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _transform(Class2, fn) {
  return new Class2({
    type: "transform",
    transform: fn
  });
}
// @__NO_SIDE_EFFECTS__
function _optional(Class2, innerType) {
  return new Class2({
    type: "optional",
    innerType
  });
}
// @__NO_SIDE_EFFECTS__
function _nullable(Class2, innerType) {
  return new Class2({
    type: "nullable",
    innerType
  });
}
// @__NO_SIDE_EFFECTS__
function _default(Class2, innerType, defaultValue) {
  return new Class2({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
// @__NO_SIDE_EFFECTS__
function _nonoptional(Class2, innerType, params) {
  return new Class2({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _success(Class2, innerType) {
  return new Class2({
    type: "success",
    innerType
  });
}
// @__NO_SIDE_EFFECTS__
function _catch(Class2, innerType, catchValue) {
  return new Class2({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
// @__NO_SIDE_EFFECTS__
function _pipe(Class2, in_, out) {
  return new Class2({
    type: "pipe",
    in: in_,
    out
  });
}
// @__NO_SIDE_EFFECTS__
function _readonly(Class2, innerType) {
  return new Class2({
    type: "readonly",
    innerType
  });
}
// @__NO_SIDE_EFFECTS__
function _templateLiteral(Class2, parts, params) {
  return new Class2({
    type: "template_literal",
    parts,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lazy(Class2, getter) {
  return new Class2({
    type: "lazy",
    getter
  });
}
// @__NO_SIDE_EFFECTS__
function _promise(Class2, innerType) {
  return new Class2({
    type: "promise",
    innerType
  });
}
// @__NO_SIDE_EFFECTS__
function _custom(Class2, fn, _params) {
  var _a5;
  const norm = normalizeParams(_params);
  (_a5 = norm.abort) != null ? _a5 : norm.abort = true;
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue2) => {
      var _a5, _b, _c, _d;
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        (_a5 = _issue.code) != null ? _a5 : _issue.code = "custom";
        (_b = _issue.input) != null ? _b : _issue.input = payload.value;
        (_c = _issue.inst) != null ? _c : _issue.inst = ch;
        (_d = _issue.continue) != null ? _d : _issue.continue = !ch._zod.def.abort;
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
// @__NO_SIDE_EFFECTS__
function describe(description) {
  const ch = new $ZodCheck({ check: "describe" });
  ch._zod.onattach = [
    (inst) => {
      var _a5;
      const existing = (_a5 = globalRegistry.get(inst)) != null ? _a5 : {};
      globalRegistry.add(inst, { ...existing, description });
    }
  ];
  ch._zod.check = () => {
  };
  return ch;
}
// @__NO_SIDE_EFFECTS__
function meta(metadata) {
  const ch = new $ZodCheck({ check: "meta" });
  ch._zod.onattach = [
    (inst) => {
      var _a5;
      const existing = (_a5 = globalRegistry.get(inst)) != null ? _a5 : {};
      globalRegistry.add(inst, { ...existing, ...metadata });
    }
  ];
  ch._zod.check = () => {
  };
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _stringbool(Classes, _params) {
  var _a5, _b, _c, _d, _e;
  const params = normalizeParams(_params);
  let truthyArray = (_a5 = params.truthy) != null ? _a5 : ["true", "1", "yes", "on", "y", "enabled"];
  let falsyArray = (_b = params.falsy) != null ? _b : ["false", "0", "no", "off", "n", "disabled"];
  if (params.case !== "sensitive") {
    truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
    falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
  }
  const truthySet = new Set(truthyArray);
  const falsySet = new Set(falsyArray);
  const _Codec = (_c = Classes.Codec) != null ? _c : $ZodCodec;
  const _Boolean = (_d = Classes.Boolean) != null ? _d : $ZodBoolean;
  const _String = (_e = Classes.String) != null ? _e : $ZodString;
  const stringSchema = new _String({ type: "string", error: params.error });
  const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
  const codec2 = new _Codec({
    type: "pipe",
    in: stringSchema,
    out: booleanSchema,
    transform: ((input, payload) => {
      let data = input;
      if (params.case !== "sensitive")
        data = data.toLowerCase();
      if (truthySet.has(data)) {
        return true;
      } else if (falsySet.has(data)) {
        return false;
      } else {
        payload.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...truthySet, ...falsySet],
          input: payload.value,
          inst: codec2,
          continue: false
        });
        return {};
      }
    }),
    reverseTransform: ((input, _payload) => {
      if (input === true) {
        return truthyArray[0] || "true";
      } else {
        return falsyArray[0] || "false";
      }
    }),
    error: params.error
  });
  return codec2;
}
// @__NO_SIDE_EFFECTS__
function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
  const params = normalizeParams(_params);
  const def = {
    ...normalizeParams(_params),
    check: "string_format",
    type: "string",
    format,
    fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
    ...params
  };
  if (fnOrRegex instanceof RegExp) {
    def.pattern = fnOrRegex;
  }
  const inst = new Class2(def);
  return inst;
}

// node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
  var _a5, _b, _c, _d, _e, _f, _g, _h, _i;
  let target = (_a5 = params == null ? void 0 : params.target) != null ? _a5 : "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: (_b = params.processors) != null ? _b : {},
    metadataRegistry: (_c = params == null ? void 0 : params.metadata) != null ? _c : globalRegistry,
    target,
    unrepresentable: (_d = params == null ? void 0 : params.unrepresentable) != null ? _d : "throw",
    override: (_e = params == null ? void 0 : params.override) != null ? _e : (() => {
    }),
    io: (_f = params == null ? void 0 : params.io) != null ? _f : "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: (_g = params == null ? void 0 : params.cycles) != null ? _g : "ref",
    reused: (_h = params == null ? void 0 : params.reused) != null ? _h : "inline",
    external: (_i = params == null ? void 0 : params.external) != null ? _i : void 0
  };
}
function process(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a6, _b, _c;
  var _a5;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = (_b = (_a6 = schema._zod).toJSONSchema) == null ? void 0 : _b.call(_a6);
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta3 = ctx.metadataRegistry.get(schema);
  if (meta3)
    Object.assign(result.schema, meta3);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_c = (_a5 = result.schema).default) != null ? _c : _a5.default = result.schema._prefault;
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  var _a5, _b, _c, _d;
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = (_a5 = ctx.metadataRegistry.get(entry[0])) == null ? void 0 : _a5.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    var _a6, _b2, _c2, _d2, _e;
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = (_a6 = ctx.external.registry.get(entry[0])) == null ? void 0 : _a6.id;
      const uriGenerator = (_b2 = ctx.external.uri) != null ? _b2 : ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = (_d2 = (_c2 = entry[1].defId) != null ? _c2 : entry[1].schema.id) != null ? _d2 : `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = (_e = entry[1].schema.id) != null ? _e : `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${(_b = seen.cycle) == null ? void 0 : _b.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = (_c = ctx.external.registry.get(entry[0])) == null ? void 0 : _c.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = (_d = ctx.metadataRegistry.get(entry[0])) == null ? void 0 : _d.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  var _a5, _b, _c, _d, _e, _f;
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    var _a6, _b2, _c2;
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = (_a6 = seen.def) != null ? _a6 : seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = (_b2 = schema2.allOf) != null ? _b2 : [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen == null ? void 0 : parentSeen.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: (_c2 = seen.path) != null ? _c2 : []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {
  } else {
  }
  if ((_a5 = ctx.external) == null ? void 0 : _a5.uri) {
    const id = (_b = ctx.external.registry.get(schema)) == null ? void 0 : _b.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, (_c = root.def) != null ? _c : root.schema);
  const rootMetaId = (_d = ctx.metadataRegistry.get(schema)) == null ? void 0 : _d.id;
  if (rootMetaId !== void 0 && result.id === rootMetaId)
    delete result.id;
  const defs = (_f = (_e = ctx.external) == null ? void 0 : _e.defs) != null ? _f : {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      if (seen.def.id === seen.defId)
        delete seen.def.id;
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) {
  } else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx != null ? _ctx : { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
var createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params != null ? params : {};
  const ctx = initializeContext({ ...libraryOptions != null ? libraryOptions : {}, target, io, processors });
  process(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};

// node_modules/zod/v4/core/json-schema-processors.js
var formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
};
var stringProcessor = (schema, ctx, _json, _params) => {
  var _a5;
  const json2 = _json;
  json2.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minLength = minimum;
  if (typeof maximum === "number")
    json2.maxLength = maximum;
  if (format) {
    json2.format = (_a5 = formatMap[format]) != null ? _a5 : format;
    if (json2.format === "")
      delete json2.format;
    if (format === "time") {
      delete json2.format;
    }
  }
  if (contentEncoding)
    json2.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json2.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json2.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
var numberProcessor = (schema, ctx, _json, _params) => {
  const json2 = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json2.type = "integer";
  else
    json2.type = "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum != null ? minimum : Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum != null ? maximum : Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json2.minimum = exclusiveMinimum;
      json2.exclusiveMinimum = true;
    } else {
      json2.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json2.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json2.maximum = exclusiveMaximum;
      json2.exclusiveMaximum = true;
    } else {
      json2.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json2.maximum = maximum;
  }
  if (typeof multipleOf === "number")
    json2.multipleOf = multipleOf;
};
var booleanProcessor = (_schema, _ctx, json2, _params) => {
  json2.type = "boolean";
};
var bigintProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("BigInt cannot be represented in JSON Schema");
  }
};
var symbolProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Symbols cannot be represented in JSON Schema");
  }
};
var nullProcessor = (_schema, ctx, json2, _params) => {
  if (ctx.target === "openapi-3.0") {
    json2.type = "string";
    json2.nullable = true;
    json2.enum = [null];
  } else {
    json2.type = "null";
  }
};
var undefinedProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Undefined cannot be represented in JSON Schema");
  }
};
var voidProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Void cannot be represented in JSON Schema");
  }
};
var neverProcessor = (_schema, _ctx, json2, _params) => {
  json2.not = {};
};
var anyProcessor = (_schema, _ctx, _json, _params) => {
};
var unknownProcessor = (_schema, _ctx, _json, _params) => {
};
var dateProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Date cannot be represented in JSON Schema");
  }
};
var enumProcessor = (schema, _ctx, json2, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json2.type = "number";
  if (values.every((v) => typeof v === "string"))
    json2.type = "string";
  json2.enum = values;
};
var literalProcessor = (schema, ctx, json2, _params) => {
  const def = schema._zod.def;
  const vals = [];
  for (const val of def.values) {
    if (val === void 0) {
      if (ctx.unrepresentable === "throw") {
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
      } else {
      }
    } else if (typeof val === "bigint") {
      if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      } else {
        vals.push(Number(val));
      }
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) {
  } else if (vals.length === 1) {
    const val = vals[0];
    json2.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.enum = [val];
    } else {
      json2.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json2.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json2.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json2.type = "boolean";
    if (vals.every((v) => v === null))
      json2.type = "null";
    json2.enum = vals;
  }
};
var nanProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("NaN cannot be represented in JSON Schema");
  }
};
var templateLiteralProcessor = (schema, _ctx, json2, _params) => {
  const _json = json2;
  const pattern = schema._zod.pattern;
  if (!pattern)
    throw new Error("Pattern not found in template literal");
  _json.type = "string";
  _json.pattern = pattern.source;
};
var fileProcessor = (schema, _ctx, json2, _params) => {
  const _json = json2;
  const file2 = {
    type: "string",
    format: "binary",
    contentEncoding: "binary"
  };
  const { minimum, maximum, mime } = schema._zod.bag;
  if (minimum !== void 0)
    file2.minLength = minimum;
  if (maximum !== void 0)
    file2.maxLength = maximum;
  if (mime) {
    if (mime.length === 1) {
      file2.contentMediaType = mime[0];
      Object.assign(_json, file2);
    } else {
      Object.assign(_json, file2);
      _json.anyOf = mime.map((m) => ({ contentMediaType: m }));
    }
  } else {
    Object.assign(_json, file2);
  }
};
var successProcessor = (_schema, _ctx, json2, _params) => {
  json2.type = "boolean";
};
var customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
var functionProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Function types cannot be represented in JSON Schema");
  }
};
var transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
var mapProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Map cannot be represented in JSON Schema");
  }
};
var setProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Set cannot be represented in JSON Schema");
  }
};
var arrayProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minItems = minimum;
  if (typeof maximum === "number")
    json2.maxItems = maximum;
  json2.type = "array";
  json2.items = process(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
};
var objectProcessor = (schema, ctx, _json, params) => {
  var _a5;
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "object";
  json2.properties = {};
  const shape = def.shape;
  for (const key in shape) {
    json2.properties[key] = process(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === void 0;
    } else {
      return v.optout === void 0;
    }
  }));
  if (requiredKeys.size > 0) {
    json2.required = Array.from(requiredKeys);
  }
  if (((_a5 = def.catchall) == null ? void 0 : _a5._zod.def.type) === "never") {
    json2.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json2.additionalProperties = false;
  } else if (def.catchall) {
    json2.additionalProperties = process(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
var unionProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json2.oneOf = options;
  } else {
    json2.anyOf = options;
  }
};
var intersectionProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const a = process(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json2.allOf = allOf;
};
var tupleProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "array";
  const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
  const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
  const prefixItems = def.items.map((x, i) => process(x, ctx, {
    ...params,
    path: [...params.path, prefixPath, i]
  }));
  const rest = def.rest ? process(def.rest, ctx, {
    ...params,
    path: [...params.path, restPath, ...ctx.target === "openapi-3.0" ? [def.items.length] : []]
  }) : null;
  if (ctx.target === "draft-2020-12") {
    json2.prefixItems = prefixItems;
    if (rest) {
      json2.items = rest;
    }
  } else if (ctx.target === "openapi-3.0") {
    json2.items = {
      anyOf: prefixItems
    };
    if (rest) {
      json2.items.anyOf.push(rest);
    }
    json2.minItems = prefixItems.length;
    if (!rest) {
      json2.maxItems = prefixItems.length;
    }
  } else {
    json2.items = prefixItems;
    if (rest) {
      json2.additionalItems = rest;
    }
  }
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minItems = minimum;
  if (typeof maximum === "number")
    json2.maxItems = maximum;
};
var recordProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "object";
  const keyType = def.keyType;
  const keyBag = keyType._zod.bag;
  const patterns = keyBag == null ? void 0 : keyBag.patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = process(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json2.patternProperties = {};
    for (const pattern of patterns) {
      json2.patternProperties[pattern.source] = valueSchema;
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json2.propertyNames = process(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
    }
    json2.additionalProperties = process(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  if (keyValues) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json2.required = validKeyValues;
    }
  }
};
var nullableProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const inner = process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json2.nullable = true;
  } else {
    json2.anyOf = [inner, { type: "null" }];
  }
};
var nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var defaultProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json2.default = JSON.parse(JSON.stringify(def.defaultValue));
};
var prefaultProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json2._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
var catchProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(void 0);
  } catch (e) {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json2.default = catchValue;
};
var pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  process(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
var readonlyProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json2.readOnly = true;
};
var promiseProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var lazyProcessor = (schema, ctx, _json, params) => {
  const innerType = schema._zod.innerType;
  process(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
var allProcessors = {
  string: stringProcessor,
  number: numberProcessor,
  boolean: booleanProcessor,
  bigint: bigintProcessor,
  symbol: symbolProcessor,
  null: nullProcessor,
  undefined: undefinedProcessor,
  void: voidProcessor,
  never: neverProcessor,
  any: anyProcessor,
  unknown: unknownProcessor,
  date: dateProcessor,
  enum: enumProcessor,
  literal: literalProcessor,
  nan: nanProcessor,
  template_literal: templateLiteralProcessor,
  file: fileProcessor,
  success: successProcessor,
  custom: customProcessor,
  function: functionProcessor,
  transform: transformProcessor,
  map: mapProcessor,
  set: setProcessor,
  array: arrayProcessor,
  object: objectProcessor,
  union: unionProcessor,
  intersection: intersectionProcessor,
  tuple: tupleProcessor,
  record: recordProcessor,
  nullable: nullableProcessor,
  nonoptional: nonoptionalProcessor,
  default: defaultProcessor,
  prefault: prefaultProcessor,
  catch: catchProcessor,
  pipe: pipeProcessor,
  readonly: readonlyProcessor,
  promise: promiseProcessor,
  optional: optionalProcessor,
  lazy: lazyProcessor
};
function toJSONSchema(input, params) {
  if ("_idmap" in input) {
    const registry2 = input;
    const ctx2 = initializeContext({ ...params, processors: allProcessors });
    const defs = {};
    for (const entry of registry2._idmap.entries()) {
      const [_, schema] = entry;
      process(schema, ctx2);
    }
    const schemas = {};
    const external = {
      registry: registry2,
      uri: params == null ? void 0 : params.uri,
      defs
    };
    ctx2.external = external;
    for (const entry of registry2._idmap.entries()) {
      const [key, schema] = entry;
      extractDefs(ctx2, schema);
      schemas[key] = finalize(ctx2, schema);
    }
    if (Object.keys(defs).length > 0) {
      const defsSegment = ctx2.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs
      };
    }
    return { schemas };
  }
  const ctx = initializeContext({ ...params, processors: allProcessors });
  process(input, ctx);
  extractDefs(ctx, input);
  return finalize(ctx, input);
}

// node_modules/zod/v4/core/json-schema-generator.js
var JSONSchemaGenerator = class {
  /** @deprecated Access via ctx instead */
  get metadataRegistry() {
    return this.ctx.metadataRegistry;
  }
  /** @deprecated Access via ctx instead */
  get target() {
    return this.ctx.target;
  }
  /** @deprecated Access via ctx instead */
  get unrepresentable() {
    return this.ctx.unrepresentable;
  }
  /** @deprecated Access via ctx instead */
  get override() {
    return this.ctx.override;
  }
  /** @deprecated Access via ctx instead */
  get io() {
    return this.ctx.io;
  }
  /** @deprecated Access via ctx instead */
  get counter() {
    return this.ctx.counter;
  }
  set counter(value) {
    this.ctx.counter = value;
  }
  /** @deprecated Access via ctx instead */
  get seen() {
    return this.ctx.seen;
  }
  constructor(params) {
    var _a5;
    let normalizedTarget = (_a5 = params == null ? void 0 : params.target) != null ? _a5 : "draft-2020-12";
    if (normalizedTarget === "draft-4")
      normalizedTarget = "draft-04";
    if (normalizedTarget === "draft-7")
      normalizedTarget = "draft-07";
    this.ctx = initializeContext({
      processors: allProcessors,
      target: normalizedTarget,
      ...(params == null ? void 0 : params.metadata) && { metadata: params.metadata },
      ...(params == null ? void 0 : params.unrepresentable) && { unrepresentable: params.unrepresentable },
      ...(params == null ? void 0 : params.override) && { override: params.override },
      ...(params == null ? void 0 : params.io) && { io: params.io }
    });
  }
  /**
   * Process a schema to prepare it for JSON Schema generation.
   * This must be called before emit().
   */
  process(schema, _params = { path: [], schemaPath: [] }) {
    return process(schema, this.ctx, _params);
  }
  /**
   * Emit the final JSON Schema after processing.
   * Must call process() first.
   */
  emit(schema, _params) {
    if (_params) {
      if (_params.cycles)
        this.ctx.cycles = _params.cycles;
      if (_params.reused)
        this.ctx.reused = _params.reused;
      if (_params.external)
        this.ctx.external = _params.external;
    }
    extractDefs(this.ctx, schema);
    const result = finalize(this.ctx, schema);
    const { "~standard": _, ...plainResult } = result;
    return plainResult;
  }
};

// node_modules/zod/v4/core/json-schema.js
var json_schema_exports = {};

// node_modules/zod/v4/classic/schemas.js
var schemas_exports2 = {};
__export(schemas_exports2, {
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBase64: () => ZodBase64,
  ZodBase64URL: () => ZodBase64URL,
  ZodBigInt: () => ZodBigInt,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBoolean: () => ZodBoolean,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCUID: () => ZodCUID,
  ZodCUID2: () => ZodCUID2,
  ZodCatch: () => ZodCatch,
  ZodCodec: () => ZodCodec,
  ZodCustom: () => ZodCustom,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodE164: () => ZodE164,
  ZodEmail: () => ZodEmail,
  ZodEmoji: () => ZodEmoji,
  ZodEnum: () => ZodEnum,
  ZodExactOptional: () => ZodExactOptional,
  ZodFile: () => ZodFile,
  ZodFunction: () => ZodFunction,
  ZodGUID: () => ZodGUID,
  ZodIPv4: () => ZodIPv4,
  ZodIPv6: () => ZodIPv6,
  ZodIntersection: () => ZodIntersection,
  ZodJWT: () => ZodJWT,
  ZodKSUID: () => ZodKSUID,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMAC: () => ZodMAC,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNanoID: () => ZodNanoID,
  ZodNever: () => ZodNever,
  ZodNonOptional: () => ZodNonOptional,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodPipe: () => ZodPipe,
  ZodPrefault: () => ZodPrefault,
  ZodPreprocess: () => ZodPreprocess,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodStringFormat: () => ZodStringFormat,
  ZodSuccess: () => ZodSuccess,
  ZodSymbol: () => ZodSymbol,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodTransform: () => ZodTransform,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodULID: () => ZodULID,
  ZodURL: () => ZodURL,
  ZodUUID: () => ZodUUID,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  ZodXID: () => ZodXID,
  ZodXor: () => ZodXor,
  _ZodString: () => _ZodString,
  _default: () => _default2,
  _function: () => _function,
  any: () => any,
  array: () => array,
  base64: () => base642,
  base64url: () => base64url2,
  bigint: () => bigint2,
  boolean: () => boolean2,
  catch: () => _catch2,
  check: () => check,
  cidrv4: () => cidrv42,
  cidrv6: () => cidrv62,
  codec: () => codec,
  cuid: () => cuid3,
  cuid2: () => cuid22,
  custom: () => custom,
  date: () => date3,
  describe: () => describe2,
  discriminatedUnion: () => discriminatedUnion,
  e164: () => e1642,
  email: () => email2,
  emoji: () => emoji2,
  enum: () => _enum2,
  exactOptional: () => exactOptional,
  file: () => file,
  float32: () => float32,
  float64: () => float64,
  function: () => _function,
  guid: () => guid2,
  hash: () => hash,
  hex: () => hex2,
  hostname: () => hostname2,
  httpUrl: () => httpUrl,
  instanceof: () => _instanceof,
  int: () => int,
  int32: () => int32,
  int64: () => int64,
  intersection: () => intersection,
  invertCodec: () => invertCodec,
  ipv4: () => ipv42,
  ipv6: () => ipv62,
  json: () => json,
  jwt: () => jwt,
  keyof: () => keyof,
  ksuid: () => ksuid2,
  lazy: () => lazy,
  literal: () => literal,
  looseObject: () => looseObject,
  looseRecord: () => looseRecord,
  mac: () => mac2,
  map: () => map,
  meta: () => meta2,
  nan: () => nan,
  nanoid: () => nanoid2,
  nativeEnum: () => nativeEnum,
  never: () => never,
  nonoptional: () => nonoptional,
  null: () => _null3,
  nullable: () => nullable,
  nullish: () => nullish2,
  number: () => number2,
  object: () => object,
  optional: () => optional,
  partialRecord: () => partialRecord,
  pipe: () => pipe,
  prefault: () => prefault,
  preprocess: () => preprocess,
  promise: () => promise,
  readonly: () => readonly,
  record: () => record,
  refine: () => refine,
  set: () => set,
  strictObject: () => strictObject,
  string: () => string2,
  stringFormat: () => stringFormat,
  stringbool: () => stringbool,
  success: () => success,
  superRefine: () => superRefine,
  symbol: () => symbol,
  templateLiteral: () => templateLiteral,
  transform: () => transform,
  tuple: () => tuple,
  uint32: () => uint32,
  uint64: () => uint64,
  ulid: () => ulid2,
  undefined: () => _undefined3,
  union: () => union,
  unknown: () => unknown,
  url: () => url,
  uuid: () => uuid2,
  uuidv4: () => uuidv4,
  uuidv6: () => uuidv6,
  uuidv7: () => uuidv7,
  void: () => _void2,
  xid: () => xid2,
  xor: () => xor
});

// node_modules/zod/v4/classic/checks.js
var checks_exports2 = {};
__export(checks_exports2, {
  endsWith: () => _endsWith,
  gt: () => _gt,
  gte: () => _gte,
  includes: () => _includes,
  length: () => _length,
  lowercase: () => _lowercase,
  lt: () => _lt,
  lte: () => _lte,
  maxLength: () => _maxLength,
  maxSize: () => _maxSize,
  mime: () => _mime,
  minLength: () => _minLength,
  minSize: () => _minSize,
  multipleOf: () => _multipleOf,
  negative: () => _negative,
  nonnegative: () => _nonnegative,
  nonpositive: () => _nonpositive,
  normalize: () => _normalize,
  overwrite: () => _overwrite,
  positive: () => _positive,
  property: () => _property,
  regex: () => _regex,
  size: () => _size,
  slugify: () => _slugify,
  startsWith: () => _startsWith,
  toLowerCase: () => _toLowerCase,
  toUpperCase: () => _toUpperCase,
  trim: () => _trim,
  uppercase: () => _uppercase
});

// node_modules/zod/v4/classic/iso.js
var iso_exports = {};
__export(iso_exports, {
  ZodISODate: () => ZodISODate,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODuration: () => ZodISODuration,
  ZodISOTime: () => ZodISOTime,
  date: () => date2,
  datetime: () => datetime2,
  duration: () => duration2,
  time: () => time2
});
var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date2(params) {
  return _isoDate(ZodISODate, params);
}
var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}

// node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
      // enumerable: false,
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
      // enumerable: false,
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
      // enumerable: false,
    }
  });
};
var ZodError = /* @__PURE__ */ $constructor("ZodError", initializer2);
var ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer2, {
  Parent: Error
});

// node_modules/zod/v4/classic/parse.js
var parse2 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode2 = /* @__PURE__ */ _encode(ZodRealError);
var decode2 = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync2 = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync2 = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode2 = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode2 = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync2 = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync2 = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

// node_modules/zod/v4/classic/schemas.js
var _installedGroups = /* @__PURE__ */ new WeakMap();
function _installLazyMethods(inst, group, methods) {
  const proto = Object.getPrototypeOf(inst);
  let installed = _installedGroups.get(proto);
  if (!installed) {
    installed = /* @__PURE__ */ new Set();
    _installedGroups.set(proto, installed);
  }
  if (installed.has(group))
    return;
  installed.add(group);
  for (const key in methods) {
    const fn = methods[key];
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        const bound = fn.bind(this);
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: bound
        });
        return bound;
      },
      set(v) {
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: v
        });
      }
    });
  }
}
var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.parse = (data, params) => parse2(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse2(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode2(inst, data, params);
  inst.decode = (data, params) => decode2(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync2(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync2(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode2(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode2(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync2(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync2(inst, data, params);
  _installLazyMethods(inst, "ZodType", {
    check(...chks) {
      var _a5;
      const def2 = this.def;
      return this.clone(util_exports.mergeDefs(def2, {
        checks: [
          ...(_a5 = def2.checks) != null ? _a5 : [],
          ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), { parent: true });
    },
    with(...chks) {
      return this.check(...chks);
    },
    clone(def2, params) {
      return clone(this, def2, params);
    },
    brand() {
      return this;
    },
    register(reg, meta3) {
      reg.add(this, meta3);
      return this;
    },
    refine(check2, params) {
      return this.check(refine(check2, params));
    },
    superRefine(refinement, params) {
      return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
      return this.check(_overwrite(fn));
    },
    optional() {
      return optional(this);
    },
    exactOptional() {
      return exactOptional(this);
    },
    nullable() {
      return nullable(this);
    },
    nullish() {
      return optional(nullable(this));
    },
    nonoptional(params) {
      return nonoptional(this, params);
    },
    array() {
      return array(this);
    },
    or(arg) {
      return union([this, arg]);
    },
    and(arg) {
      return intersection(this, arg);
    },
    transform(tx) {
      return pipe(this, transform(tx));
    },
    default(d) {
      return _default2(this, d);
    },
    prefault(d) {
      return prefault(this, d);
    },
    catch(params) {
      return _catch2(this, params);
    },
    pipe(target) {
      return pipe(this, target);
    },
    readonly() {
      return readonly(this);
    },
    describe(description) {
      const cl = this.clone();
      globalRegistry.add(cl, { description });
      return cl;
    },
    meta(...args) {
      if (args.length === 0)
        return globalRegistry.get(this);
      const cl = this.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    },
    isOptional() {
      return this.safeParse(void 0).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(fn) {
      return fn(this);
    }
  });
  Object.defineProperty(inst, "description", {
    get() {
      var _a5;
      return (_a5 = globalRegistry.get(inst)) == null ? void 0 : _a5.description;
    },
    configurable: true
  });
  return inst;
});
var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  var _a5, _b, _c;
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => stringProcessor(inst, ctx, json2, params);
  const bag = inst._zod.bag;
  inst.format = (_a5 = bag.format) != null ? _a5 : null;
  inst.minLength = (_b = bag.minimum) != null ? _b : null;
  inst.maxLength = (_c = bag.maximum) != null ? _c : null;
  _installLazyMethods(inst, "_ZodString", {
    regex(...args) {
      return this.check(_regex(...args));
    },
    includes(...args) {
      return this.check(_includes(...args));
    },
    startsWith(...args) {
      return this.check(_startsWith(...args));
    },
    endsWith(...args) {
      return this.check(_endsWith(...args));
    },
    min(...args) {
      return this.check(_minLength(...args));
    },
    max(...args) {
      return this.check(_maxLength(...args));
    },
    length(...args) {
      return this.check(_length(...args));
    },
    nonempty(...args) {
      return this.check(_minLength(1, ...args));
    },
    lowercase(params) {
      return this.check(_lowercase(params));
    },
    uppercase(params) {
      return this.check(_uppercase(params));
    },
    trim() {
      return this.check(_trim());
    },
    normalize(...args) {
      return this.check(_normalize(...args));
    },
    toLowerCase() {
      return this.check(_toLowerCase());
    },
    toUpperCase() {
      return this.check(_toUpperCase());
    },
    slugify() {
      return this.check(_slugify());
    }
  });
});
var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(_email(ZodEmail, params));
  inst.url = (params) => inst.check(_url(ZodURL, params));
  inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(_xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(_e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime2(params));
  inst.date = (params) => inst.check(date2(params));
  inst.time = (params) => inst.check(time2(params));
  inst.duration = (params) => inst.check(duration2(params));
});
function string2(params) {
  return _string(ZodString, params);
}
var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function email2(params) {
  return _email(ZodEmail, params);
}
var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function guid2(params) {
  return _guid(ZodGUID, params);
}
var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function uuid2(params) {
  return _uuid(ZodUUID, params);
}
function uuidv4(params) {
  return _uuidv4(ZodUUID, params);
}
function uuidv6(params) {
  return _uuidv6(ZodUUID, params);
}
function uuidv7(params) {
  return _uuidv7(ZodUUID, params);
}
var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function url(params) {
  return _url(ZodURL, params);
}
function httpUrl(params) {
  return _url(ZodURL, {
    protocol: regexes_exports.httpProtocol,
    hostname: regexes_exports.domain,
    ...util_exports.normalizeParams(params)
  });
}
var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function emoji2(params) {
  return _emoji2(ZodEmoji, params);
}
var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function nanoid2(params) {
  return _nanoid(ZodNanoID, params);
}
var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cuid3(params) {
  return _cuid(ZodCUID, params);
}
var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cuid22(params) {
  return _cuid2(ZodCUID2, params);
}
var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ulid2(params) {
  return _ulid(ZodULID, params);
}
var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function xid2(params) {
  return _xid(ZodXID, params);
}
var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ksuid2(params) {
  return _ksuid(ZodKSUID, params);
}
var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ipv42(params) {
  return _ipv4(ZodIPv4, params);
}
var ZodMAC = /* @__PURE__ */ $constructor("ZodMAC", (inst, def) => {
  $ZodMAC.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function mac2(params) {
  return _mac(ZodMAC, params);
}
var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ipv62(params) {
  return _ipv6(ZodIPv6, params);
}
var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cidrv42(params) {
  return _cidrv4(ZodCIDRv4, params);
}
var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cidrv62(params) {
  return _cidrv6(ZodCIDRv6, params);
}
var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function base642(params) {
  return _base64(ZodBase64, params);
}
var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function base64url2(params) {
  return _base64url(ZodBase64URL, params);
}
var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function e1642(params) {
  return _e164(ZodE164, params);
}
var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function jwt(params) {
  return _jwt(ZodJWT, params);
}
var ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
  $ZodCustomStringFormat.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function stringFormat(format, fnOrRegex, _params = {}) {
  return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hostname", regexes_exports.hostname, _params);
}
function hex2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hex", regexes_exports.hex, _params);
}
function hash(alg, params) {
  var _a5;
  const enc = (_a5 = params == null ? void 0 : params.enc) != null ? _a5 : "hex";
  const format = `${alg}_${enc}`;
  const regex = regexes_exports[format];
  if (!regex)
    throw new Error(`Unrecognized hash format: ${format}`);
  return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  var _a5, _b, _c, _d, _e, _f, _g, _h, _i;
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => numberProcessor(inst, ctx, json2, params);
  _installLazyMethods(inst, "ZodNumber", {
    gt(value, params) {
      return this.check(_gt(value, params));
    },
    gte(value, params) {
      return this.check(_gte(value, params));
    },
    min(value, params) {
      return this.check(_gte(value, params));
    },
    lt(value, params) {
      return this.check(_lt(value, params));
    },
    lte(value, params) {
      return this.check(_lte(value, params));
    },
    max(value, params) {
      return this.check(_lte(value, params));
    },
    int(params) {
      return this.check(int(params));
    },
    safe(params) {
      return this.check(int(params));
    },
    positive(params) {
      return this.check(_gt(0, params));
    },
    nonnegative(params) {
      return this.check(_gte(0, params));
    },
    negative(params) {
      return this.check(_lt(0, params));
    },
    nonpositive(params) {
      return this.check(_lte(0, params));
    },
    multipleOf(value, params) {
      return this.check(_multipleOf(value, params));
    },
    step(value, params) {
      return this.check(_multipleOf(value, params));
    },
    finite() {
      return this;
    }
  });
  const bag = inst._zod.bag;
  inst.minValue = (_c = Math.max((_a5 = bag.minimum) != null ? _a5 : Number.NEGATIVE_INFINITY, (_b = bag.exclusiveMinimum) != null ? _b : Number.NEGATIVE_INFINITY)) != null ? _c : null;
  inst.maxValue = (_f = Math.min((_d = bag.maximum) != null ? _d : Number.POSITIVE_INFINITY, (_e = bag.exclusiveMaximum) != null ? _e : Number.POSITIVE_INFINITY)) != null ? _f : null;
  inst.isInt = ((_g = bag.format) != null ? _g : "").includes("int") || Number.isSafeInteger((_h = bag.multipleOf) != null ? _h : 0.5);
  inst.isFinite = true;
  inst.format = (_i = bag.format) != null ? _i : null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
function float32(params) {
  return _float32(ZodNumberFormat, params);
}
function float64(params) {
  return _float64(ZodNumberFormat, params);
}
function int32(params) {
  return _int32(ZodNumberFormat, params);
}
function uint32(params) {
  return _uint32(ZodNumberFormat, params);
}
var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => booleanProcessor(inst, ctx, json2, params);
});
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
var ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
  var _a5, _b, _c;
  $ZodBigInt.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => bigintProcessor(inst, ctx, json2, params);
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.positive = (params) => inst.check(_gt(BigInt(0), params));
  inst.negative = (params) => inst.check(_lt(BigInt(0), params));
  inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
  inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  const bag = inst._zod.bag;
  inst.minValue = (_a5 = bag.minimum) != null ? _a5 : null;
  inst.maxValue = (_b = bag.maximum) != null ? _b : null;
  inst.format = (_c = bag.format) != null ? _c : null;
});
function bigint2(params) {
  return _bigint(ZodBigInt, params);
}
var ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
  $ZodBigIntFormat.init(inst, def);
  ZodBigInt.init(inst, def);
});
function int64(params) {
  return _int64(ZodBigIntFormat, params);
}
function uint64(params) {
  return _uint64(ZodBigIntFormat, params);
}
var ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
  $ZodSymbol.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => symbolProcessor(inst, ctx, json2, params);
});
function symbol(params) {
  return _symbol(ZodSymbol, params);
}
var ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
  $ZodUndefined.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => undefinedProcessor(inst, ctx, json2, params);
});
function _undefined3(params) {
  return _undefined2(ZodUndefined, params);
}
var ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nullProcessor(inst, ctx, json2, params);
});
function _null3(params) {
  return _null2(ZodNull, params);
}
var ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
  $ZodAny.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => anyProcessor(inst, ctx, json2, params);
});
function any() {
  return _any(ZodAny);
}
var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unknownProcessor(inst, ctx, json2, params);
});
function unknown() {
  return _unknown(ZodUnknown);
}
var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => neverProcessor(inst, ctx, json2, params);
});
function never(params) {
  return _never(ZodNever, params);
}
var ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
  $ZodVoid.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => voidProcessor(inst, ctx, json2, params);
});
function _void2(params) {
  return _void(ZodVoid, params);
}
var ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
  $ZodDate.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => dateProcessor(inst, ctx, json2, params);
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  const c = inst._zod.bag;
  inst.minDate = c.minimum ? new Date(c.minimum) : null;
  inst.maxDate = c.maximum ? new Date(c.maximum) : null;
});
function date3(params) {
  return _date(ZodDate, params);
}
var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => arrayProcessor(inst, ctx, json2, params);
  inst.element = def.element;
  _installLazyMethods(inst, "ZodArray", {
    min(n, params) {
      return this.check(_minLength(n, params));
    },
    nonempty(params) {
      return this.check(_minLength(1, params));
    },
    max(n, params) {
      return this.check(_maxLength(n, params));
    },
    length(n, params) {
      return this.check(_length(n, params));
    },
    unwrap() {
      return this.element;
    }
  });
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
function keyof(schema) {
  const shape = schema._zod.def.shape;
  return _enum2(Object.keys(shape));
}
var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => objectProcessor(inst, ctx, json2, params);
  util_exports.defineLazy(inst, "shape", () => {
    return def.shape;
  });
  _installLazyMethods(inst, "ZodObject", {
    keyof() {
      return _enum2(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
      return this.clone({ ...this._zod.def, catchall });
    },
    passthrough() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    loose() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    strict() {
      return this.clone({ ...this._zod.def, catchall: never() });
    },
    strip() {
      return this.clone({ ...this._zod.def, catchall: void 0 });
    },
    extend(incoming) {
      return util_exports.extend(this, incoming);
    },
    safeExtend(incoming) {
      return util_exports.safeExtend(this, incoming);
    },
    merge(other) {
      return util_exports.merge(this, other);
    },
    pick(mask) {
      return util_exports.pick(this, mask);
    },
    omit(mask) {
      return util_exports.omit(this, mask);
    },
    partial(...args) {
      return util_exports.partial(ZodOptional, this, args[0]);
    },
    required(...args) {
      return util_exports.required(ZodNonOptional, this, args[0]);
    }
  });
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape != null ? shape : {},
    ...util_exports.normalizeParams(params)
  };
  return new ZodObject(def);
}
function strictObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: never(),
    ...util_exports.normalizeParams(params)
  });
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: unknown(),
    ...util_exports.normalizeParams(params)
  });
}
var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unionProcessor(inst, ctx, json2, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...util_exports.normalizeParams(params)
  });
}
var ZodXor = /* @__PURE__ */ $constructor("ZodXor", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodXor.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unionProcessor(inst, ctx, json2, params);
  inst.options = def.options;
});
function xor(options, params) {
  return new ZodXor({
    type: "union",
    options,
    inclusive: false,
    ...util_exports.normalizeParams(params)
  });
}
var ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...util_exports.normalizeParams(params)
  });
}
var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => intersectionProcessor(inst, ctx, json2, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
var ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
  $ZodTuple.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => tupleProcessor(inst, ctx, json2, params);
  inst.rest = (rest) => inst.clone({
    ...inst._zod.def,
    rest
  });
});
function tuple(items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new ZodTuple({
    type: "tuple",
    items,
    rest,
    ...util_exports.normalizeParams(params)
  });
}
var ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => recordProcessor(inst, ctx, json2, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodRecord({
      type: "record",
      keyType: string2(),
      valueType: keyType,
      ...util_exports.normalizeParams(valueType)
    });
  }
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function partialRecord(keyType, valueType, params) {
  const k = clone(keyType);
  k._zod.values = void 0;
  return new ZodRecord({
    type: "record",
    keyType: k,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function looseRecord(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    mode: "loose",
    ...util_exports.normalizeParams(params)
  });
}
var ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
  $ZodMap.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => mapProcessor(inst, ctx, json2, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
  inst.min = (...args) => inst.check(_minSize(...args));
  inst.nonempty = (params) => inst.check(_minSize(1, params));
  inst.max = (...args) => inst.check(_maxSize(...args));
  inst.size = (...args) => inst.check(_size(...args));
});
function map(keyType, valueType, params) {
  return new ZodMap({
    type: "map",
    keyType,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
  $ZodSet.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => setProcessor(inst, ctx, json2, params);
  inst.min = (...args) => inst.check(_minSize(...args));
  inst.nonempty = (params) => inst.check(_minSize(1, params));
  inst.max = (...args) => inst.check(_maxSize(...args));
  inst.size = (...args) => inst.check(_size(...args));
});
function set(valueType, params) {
  return new ZodSet({
    type: "set",
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => enumProcessor(inst, ctx, json2, params);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...util_exports.normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...util_exports.normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum2(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
function nativeEnum(entries, params) {
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
var ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => literalProcessor(inst, ctx, json2, params);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...util_exports.normalizeParams(params)
  });
}
var ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
  $ZodFile.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => fileProcessor(inst, ctx, json2, params);
  inst.min = (size, params) => inst.check(_minSize(size, params));
  inst.max = (size, params) => inst.check(_maxSize(size, params));
  inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
});
function file(params) {
  return _file(ZodFile, params);
}
var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => transformProcessor(inst, ctx, json2, params);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue2) => {
      var _a5, _b, _c;
      if (typeof issue2 === "string") {
        payload.issues.push(util_exports.issue(issue2, payload.value, def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        (_a5 = _issue.code) != null ? _a5 : _issue.code = "custom";
        (_b = _issue.input) != null ? _b : _issue.input = payload.value;
        (_c = _issue.inst) != null ? _c : _issue.inst = inst;
        payload.issues.push(util_exports.issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        payload.fallback = true;
        return payload;
      });
    }
    payload.value = output;
    payload.fallback = true;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
var ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nullableProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function nullish2(innerType) {
  return optional(nullable(innerType));
}
var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => defaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default2(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => prefaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nonoptionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
  $ZodSuccess.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => successProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function success(innerType) {
  return new ZodSuccess({
    type: "success",
    innerType
  });
}
var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => catchProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch2(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
var ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
  $ZodNaN.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nanProcessor(inst, ctx, json2, params);
});
function nan(params) {
  return _nan(ZodNaN, params);
}
var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => pipeProcessor(inst, ctx, json2, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
var ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
  ZodPipe.init(inst, def);
  $ZodCodec.init(inst, def);
});
function codec(in_, out, params) {
  return new ZodCodec({
    type: "pipe",
    in: in_,
    out,
    transform: params.decode,
    reverseTransform: params.encode
  });
}
function invertCodec(codec2) {
  const def = codec2._zod.def;
  return new ZodCodec({
    type: "pipe",
    in: def.out,
    out: def.in,
    transform: def.reverseTransform,
    reverseTransform: def.transform
  });
}
var ZodPreprocess = /* @__PURE__ */ $constructor("ZodPreprocess", (inst, def) => {
  ZodPipe.init(inst, def);
  $ZodPreprocess.init(inst, def);
});
var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => readonlyProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
var ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
  $ZodTemplateLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => templateLiteralProcessor(inst, ctx, json2, params);
});
function templateLiteral(parts, params) {
  return new ZodTemplateLiteral({
    type: "template_literal",
    parts,
    ...util_exports.normalizeParams(params)
  });
}
var ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
  $ZodLazy.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => lazyProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
var ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
  $ZodPromise.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => promiseProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function promise(innerType) {
  return new ZodPromise({
    type: "promise",
    innerType
  });
}
var ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
  $ZodFunction.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => functionProcessor(inst, ctx, json2, params);
});
function _function(params) {
  var _a5, _b;
  return new ZodFunction({
    type: "function",
    input: Array.isArray(params == null ? void 0 : params.input) ? tuple(params == null ? void 0 : params.input) : (_a5 = params == null ? void 0 : params.input) != null ? _a5 : array(unknown()),
    output: (_b = params == null ? void 0 : params.output) != null ? _b : unknown()
  });
}
var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => customProcessor(inst, ctx, json2, params);
});
function check(fn) {
  const ch = new $ZodCheck({
    check: "custom"
    // ...util.normalizeParams(params),
  });
  ch._zod.check = fn;
  return ch;
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn != null ? fn : (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return _superRefine(fn, params);
}
var describe2 = describe;
var meta2 = meta;
function _instanceof(cls, params = {}) {
  const inst = new ZodCustom({
    type: "custom",
    check: "custom",
    fn: (data) => data instanceof cls,
    abort: true,
    ...util_exports.normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  inst._zod.check = (payload) => {
    var _a5;
    if (!(payload.value instanceof cls)) {
      payload.issues.push({
        code: "invalid_type",
        expected: cls.name,
        input: payload.value,
        inst,
        path: [...(_a5 = inst._zod.def.path) != null ? _a5 : []]
      });
    }
  };
  return inst;
}
var stringbool = (...args) => _stringbool({
  Codec: ZodCodec,
  Boolean: ZodBoolean,
  String: ZodString
}, ...args);
function json(params) {
  const jsonSchema = lazy(() => {
    return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
  });
  return jsonSchema;
}
function preprocess(fn, schema) {
  return new ZodPreprocess({
    type: "pipe",
    in: transform(fn),
    out: schema
  });
}

// node_modules/zod/v4/classic/compat.js
var ZodIssueCode = {
  invalid_type: "invalid_type",
  too_big: "too_big",
  too_small: "too_small",
  invalid_format: "invalid_format",
  not_multiple_of: "not_multiple_of",
  unrecognized_keys: "unrecognized_keys",
  invalid_union: "invalid_union",
  invalid_key: "invalid_key",
  invalid_element: "invalid_element",
  invalid_value: "invalid_value",
  custom: "custom"
};
function setErrorMap(map2) {
  config({
    customError: map2
  });
}
function getErrorMap() {
  return config().customError;
}
var ZodFirstPartyTypeKind;
/* @__PURE__ */ (function(ZodFirstPartyTypeKind2) {
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));

// node_modules/zod/v4/classic/from-json-schema.js
var z = {
  ...schemas_exports2,
  ...checks_exports2,
  iso: iso_exports
};
var RECOGNIZED_KEYS = /* @__PURE__ */ new Set([
  // Schema identification
  "$schema",
  "$ref",
  "$defs",
  "definitions",
  // Core schema keywords
  "$id",
  "id",
  "$comment",
  "$anchor",
  "$vocabulary",
  "$dynamicRef",
  "$dynamicAnchor",
  // Type
  "type",
  "enum",
  "const",
  // Composition
  "anyOf",
  "oneOf",
  "allOf",
  "not",
  // Object
  "properties",
  "required",
  "additionalProperties",
  "patternProperties",
  "propertyNames",
  "minProperties",
  "maxProperties",
  // Array
  "items",
  "prefixItems",
  "additionalItems",
  "minItems",
  "maxItems",
  "uniqueItems",
  "contains",
  "minContains",
  "maxContains",
  // String
  "minLength",
  "maxLength",
  "pattern",
  "format",
  // Number
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  // Already handled metadata
  "description",
  "default",
  // Content
  "contentEncoding",
  "contentMediaType",
  "contentSchema",
  // Unsupported (error-throwing)
  "unevaluatedItems",
  "unevaluatedProperties",
  "if",
  "then",
  "else",
  "dependentSchemas",
  "dependentRequired",
  // OpenAPI
  "nullable",
  "readOnly"
]);
function detectVersion(schema, defaultTarget) {
  const $schema = schema.$schema;
  if ($schema === "https://json-schema.org/draft/2020-12/schema") {
    return "draft-2020-12";
  }
  if ($schema === "http://json-schema.org/draft-07/schema#") {
    return "draft-7";
  }
  if ($schema === "http://json-schema.org/draft-04/schema#") {
    return "draft-4";
  }
  return defaultTarget != null ? defaultTarget : "draft-2020-12";
}
function resolveRef(ref, ctx) {
  if (!ref.startsWith("#")) {
    throw new Error("External $ref is not supported, only local refs (#/...) are allowed");
  }
  const path = ref.slice(1).split("/").filter(Boolean);
  if (path.length === 0) {
    return ctx.rootSchema;
  }
  const defsKey = ctx.version === "draft-2020-12" ? "$defs" : "definitions";
  if (path[0] === defsKey) {
    const key = path[1];
    if (!key || !ctx.defs[key]) {
      throw new Error(`Reference not found: ${ref}`);
    }
    return ctx.defs[key];
  }
  throw new Error(`Reference not found: ${ref}`);
}
function convertBaseSchema(schema, ctx) {
  if (schema.not !== void 0) {
    if (typeof schema.not === "object" && Object.keys(schema.not).length === 0) {
      return z.never();
    }
    throw new Error("not is not supported in Zod (except { not: {} } for never)");
  }
  if (schema.unevaluatedItems !== void 0) {
    throw new Error("unevaluatedItems is not supported");
  }
  if (schema.unevaluatedProperties !== void 0) {
    throw new Error("unevaluatedProperties is not supported");
  }
  if (schema.if !== void 0 || schema.then !== void 0 || schema.else !== void 0) {
    throw new Error("Conditional schemas (if/then/else) are not supported");
  }
  if (schema.dependentSchemas !== void 0 || schema.dependentRequired !== void 0) {
    throw new Error("dependentSchemas and dependentRequired are not supported");
  }
  if (schema.$ref) {
    const refPath = schema.$ref;
    if (ctx.refs.has(refPath)) {
      return ctx.refs.get(refPath);
    }
    if (ctx.processing.has(refPath)) {
      return z.lazy(() => {
        if (!ctx.refs.has(refPath)) {
          throw new Error(`Circular reference not resolved: ${refPath}`);
        }
        return ctx.refs.get(refPath);
      });
    }
    ctx.processing.add(refPath);
    const resolved = resolveRef(refPath, ctx);
    const zodSchema2 = convertSchema(resolved, ctx);
    ctx.refs.set(refPath, zodSchema2);
    ctx.processing.delete(refPath);
    return zodSchema2;
  }
  if (schema.enum !== void 0) {
    const enumValues = schema.enum;
    if (ctx.version === "openapi-3.0" && schema.nullable === true && enumValues.length === 1 && enumValues[0] === null) {
      return z.null();
    }
    if (enumValues.length === 0) {
      return z.never();
    }
    if (enumValues.length === 1) {
      return z.literal(enumValues[0]);
    }
    if (enumValues.every((v) => typeof v === "string")) {
      return z.enum(enumValues);
    }
    const literalSchemas = enumValues.map((v) => z.literal(v));
    if (literalSchemas.length < 2) {
      return literalSchemas[0];
    }
    return z.union([literalSchemas[0], literalSchemas[1], ...literalSchemas.slice(2)]);
  }
  if (schema.const !== void 0) {
    return z.literal(schema.const);
  }
  const type = schema.type;
  if (Array.isArray(type)) {
    const typeSchemas = type.map((t2) => {
      const typeSchema = { ...schema, type: t2 };
      return convertBaseSchema(typeSchema, ctx);
    });
    if (typeSchemas.length === 0) {
      return z.never();
    }
    if (typeSchemas.length === 1) {
      return typeSchemas[0];
    }
    return z.union(typeSchemas);
  }
  if (!type) {
    return z.any();
  }
  let zodSchema;
  switch (type) {
    case "string": {
      let stringSchema = z.string();
      if (schema.format) {
        const format = schema.format;
        if (format === "email") {
          stringSchema = stringSchema.check(z.email());
        } else if (format === "uri" || format === "uri-reference") {
          stringSchema = stringSchema.check(z.url());
        } else if (format === "uuid" || format === "guid") {
          stringSchema = stringSchema.check(z.uuid());
        } else if (format === "date-time") {
          stringSchema = stringSchema.check(z.iso.datetime());
        } else if (format === "date") {
          stringSchema = stringSchema.check(z.iso.date());
        } else if (format === "time") {
          stringSchema = stringSchema.check(z.iso.time());
        } else if (format === "duration") {
          stringSchema = stringSchema.check(z.iso.duration());
        } else if (format === "ipv4") {
          stringSchema = stringSchema.check(z.ipv4());
        } else if (format === "ipv6") {
          stringSchema = stringSchema.check(z.ipv6());
        } else if (format === "mac") {
          stringSchema = stringSchema.check(z.mac());
        } else if (format === "cidr") {
          stringSchema = stringSchema.check(z.cidrv4());
        } else if (format === "cidr-v6") {
          stringSchema = stringSchema.check(z.cidrv6());
        } else if (format === "base64") {
          stringSchema = stringSchema.check(z.base64());
        } else if (format === "base64url") {
          stringSchema = stringSchema.check(z.base64url());
        } else if (format === "e164") {
          stringSchema = stringSchema.check(z.e164());
        } else if (format === "jwt") {
          stringSchema = stringSchema.check(z.jwt());
        } else if (format === "emoji") {
          stringSchema = stringSchema.check(z.emoji());
        } else if (format === "nanoid") {
          stringSchema = stringSchema.check(z.nanoid());
        } else if (format === "cuid") {
          stringSchema = stringSchema.check(z.cuid());
        } else if (format === "cuid2") {
          stringSchema = stringSchema.check(z.cuid2());
        } else if (format === "ulid") {
          stringSchema = stringSchema.check(z.ulid());
        } else if (format === "xid") {
          stringSchema = stringSchema.check(z.xid());
        } else if (format === "ksuid") {
          stringSchema = stringSchema.check(z.ksuid());
        }
      }
      if (typeof schema.minLength === "number") {
        stringSchema = stringSchema.min(schema.minLength);
      }
      if (typeof schema.maxLength === "number") {
        stringSchema = stringSchema.max(schema.maxLength);
      }
      if (schema.pattern) {
        stringSchema = stringSchema.regex(new RegExp(schema.pattern));
      }
      zodSchema = stringSchema;
      break;
    }
    case "number":
    case "integer": {
      let numberSchema = type === "integer" ? z.number().int() : z.number();
      if (typeof schema.minimum === "number") {
        numberSchema = numberSchema.min(schema.minimum);
      }
      if (typeof schema.maximum === "number") {
        numberSchema = numberSchema.max(schema.maximum);
      }
      if (typeof schema.exclusiveMinimum === "number") {
        numberSchema = numberSchema.gt(schema.exclusiveMinimum);
      } else if (schema.exclusiveMinimum === true && typeof schema.minimum === "number") {
        numberSchema = numberSchema.gt(schema.minimum);
      }
      if (typeof schema.exclusiveMaximum === "number") {
        numberSchema = numberSchema.lt(schema.exclusiveMaximum);
      } else if (schema.exclusiveMaximum === true && typeof schema.maximum === "number") {
        numberSchema = numberSchema.lt(schema.maximum);
      }
      if (typeof schema.multipleOf === "number") {
        numberSchema = numberSchema.multipleOf(schema.multipleOf);
      }
      zodSchema = numberSchema;
      break;
    }
    case "boolean": {
      zodSchema = z.boolean();
      break;
    }
    case "null": {
      zodSchema = z.null();
      break;
    }
    case "object": {
      const shape = {};
      const properties = schema.properties || {};
      const requiredSet = new Set(schema.required || []);
      for (const [key, propSchema] of Object.entries(properties)) {
        const propZodSchema = convertSchema(propSchema, ctx);
        shape[key] = requiredSet.has(key) ? propZodSchema : propZodSchema.optional();
      }
      if (schema.propertyNames) {
        const keySchema = convertSchema(schema.propertyNames, ctx);
        const valueSchema = schema.additionalProperties && typeof schema.additionalProperties === "object" ? convertSchema(schema.additionalProperties, ctx) : z.any();
        if (Object.keys(shape).length === 0) {
          zodSchema = z.record(keySchema, valueSchema);
          break;
        }
        const objectSchema2 = z.object(shape).passthrough();
        const recordSchema = z.looseRecord(keySchema, valueSchema);
        zodSchema = z.intersection(objectSchema2, recordSchema);
        break;
      }
      if (schema.patternProperties) {
        const patternProps = schema.patternProperties;
        const patternKeys = Object.keys(patternProps);
        const looseRecords = [];
        for (const pattern of patternKeys) {
          const patternValue = convertSchema(patternProps[pattern], ctx);
          const keySchema = z.string().regex(new RegExp(pattern));
          looseRecords.push(z.looseRecord(keySchema, patternValue));
        }
        const schemasToIntersect = [];
        if (Object.keys(shape).length > 0) {
          schemasToIntersect.push(z.object(shape).passthrough());
        }
        schemasToIntersect.push(...looseRecords);
        if (schemasToIntersect.length === 0) {
          zodSchema = z.object({}).passthrough();
        } else if (schemasToIntersect.length === 1) {
          zodSchema = schemasToIntersect[0];
        } else {
          let result = z.intersection(schemasToIntersect[0], schemasToIntersect[1]);
          for (let i = 2; i < schemasToIntersect.length; i++) {
            result = z.intersection(result, schemasToIntersect[i]);
          }
          zodSchema = result;
        }
        break;
      }
      const objectSchema = z.object(shape);
      if (schema.additionalProperties === false) {
        zodSchema = objectSchema.strict();
      } else if (typeof schema.additionalProperties === "object") {
        zodSchema = objectSchema.catchall(convertSchema(schema.additionalProperties, ctx));
      } else {
        zodSchema = objectSchema.passthrough();
      }
      break;
    }
    case "array": {
      const prefixItems = schema.prefixItems;
      const items = schema.items;
      if (prefixItems && Array.isArray(prefixItems)) {
        const tupleItems = prefixItems.map((item) => convertSchema(item, ctx));
        const rest = items && typeof items === "object" && !Array.isArray(items) ? convertSchema(items, ctx) : void 0;
        if (rest) {
          zodSchema = z.tuple(tupleItems).rest(rest);
        } else {
          zodSchema = z.tuple(tupleItems);
        }
        if (typeof schema.minItems === "number") {
          zodSchema = zodSchema.check(z.minLength(schema.minItems));
        }
        if (typeof schema.maxItems === "number") {
          zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        }
      } else if (Array.isArray(items)) {
        const tupleItems = items.map((item) => convertSchema(item, ctx));
        const rest = schema.additionalItems && typeof schema.additionalItems === "object" ? convertSchema(schema.additionalItems, ctx) : void 0;
        if (rest) {
          zodSchema = z.tuple(tupleItems).rest(rest);
        } else {
          zodSchema = z.tuple(tupleItems);
        }
        if (typeof schema.minItems === "number") {
          zodSchema = zodSchema.check(z.minLength(schema.minItems));
        }
        if (typeof schema.maxItems === "number") {
          zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        }
      } else if (items !== void 0) {
        const element = convertSchema(items, ctx);
        let arraySchema = z.array(element);
        if (typeof schema.minItems === "number") {
          arraySchema = arraySchema.min(schema.minItems);
        }
        if (typeof schema.maxItems === "number") {
          arraySchema = arraySchema.max(schema.maxItems);
        }
        zodSchema = arraySchema;
      } else {
        zodSchema = z.array(z.any());
      }
      break;
    }
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
  return zodSchema;
}
function convertSchema(schema, ctx) {
  if (typeof schema === "boolean") {
    return schema ? z.any() : z.never();
  }
  let baseSchema = convertBaseSchema(schema, ctx);
  const hasExplicitType = schema.type || schema.enum !== void 0 || schema.const !== void 0;
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    const options = schema.anyOf.map((s) => convertSchema(s, ctx));
    const anyOfUnion = z.union(options);
    baseSchema = hasExplicitType ? z.intersection(baseSchema, anyOfUnion) : anyOfUnion;
  }
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    const options = schema.oneOf.map((s) => convertSchema(s, ctx));
    const oneOfUnion = z.xor(options);
    baseSchema = hasExplicitType ? z.intersection(baseSchema, oneOfUnion) : oneOfUnion;
  }
  if (schema.allOf && Array.isArray(schema.allOf)) {
    if (schema.allOf.length === 0) {
      baseSchema = hasExplicitType ? baseSchema : z.any();
    } else {
      let result = hasExplicitType ? baseSchema : convertSchema(schema.allOf[0], ctx);
      const startIdx = hasExplicitType ? 0 : 1;
      for (let i = startIdx; i < schema.allOf.length; i++) {
        result = z.intersection(result, convertSchema(schema.allOf[i], ctx));
      }
      baseSchema = result;
    }
  }
  if (schema.nullable === true && ctx.version === "openapi-3.0") {
    baseSchema = z.nullable(baseSchema);
  }
  if (schema.readOnly === true) {
    baseSchema = z.readonly(baseSchema);
  }
  if (schema.default !== void 0) {
    baseSchema = baseSchema.default(schema.default);
  }
  const extraMeta = {};
  const coreMetadataKeys = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
  for (const key of coreMetadataKeys) {
    if (key in schema) {
      extraMeta[key] = schema[key];
    }
  }
  const contentMetadataKeys = ["contentEncoding", "contentMediaType", "contentSchema"];
  for (const key of contentMetadataKeys) {
    if (key in schema) {
      extraMeta[key] = schema[key];
    }
  }
  for (const key of Object.keys(schema)) {
    if (!RECOGNIZED_KEYS.has(key)) {
      extraMeta[key] = schema[key];
    }
  }
  if (Object.keys(extraMeta).length > 0) {
    ctx.registry.add(baseSchema, extraMeta);
  }
  if (schema.description) {
    baseSchema = baseSchema.describe(schema.description);
  }
  return baseSchema;
}
function fromJSONSchema(schema, params) {
  var _a5;
  if (typeof schema === "boolean") {
    return schema ? z.any() : z.never();
  }
  let normalized;
  try {
    normalized = JSON.parse(JSON.stringify(schema));
  } catch (e) {
    throw new Error("fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas");
  }
  const version2 = detectVersion(normalized, params == null ? void 0 : params.defaultTarget);
  const defs = normalized.$defs || normalized.definitions || {};
  const ctx = {
    version: version2,
    defs,
    refs: /* @__PURE__ */ new Map(),
    processing: /* @__PURE__ */ new Set(),
    rootSchema: normalized,
    registry: (_a5 = params == null ? void 0 : params.registry) != null ? _a5 : globalRegistry
  };
  return convertSchema(normalized, ctx);
}

// node_modules/zod/v4/classic/coerce.js
var coerce_exports = {};
__export(coerce_exports, {
  bigint: () => bigint3,
  boolean: () => boolean3,
  date: () => date4,
  number: () => number3,
  string: () => string3
});
function string3(params) {
  return _coercedString(ZodString, params);
}
function number3(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean3(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint3(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date4(params) {
  return _coercedDate(ZodDate, params);
}

// node_modules/zod/v4/classic/external.js
config(en_default());

// src/core/proposal/ProposalSchema.ts
var aBlockProposalSchema = external_exports.object({
  id: external_exports.string().min(1, "Block id must be a non-empty string"),
  content: external_exports.string().min(1, "Block content must be a non-empty string"),
  warnings: external_exports.array(external_exports.string()).optional()
});
var frontmatterSuggestionSchema = external_exports.object({
  status: external_exports.literal("refined").optional(),
  source: external_exports.array(external_exports.enum(["self", "external", "practice"])).optional(),
  context: external_exports.array(external_exports.string()).optional()
}).optional();
var tagSuggestionSchema = external_exports.object({
  selectedTags: external_exports.array(external_exports.string()).optional(),
  newTagSuggestions: external_exports.array(external_exports.string()).optional()
}).optional();
var rawRefinedProposalV2Schema = external_exports.object({
  workflowProfileId: external_exports.literal("raw-refined"),
  schemaVersion: external_exports.literal("0.2"),
  blocks: external_exports.array(aBlockProposalSchema).min(1, "At least one block is required"),
  frontmatterSuggestion: frontmatterSuggestionSchema,
  tagSuggestion: tagSuggestionSchema,
  warnings: external_exports.array(external_exports.string()).optional()
});

// src/core/proposal/ProposalValidator.ts
var ProposalValidator = class {
  constructor(profile) {
    this.profile = profile;
  }
  validateModelOutput(output, context = {}) {
    const parsed = this.parseJsonLikeOutput(output);
    if (!parsed.ok) {
      return parsed;
    }
    const schema = this.validateSchema(parsed.value);
    if (!schema.ok) {
      return schema;
    }
    const policyErrors = this.validatePolicy(schema.proposal, parsed.value);
    if (policyErrors.length > 0) {
      return { ok: false, errors: policyErrors };
    }
    const contentErrors = this.validateContent(schema.proposal, parsed.value, context);
    if (contentErrors.length > 0) {
      return { ok: false, errors: contentErrors };
    }
    return {
      ok: true,
      proposal: schema.proposal
    };
  }
  /**
   * Validate v0.2.0 proposal output using zod.
   * This is a structural check only — no policy, no tag whitelist,
   * no normalization. Zod errors are returned in a format that can be
   * saved to FailedAttemptRecord.validationSnapshot.zodError.
   */
  validateV2Output(output) {
    const parsed = this.parseJsonLikeOutput(output);
    if (!parsed.ok) {
      return parsed;
    }
    const zodResult = rawRefinedProposalV2Schema.safeParse(parsed.value);
    if (!zodResult.success) {
      return {
        ok: false,
        errors: [
          {
            layer: "schema",
            code: "zod-validation-failed",
            message: "Proposal does not match v0.2 schema."
          }
        ],
        zodError: zodResult.error
      };
    }
    return {
      ok: true,
      proposal: zodResult.data
    };
  }
  validateEditedRefinedSections(refinedSections, context = {}) {
    const schemaErrors = this.validateRefinedSectionsSchema(refinedSections);
    if (schemaErrors.length > 0) {
      return {
        ok: false,
        errors: schemaErrors
      };
    }
    const proposal = {
      workflowProfileId: "raw-refined",
      refinedSections
    };
    const contentErrors = this.validateContent(proposal, { refinedSections }, context);
    if (contentErrors.length > 0) {
      return {
        ok: false,
        errors: contentErrors
      };
    }
    return {
      ok: true,
      refinedSections
    };
  }
  parseJsonLikeOutput(output) {
    const candidates = [output.trim(), extractJsonBlock(output)].filter(Boolean);
    for (const candidate of candidates) {
      try {
        return {
          ok: true,
          value: JSON.parse(candidate)
        };
      } catch (e) {
        continue;
      }
    }
    return {
      ok: false,
      errors: [
        {
          layer: "json",
          code: "invalid-json",
          message: "Model output is not valid JSON."
        }
      ]
    };
  }
  validateSchema(value) {
    if (!isRecord(value)) {
      return schemaError("invalid-root", "Proposal root must be an object.");
    }
    if (value.workflowProfileId !== this.profile.proposalSchema.workflowProfileId) {
      return schemaError("invalid-workflow-profile-id", "workflowProfileId must be raw-refined.");
    }
    if (!isRecord(value.refinedSections)) {
      return schemaError("missing-refined-sections", "refinedSections is required.");
    }
    const refinedSectionErrors = this.validateRefinedSectionsSchema(value.refinedSections);
    if (refinedSectionErrors.length > 0) {
      return {
        ok: false,
        errors: [refinedSectionErrors[0]]
      };
    }
    if (value.frontmatterSuggestion !== void 0 && !isRecord(value.frontmatterSuggestion)) {
      return schemaError("invalid-frontmatter-suggestion", "frontmatterSuggestion must be an object.");
    }
    if (value.tagSuggestion !== void 0 && !isRecord(value.tagSuggestion)) {
      return schemaError("invalid-tag-suggestion", "tagSuggestion must be an object.");
    }
    if (isRecord(value.tagSuggestion) && !validateStringArray(value.tagSuggestion.add)) {
      return schemaError("invalid-tag-add", "tagSuggestion.add must be an array of strings.");
    }
    if (isRecord(value.tagSuggestion) && !validateStringArray(value.tagSuggestion.remove)) {
      return schemaError("invalid-tag-remove", "tagSuggestion.remove must be an array of strings.");
    }
    if (value.warnings !== void 0 && !validateStringArray(value.warnings)) {
      return schemaError("invalid-warnings", "warnings must be an array of strings.");
    }
    return {
      ok: true,
      proposal: {
        workflowProfileId: "raw-refined",
        refinedSections: {
          summary: value.refinedSections.summary,
          coreQuestion: value.refinedSections.coreQuestion,
          currentConclusion: value.refinedSections.currentConclusion,
          reasoning: value.refinedSections.reasoning,
          ...typeof value.refinedSections.scope === "string" ? { scope: value.refinedSections.scope } : {},
          ...typeof value.refinedSections.nextSteps === "string" ? { nextSteps: value.refinedSections.nextSteps } : {},
          ...typeof value.refinedSections.refineNote === "string" ? { refineNote: value.refinedSections.refineNote } : {}
        },
        ...isRecord(value.frontmatterSuggestion) ? { frontmatterSuggestion: value.frontmatterSuggestion } : {},
        ...isRecord(value.tagSuggestion) ? { tagSuggestion: value.tagSuggestion } : {},
        ...Array.isArray(value.warnings) ? { warnings: value.warnings } : {}
      }
    };
  }
  validateRefinedSectionsSchema(value) {
    if (!isRecord(value)) {
      return [{
        layer: "schema",
        code: "missing-refined-sections",
        message: "refinedSections is required."
      }];
    }
    for (const key of this.profile.outputSections.required) {
      if (typeof value[key] !== "string" || value[key].trim() === "") {
        return [{
          layer: "schema",
          code: `missing-required-section-${key}`,
          message: `refinedSections.${key} must be a non-empty string.`
        }];
      }
    }
    for (const key of this.profile.outputSections.optional) {
      const sectionValue = value[key];
      if (sectionValue !== void 0 && typeof sectionValue !== "string") {
        return [{
          layer: "schema",
          code: `invalid-section-type-${key}`,
          message: `refinedSections.${key} must be a string when present.`
        }];
      }
    }
    return [];
  }
  validatePolicy(proposal, rawValue) {
    var _a5, _b, _c, _d;
    const errors = [];
    const raw = isRecord(rawValue) ? rawValue : {};
    if (proposal.frontmatterSuggestion) {
      for (const key of Object.keys(proposal.frontmatterSuggestion)) {
        if (!this.profile.frontmatter.allowedFields.includes(key)) {
          errors.push(policyError("unknown-frontmatter-field", `frontmatterSuggestion.${key} is not allowed.`));
          continue;
        }
        if (this.profile.frontmatter.readonlyFields.includes(key)) {
          errors.push(policyError("readonly-frontmatter-field", `frontmatterSuggestion.${key} is readonly.`));
        }
      }
      if (proposal.frontmatterSuggestion.status !== void 0 && proposal.frontmatterSuggestion.status !== "refined") {
        errors.push(policyError("invalid-status-suggestion", "frontmatterSuggestion.status must be refined when present."));
      }
      if (proposal.frontmatterSuggestion.source !== void 0) {
        const valid = Array.isArray(proposal.frontmatterSuggestion.source) && proposal.frontmatterSuggestion.source.every((item) => item === "self" || item === "external" || item === "practice");
        if (!valid) {
          errors.push(policyError("invalid-source-suggestion", "frontmatterSuggestion.source contains unsupported values."));
        }
      }
      if (proposal.frontmatterSuggestion.context !== void 0 && !validateStringArray(proposal.frontmatterSuggestion.context)) {
        errors.push(policyError("invalid-context-suggestion", "frontmatterSuggestion.context must be an array of strings."));
      }
    }
    const tags = [...(_b = (_a5 = proposal.tagSuggestion) == null ? void 0 : _a5.add) != null ? _b : [], ...(_d = (_c = proposal.tagSuggestion) == null ? void 0 : _c.remove) != null ? _d : []];
    for (const tag of tags) {
      if (!this.profile.tags.allowedTags.includes(tag)) {
        errors.push(policyError("unknown-tag", `Tag ${tag} is not allowed by the active profile.`));
      }
      if (this.profile.tags.blockedTags.some((blockedTag) => blockedTag.endsWith("*") ? tag.startsWith(blockedTag.slice(0, -1)) : tag === blockedTag)) {
        errors.push(policyError("blocked-tag", `Tag ${tag} is blocked by the active profile.`));
      }
    }
    const forbiddenFields = [
      ["linkOperations", "links"],
      ["mocOperations", "moc"],
      ["renameSuggestion", "rename"],
      ["moveSuggestion", "move"],
      ["archiveSuggestion", "archive"],
      ["deleteSuggestion", "delete"]
    ];
    for (const [fieldName, capability] of forbiddenFields) {
      if (raw[fieldName] !== void 0) {
        errors.push(policyError("forbidden-capability", `Proposal field ${fieldName} is forbidden because ${capability} capability is disabled.`));
      }
    }
    return errors;
  }
  validateContent(proposal, rawValue, context) {
    var _a5;
    const errors = [];
    const protectedRegionText = (_a5 = context.protectedRegionText) == null ? void 0 : _a5.trim();
    if (protectedRegionText) {
      const allTextValues = collectStringValues(rawValue);
      if (allTextValues.some((value) => value.includes(protectedRegionText))) {
        errors.push(contentError("protected-region-leakage", "Proposal must not include protected region text."));
      }
    }
    const textValues = collectStringValues(proposal);
    if (textValues.some((value) => value.includes("## \u539F\u59CB\u5185\u5BB9"))) {
      errors.push(contentError("protected-heading-in-proposal", "Proposal must not include the protected heading ## \u539F\u59CB\u5185\u5BB9."));
    }
    if (textValues.some((value) => value.includes("#rel/"))) {
      errors.push(contentError("relationship-tag-in-content", "Proposal content must not include #rel/* tags."));
    }
    return errors;
  }
};
function extractJsonBlock(output) {
  var _a5, _b;
  const fencedMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (_b = (_a5 = fencedMatch == null ? void 0 : fencedMatch[1]) == null ? void 0 : _a5.trim()) != null ? _b : null;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateStringArray(value) {
  return value === void 0 || Array.isArray(value) && value.every((item) => typeof item === "string");
}
function schemaError(code, message) {
  return {
    ok: false,
    errors: [
      {
        layer: "schema",
        code,
        message
      }
    ]
  };
}
function policyError(code, message) {
  return {
    layer: "policy",
    code,
    message
  };
}
function contentError(code, message) {
  return {
    layer: "content",
    code,
    message
  };
}
function collectStringValues(value) {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringValues(item));
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => collectStringValues(item));
  }
  return [];
}

// src/application/BuildApplyPlanUseCase.ts
var BuildApplyPlanUseCase = class {
  constructor(profile, sessionStore, noteFilePort, sessionCacheV2) {
    this.sessionStore = sessionStore;
    this.noteFilePort = noteFilePort;
    this.sessionCacheV2 = sessionCacheV2;
    this.planner = new ApplyPlanner();
    this.bodyAssembler = new BodyAssembler();
    this.protectedRegionExtractor = new ProtectedRegionExtractor();
    this.blockExtractor = new BlockExtractor();
    this.profile = profile;
    this.policyGuard = new PolicyGuard(profile);
    this.proposalValidator = new ProposalValidator(profile);
  }
  async execute(sessionId, decision) {
    var _a5;
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return {
        ok: false,
        code: "missing-session",
        message: `Proposal session ${sessionId} was not found.`
      };
    }
    const guardedDecision = this.policyGuard.guardRequest(decision);
    const note = await this.noteFilePort.readNoteByPath(session.notePath);
    if (!note) {
      return {
        ok: false,
        code: "missing-note",
        message: `Target note ${session.notePath} was not found.`
      };
    }
    let body;
    if (guardedDecision.acceptBody) {
      const editedSections = (_a5 = guardedDecision.editedRefinedSections) != null ? _a5 : session.proposal.refinedSections;
      const protectedRegion = this.protectedRegionExtractor.extract(
        note.content,
        this.profile.protectedRegions.definitions[0]
      );
      if (!protectedRegion.ok) {
        return {
          ok: false,
          code: protectedRegion.error.code,
          message: protectedRegion.error.message
        };
      }
      const validation = this.proposalValidator.validateEditedRefinedSections(editedSections, {
        protectedRegionText: protectedRegion.region.text
      });
      if (!validation.ok) {
        return {
          ok: false,
          code: validation.errors[0].code,
          message: validation.errors[0].message
        };
      }
      const assembled = this.bodyAssembler.assemble(
        session,
        this.profile.protectedRegions.definitions[0],
        note.content,
        validation.refinedSections
      );
      if (!assembled.ok) {
        return {
          ok: false,
          code: assembled.error.code,
          message: assembled.error.message
        };
      }
      body = assembled.body;
    }
    return {
      ok: true,
      plan: this.planner.buildPlan(session, guardedDecision, body)
    };
  }
  async executeV2(sessionId, decision) {
    const session = await this.findSessionV2(sessionId);
    if (!session) {
      return {
        ok: false,
        code: "missing-session",
        message: `Proposal session ${sessionId} was not found.`
      };
    }
    const note = await this.noteFilePort.readNoteByPath(session.notePath);
    if (!note) {
      return {
        ok: false,
        code: "missing-note",
        message: `Target note ${session.notePath} was not found.`
      };
    }
    const bBlock = this.blockExtractor.extract(note.content, session.blockConfigSnapshot.bBlock);
    if (!bBlock.ok) {
      return {
        ok: false,
        code: bBlock.error.code,
        message: bBlock.error.message
      };
    }
    const acceptedBlockIds = new Set(
      Object.entries(decision.acceptBlocks).filter(([, accepted]) => accepted).map(([id]) => id)
    );
    for (const block of session.proposal.blocks) {
      if (!acceptedBlockIds.has(block.id)) continue;
      if (block.content.includes(bBlock.block.text)) {
        return {
          ok: false,
          code: "accepted-block-contains-b-block",
          message: `Accepted block ${block.id} contains protected B block content.`
        };
      }
    }
    return {
      ok: true,
      plan: this.planner.buildPlanV2(session, decision)
    };
  }
  async findSessionV2(sessionId) {
    var _a5, _b;
    const sessions = await ((_a5 = this.sessionCacheV2) == null ? void 0 : _a5.loadAll());
    return (_b = sessions == null ? void 0 : sessions.find((session) => session.id === sessionId)) != null ? _b : null;
  }
};

// src/core/prompt/PromptBuilder.ts
var PromptBuilder = class {
  build(input) {
    var _a5;
    const requestId = (_a5 = input.requestId) != null ? _a5 : `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
    const metadata = {
      workflowProfileId: "raw-refined",
      requestId
    };
    const request = {
      provider: input.provider,
      model: input.model,
      messages,
      schemaName: "RawRefinedProposalV2",
      schemaVersion: "0.2",
      metadata
    };
    const debugSnapshot = {
      provider: input.provider,
      model: input.model,
      messages,
      schemaName: "RawRefinedProposalV2",
      schemaVersion: "0.2",
      metadata: {
        ...metadata,
        aBlockIds: input.aBlocks.map((b) => b.id),
        tagWhitelist: input.tagWhitelist,
        notePath: input.notePath,
        noteTitle: input.noteTitle
      }
    };
    return { request, debugSnapshot };
  }
  buildSystemPrompt() {
    return [
      "You are a structured refinement assistant for an Obsidian note.",
      "You must return valid JSON only. Do not include any text outside the JSON.",
      "Do not rewrite or include the B block (protected original content) in your output.",
      "",
      "The JSON must conform to this schema:",
      "{",
      '  "workflowProfileId": "raw-refined",',
      '  "schemaVersion": "0.2",',
      '  "blocks": [',
      '    {"id": "string (matches A block id)", "content": "string (refined content)", "warnings": ["string"]}',
      "  ],",
      '  "frontmatterSuggestion": {',
      '    "status": "refined",',
      '    "source": ["self" | "external" | "practice"],',
      '    "context": ["string"]',
      "  },",
      '  "tagSuggestion": {',
      '    "selectedTags": ["string (must be from tagWhitelist only)"],',
      '    "newTagSuggestions": ["string (new tag suggestions not in whitelist)"]',
      "  },",
      '  "warnings": ["string"]',
      "}",
      "",
      "Rules:",
      "- blocks: one entry per A block. Use the provided block ids exactly.",
      "- tagSuggestion.selectedTags: ONLY use tags from the supplied tagWhitelist.",
      "- tagSuggestion.newTagSuggestions: use for tags NOT in the whitelist.",
      "- selectedTags and newTagSuggestions must be strictly separate.",
      "- Never include tags from the blocked tags list (#raw, #refined, #self, #external, #practice, #rel/*)."
    ].join("\n");
  }
  buildUserPrompt(input) {
    const parts = [];
    parts.push(`Note path: ${input.notePath}`);
    parts.push(`Note title: ${input.noteTitle}`);
    parts.push("");
    parts.push("## A Block Prompts");
    parts.push("");
    parts.push("For each A block below, generate refined content and return it with the matching block id.");
    parts.push("");
    for (const block of input.aBlocks) {
      parts.push(`### Block: "${block.id}"`);
      parts.push(`- Heading: ${"#".repeat(block.headingLevel)} ${block.heading}`);
      parts.push(`- Prompt: ${block.prompt}`);
      parts.push("");
    }
    parts.push("## Tag Selection");
    parts.push("");
    parts.push(`Tag prompt: ${input.tagPrompt}`);
    parts.push("");
    parts.push("Tag whitelist:");
    parts.push(input.tagWhitelist.join("\n"));
    parts.push("");
    parts.push("## Note Content");
    parts.push("");
    parts.push(input.noteContent);
    return parts.join("\n");
  }
};

// src/core/proposal/TagNormalizer.ts
var TAG_SEPARATORS = /[，、,\s]+/;
function normalizeTagList(raw) {
  return raw.split(TAG_SEPARATORS).map((t2) => t2.trim()).filter((t2) => t2.length > 0).map((t2) => t2.startsWith("#") ? t2 : "#" + t2).filter((t2, i, arr) => arr.indexOf(t2) === i);
}
function dedupe(arr) {
  return arr.filter((t2, i) => arr.indexOf(t2) === i);
}
function normalizeProposalTags(input, whitelist) {
  let applied = false;
  const normalizeAndTrack = (raw) => {
    const tags = normalizeTagList(raw);
    if (tags.length !== 1 || tags[0] !== raw) {
      applied = true;
    }
    return tags;
  };
  const allSelected = dedupe(input.selectedTags.flatMap(normalizeAndTrack));
  const allNew = dedupe(input.newTagSuggestions.flatMap(normalizeAndTrack));
  const whitelistedSelected = [];
  const movedToNew = [];
  for (const tag of allSelected) {
    if (whitelist.includes(tag)) {
      whitelistedSelected.push(tag);
    } else {
      movedToNew.push(tag);
      applied = true;
    }
  }
  const combinedNew = [...allNew, ...movedToNew];
  return {
    selectedTags: whitelistedSelected,
    newTagSuggestions: combinedNew,
    tagNormalizationApplied: applied
  };
}

// src/core/proposal/ProposalNormalizer.ts
var ProposalNormalizer = class {
  /**
   * Normalize a zod-parsed v0.2 proposal:
   *
   *  - Accept only blocks whose id matches an enabled A block config.
   *  - Reject unknown block ids (recorded in rejectedFields).
   *  - Warn about missing enabled A blocks.
   *  - Sort accepted blocks by config order.
   *  - Normalize tags (split, trim, #-prefix, dedupe, whitelist filtering).
   *
   * The returned validation result determines whether the proposal can proceed
   * to Review UI (valid / partial) or must be retried (invalid).
   */
  normalize(parsed, settings) {
    var _a5, _b, _c, _d;
    const warnings = [];
    const rejectedFields = [];
    const enabledConfigMap = new Map(
      settings.aBlocks.filter((c) => c.enabled).map((c) => [c.id, c])
    );
    const acceptedBlocks = [];
    const acceptedBlockIds = [];
    for (const block of parsed.blocks) {
      const config2 = enabledConfigMap.get(block.id);
      if (!config2) {
        rejectedFields.push({
          field: `block:${block.id}`,
          reason: "unknown-block-id",
          value: block.id
        });
        continue;
      }
      acceptedBlocks.push(block);
      acceptedBlockIds.push(block.id);
    }
    for (const [id, config2] of enabledConfigMap) {
      if (!acceptedBlockIds.includes(id)) {
        warnings.push(`Missing enabled A block: ${id} (${config2.name})`);
      }
    }
    acceptedBlocks.sort((a, b) => {
      var _a6, _b2, _c2, _d2;
      const orderA = (_b2 = (_a6 = enabledConfigMap.get(a.id)) == null ? void 0 : _a6.order) != null ? _b2 : 0;
      const orderB = (_d2 = (_c2 = enabledConfigMap.get(b.id)) == null ? void 0 : _c2.order) != null ? _d2 : 0;
      return orderA - orderB;
    });
    const hasRejectedBlocks = rejectedFields.length > 0;
    const hasMissingEnabled = warnings.some(
      (w) => w.startsWith("Missing enabled A block")
    );
    const tagInput = {
      selectedTags: (_b = (_a5 = parsed.tagSuggestion) == null ? void 0 : _a5.selectedTags) != null ? _b : [],
      newTagSuggestions: (_d = (_c = parsed.tagSuggestion) == null ? void 0 : _c.newTagSuggestions) != null ? _d : []
    };
    const tagResult = normalizeProposalTags(tagInput, settings.tagWhitelist);
    if (tagResult.tagNormalizationApplied) {
      warnings.push("Tag normalization applied: some tags were split, trimmed, prefixed with #, deduplicated, or moved from selectedTags to newTagSuggestions.");
    }
    let status;
    if (acceptedBlocks.length === 0) {
      status = "invalid";
    } else if (hasRejectedBlocks || hasMissingEnabled) {
      status = "partial";
    } else {
      status = "valid";
    }
    return {
      blocks: acceptedBlocks,
      tagSuggestion: {
        selectedTags: tagResult.selectedTags,
        newTagSuggestions: tagResult.newTagSuggestions
      },
      frontmatterSuggestion: parsed.frontmatterSuggestion,
      validation: {
        status,
        acceptedFields: acceptedBlockIds,
        rejectedFields,
        warnings,
        tagNormalizationApplied: tagResult.tagNormalizationApplied
      }
    };
  }
};

// src/runtime/TokenUsageReporter.ts
var TokenUsageReporter = class {
  resolveUsage(options) {
    const { provider, model, inputText, outputText, providerUsage } = options;
    if (providerUsage) {
      return {
        ...providerUsage,
        provider: providerUsage.provider || provider,
        model: providerUsage.model || model,
        countingMode: "actual",
        generatedAt: providerUsage.generatedAt || (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    try {
      const inputTokens = estimateTokenCount(inputText);
      const outputTokens = estimateTokenCount(outputText);
      return {
        provider,
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        countingMode: "estimated",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (e) {
      return {
        provider,
        model,
        countingMode: "unavailable",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
};
function estimateTokenCount(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}

// src/core/profile/BlockConfigValidator.ts
var BlockConfigValidator = class {
  validate(aBlocks, bBlock, protectH1) {
    const errors = [];
    const minLevel = protectH1 ? 2 : 1;
    const seenIds = /* @__PURE__ */ new Set();
    for (const block of aBlocks) {
      if (seenIds.has(block.id)) {
        errors.push({
          code: "duplicate-a-block-id",
          blockId: block.id,
          message: `Duplicate A block id: ${block.id}`
        });
      }
      seenIds.add(block.id);
      if (block.headingLevel < 1 || block.headingLevel > 6) {
        errors.push({
          code: "invalid-heading-level",
          blockId: block.id,
          message: `A block "${block.name}" (${block.id}) has invalid headingLevel=${block.headingLevel}.`
        });
      } else if (block.headingLevel < minLevel) {
        errors.push({
          code: "a-block-heading-level-too-low",
          blockId: block.id,
          message: `A block "${block.name}" (${block.id}) headingLevel=${block.headingLevel} is below minimum ${minLevel} (protectH1=${protectH1}).`
        });
      }
    }
    if (aBlocks.length === 0) {
      errors.push({
        code: "no-a-blocks",
        blockId: "(workflow)",
        message: "At least one A block is required."
      });
    }
    if (bBlock.headingLevel < 1 || bBlock.headingLevel > 6) {
      errors.push({
        code: "invalid-heading-level",
        blockId: bBlock.id,
        message: `B block "${bBlock.name}" has invalid headingLevel=${bBlock.headingLevel}.`
      });
    } else if (bBlock.headingLevel < minLevel) {
      errors.push({
        code: "b-block-heading-level-too-low",
        blockId: bBlock.id,
        message: `B block "${bBlock.name}" headingLevel=${bBlock.headingLevel} is below minimum ${minLevel} (protectH1=${protectH1}).`
      });
    }
    return {
      ok: errors.length === 0,
      errors
    };
  }
};

// src/application/CheckEligibilityUseCase.ts
var CheckEligibilityUseCase = class {
  constructor(noteRepository, profile, settings) {
    this.noteRepository = noteRepository;
    this.profile = profile;
    this.settings = settings;
    this.blockExtractor = new BlockExtractor();
    this.blockConfigValidator = new BlockConfigValidator();
  }
  async execute() {
    const activeNote = await this.noteRepository.getActiveNote();
    if (activeNote.kind === "no-active-file") {
      return {
        hasActiveMarkdownNote: false,
        reason: "no-active-file"
      };
    }
    if (activeNote.kind === "non-markdown-file") {
      return {
        hasActiveMarkdownNote: false,
        reason: "non-markdown-file",
        notePath: activeNote.path,
        extension: activeNote.extension
      };
    }
    const parsed = parseFrontmatter(activeNote.note.content);
    const failureReasons = [];
    const statusValue = typeof parsed.frontmatter.status === "string" ? parsed.frontmatter.status : void 0;
    if (this.profile.eligibility.requireFrontmatter && !parsed.hasFrontmatter) {
      failureReasons.push("missingFrontmatter");
    }
    if (statusValue !== this.profile.eligibility.requiredStatus) {
      failureReasons.push("invalidStatus");
    }
    const bBlockResult = this.blockExtractor.extract(
      activeNote.note.content,
      this.settings.bBlock
    );
    if (!bBlockResult.ok) {
      switch (bBlockResult.error.code) {
        case "missing-heading":
          failureReasons.push("missingBBlock");
          break;
        case "multiple-heading":
          failureReasons.push("multipleBBlock");
          break;
        case "heading-level-mismatch":
          failureReasons.push("bBlockLevelMismatch");
          break;
        case "empty-b-block":
          failureReasons.push("emptyBBlock");
          break;
      }
    }
    const enabledABlocks = this.settings.aBlocks.filter((b) => b.enabled);
    const configValidation = this.blockConfigValidator.validate(
      enabledABlocks,
      this.settings.bBlock,
      this.settings.protectH1
    );
    if (!configValidation.ok) {
      failureReasons.push("invalidABlockConfig");
    }
    return {
      hasActiveMarkdownNote: true,
      eligible: failureReasons.length === 0,
      ...failureReasons.length > 0 ? { failureReasons } : {},
      notePath: activeNote.note.path,
      noteTitle: activeNote.note.title,
      rawContentLength: activeNote.note.content.length,
      ...statusValue ? { status: statusValue } : {}
    };
  }
};

// src/application/RetryAttemptRunner.ts
var MAX_ATTEMPTS = 3;
var RetryAttemptRunner = class {
  constructor(maxAttempts = MAX_ATTEMPTS) {
    this.maxAttempts = maxAttempts;
  }
  async run(runAttempt) {
    const failedAttempts = [];
    for (let i = 1; i <= this.maxAttempts; i++) {
      const index = i;
      const result = await runAttempt(index);
      if (result.success) {
        return {
          status: "success",
          session: result.session,
          attemptsUsed: index,
          failedAttempts
        };
      }
      failedAttempts.push(result.attempt);
    }
    return { status: "exhausted", failedAttempts };
  }
};

// src/application/CreateProposalUseCase.ts
var ERROR_SESSION_CACHE_DISPLAY_PATH = ".obsidian/plugins/obsidian-refined-layer/error-session-cache/";
var CreateProposalUseCase = class {
  constructor(noteRepository, profile, llmProvider, sessionStore, settings, promptOverride, errorSessionCache, sessionCacheV2) {
    this.noteRepository = noteRepository;
    this.profile = profile;
    this.llmProvider = llmProvider;
    this.sessionStore = sessionStore;
    this.settings = settings;
    this.promptOverride = promptOverride;
    this.tokenUsageReporter = new TokenUsageReporter();
    this.blockExtractor = new BlockExtractor();
    this.eligibilityUseCase = new CheckEligibilityUseCase(noteRepository, profile, settings);
    this.proposalValidator = new ProposalValidator(profile);
    this.protectedRegionExtractor = new ProtectedRegionExtractor();
    this.retryRunner = new RetryAttemptRunner();
    this.errorSessionCache = errorSessionCache;
    this.sessionCacheV2 = sessionCacheV2;
  }
  // ── v0.1.0 compat path ──
  async execute() {
    var _a5, _b;
    const activeNote = await this.eligibilityUseCase.execute();
    if (!activeNote.hasActiveMarkdownNote || !activeNote.eligible) {
      return {
        kind: "eligibility-failed",
        eligibility: activeNote
      };
    }
    const lookup = await this.noteRepository.getActiveNote();
    if (lookup.kind !== "markdown") {
      return {
        kind: "eligibility-failed",
        eligibility: activeNote
      };
    }
    const protectedRegionResult = this.protectedRegionExtractor.extract(
      lookup.note.content,
      this.profile.protectedRegions.definitions[0]
    );
    if (!protectedRegionResult.ok) {
      return {
        kind: "validation-failed",
        errors: [
          {
            layer: "content",
            code: protectedRegionResult.error.code,
            message: protectedRegionResult.error.message
          }
        ]
      };
    }
    const variables = {
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      noteContent: lookup.note.content
    };
    const systemPrompt = renderPromptTemplate(
      ((_a5 = this.promptOverride) == null ? void 0 : _a5.enabled) && this.promptOverride.systemPrompt ? this.promptOverride.systemPrompt : this.profile.prompt.systemPrompt,
      variables
    );
    const userPrompt = renderPromptTemplate(
      ((_b = this.promptOverride) == null ? void 0 : _b.enabled) && this.promptOverride.userPrompt ? this.promptOverride.userPrompt : this.profile.prompt.userPrompt,
      variables
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
          noteContent: lookup.note.content
        }
      });
    } catch (error51) {
      return {
        kind: "provider-failed",
        message: toSafeErrorMessage(error51)
      };
    }
    const validation = this.proposalValidator.validateModelOutput(llmResponse.rawText, {
      protectedRegionText: protectedRegionResult.region.text
    });
    if (!validation.ok) {
      return {
        kind: "validation-failed",
        errors: validation.errors
      };
    }
    const parsedFrontmatter = parseFrontmatter(lookup.note.content);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const session = {
      id: createSessionId(),
      workflowProfileId: "raw-refined",
      policySnapshotId: `${this.profile.id}:${this.profile.version}`,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      createdAt: now,
      updatedAt: now,
      baseFileHash: hashText(lookup.note.content),
      ...parsedFrontmatter.hasFrontmatter ? { baseFrontmatterHash: hashText(JSON.stringify(parsedFrontmatter.frontmatter)) } : {},
      baseProtectedRegionHash: hashText(protectedRegionResult.region.text),
      proposal: validation.proposal,
      tokenUsage: this.tokenUsageReporter.resolveUsage({
        provider: this.llmProvider.providerId,
        model: this.llmProvider.model,
        inputText: `${systemPrompt}
${userPrompt}`,
        outputText: llmResponse.rawText,
        providerUsage: llmResponse.usage
      }),
      status: "generated"
    };
    await this.sessionStore.save(session);
    return {
      kind: "created",
      session
    };
  }
  // ── v0.2.0 pipeline (retry + session/error cache) ──
  async executeV2() {
    const activeNote = await this.eligibilityUseCase.execute();
    if (!activeNote.hasActiveMarkdownNote || !activeNote.eligible) {
      return { kind: "eligibility-failed", eligibility: activeNote };
    }
    const lookup = await this.noteRepository.getActiveNote();
    if (lookup.kind !== "markdown") {
      return { kind: "eligibility-failed", eligibility: activeNote };
    }
    const bBlockExtract = this.blockExtractor.extract(
      lookup.note.content,
      this.settings.bBlock
    );
    if (!bBlockExtract.ok) {
      return {
        kind: "validation-failed",
        errors: [{
          layer: "content",
          code: bBlockExtract.error.code,
          message: bBlockExtract.error.message
        }]
      };
    }
    if (!this.llmProvider.generateProposalV2) {
      return {
        kind: "validation-failed",
        errors: [{
          layer: "schema",
          code: "v2-not-supported",
          message: "Provider does not support v0.2 proposal generation."
        }]
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
      tagPrompt: this.settings.tagPrompt
    });
    void _debug;
    const errorSessionId = `error-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ctx = {
      request,
      noteContent: lookup.note.content,
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      bBlockText: bBlockExtract.block.text,
      errorSessionId
    };
    const retryResult = await this.retryRunner.run(async (attemptIndex) => {
      return this.runSingleAttempt(ctx, attemptIndex);
    });
    if (retryResult.status === "success") {
      return this.handleRetrySuccess(retryResult.session, retryResult.failedAttempts, retryResult.attemptsUsed);
    }
    return this.handleRetryExhausted(retryResult.failedAttempts);
  }
  async runSingleAttempt(ctx, attemptIndex) {
    let llmResponse;
    try {
      llmResponse = await this.llmProvider.generateProposalV2(ctx.request);
    } catch (error51) {
      const failedAttempt = this.buildFailedAttempt(
        ctx,
        attemptIndex,
        `Provider call failed: ${toSafeErrorMessage(error51)}`,
        void 0,
        void 0,
        {}
      );
      return { success: false, attempt: failedAttempt };
    }
    const zodValidation = this.proposalValidator.validateV2Output(llmResponse.rawText);
    if (!zodValidation.ok) {
      const failedAttempt = this.buildFailedAttempt(
        ctx,
        attemptIndex,
        "Zod validation failed: proposal does not match v0.2 schema.",
        llmResponse,
        llmResponse.usage,
        { zodError: zodValidation.zodError }
      );
      return { success: false, attempt: failedAttempt };
    }
    const normalizer = new ProposalNormalizer();
    const normalized = normalizer.normalize(zodValidation.proposal, this.settings);
    if (normalized.validation.status === "invalid") {
      const failedAttempt = this.buildFailedAttempt(
        ctx,
        attemptIndex,
        "Normalization invalid: no acceptable blocks after filtering.",
        llmResponse,
        llmResponse.usage,
        { normalizationReport: normalized.validation }
      );
      return { success: false, attempt: failedAttempt };
    }
    const parsedFrontmatter = parseFrontmatter(ctx.noteContent);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const session = {
      id: createSessionId(),
      workflowProfileId: "raw-refined",
      schemaVersion: "0.2",
      createdAt: now,
      updatedAt: now,
      notePath: ctx.notePath,
      noteTitle: ctx.noteTitle,
      baseFileHash: hashText(ctx.noteContent),
      ...parsedFrontmatter.hasFrontmatter ? { baseFrontmatterHash: hashText(JSON.stringify(parsedFrontmatter.frontmatter)) } : {},
      baseBBlockHash: hashText(ctx.bBlockText),
      blockConfigSnapshot: {
        protectH1: this.settings.protectH1,
        aBlocks: this.settings.aBlocks,
        bBlock: this.settings.bBlock,
        tagWhitelist: this.settings.tagWhitelist
      },
      proposal: {
        workflowProfileId: "raw-refined",
        schemaVersion: "0.2",
        blocks: normalized.blocks,
        tagSuggestion: normalized.tagSuggestion.selectedTags.length > 0 || normalized.tagSuggestion.newTagSuggestions.length > 0 ? normalized.tagSuggestion : void 0,
        frontmatterSuggestion: normalized.frontmatterSuggestion
      },
      validation: normalized.validation,
      tokenUsage: this.tokenUsageReporter.resolveUsage({
        provider: this.llmProvider.providerId,
        model: this.llmProvider.model,
        inputText: ctx.request.messages.map((m) => m.content).join("\n"),
        outputText: llmResponse.rawText,
        providerUsage: llmResponse.usage
      }),
      status: "generated",
      source: {
        provider: this.llmProvider.providerId,
        model: this.llmProvider.model,
        attemptsUsed: attemptIndex
      }
    };
    return { success: true, session };
  }
  buildFailedAttempt(ctx, attemptIndex, errorSummary, llmResponse, providerUsage, validationSnapshotOverrides) {
    const responseSnapshot = llmResponse ? {
      rawText: llmResponse.rawText,
      extractedJsonText: void 0,
      parsedJson: llmResponse.parsedJson,
      usage: providerUsage != null ? providerUsage : llmResponse.usage
    } : void 0;
    return {
      id: `${ctx.errorSessionId}-attempt-${attemptIndex}`,
      errorSessionId: ctx.errorSessionId,
      attemptIndex,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
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
        tagWhitelist: this.settings.tagWhitelist
      },
      requestSnapshot: {
        messages: ctx.request.messages,
        schemaName: ctx.request.schemaName,
        schemaVersion: ctx.request.schemaVersion,
        metadata: ctx.request.metadata
      },
      responseSnapshot,
      validationSnapshot: validationSnapshotOverrides ? {
        jsonExtractionError: typeof validationSnapshotOverrides.jsonExtractionError === "string" ? validationSnapshotOverrides.jsonExtractionError : void 0,
        zodError: validationSnapshotOverrides.zodError,
        normalizationReport: validationSnapshotOverrides.normalizationReport,
        policyErrors: validationSnapshotOverrides.policyErrors
      } : void 0,
      errorSummary
    };
  }
  async handleRetrySuccess(session, failedAttempts, attemptsUsed) {
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
    const noticePlan = {
      attemptsUsed,
      maxAttempts: 3,
      errorCacheWritten,
      errorCacheDisabled: !this.errorSessionCache,
      errorCachePath: this.errorSessionCache ? ERROR_SESSION_CACHE_DISPLAY_PATH : void 0
    };
    return { kind: "created-v2", session, noticePlan };
  }
  async handleRetryExhausted(failedAttempts) {
    let errorCacheWritten = false;
    if (this.errorSessionCache) {
      for (const attempt of failedAttempts) {
        await this.errorSessionCache.save(attempt);
      }
      errorCacheWritten = true;
    }
    const noticePlan = {
      attemptsUsed: 3,
      maxAttempts: 3,
      errorCacheWritten,
      errorCacheDisabled: !this.errorSessionCache,
      errorCachePath: this.errorSessionCache ? ERROR_SESSION_CACHE_DISPLAY_PATH : void 0
    };
    return { kind: "exhausted", failedAttempts, noticePlan };
  }
};
function createSessionId() {
  return `proposal-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function renderPromptTemplate(template, variables) {
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (_match, name) => {
    var _a5;
    return (_a5 = variables[name]) != null ? _a5 : `{{${name}}}`;
  });
}

// src/core/profile/rawRefinedProfile.ts
var rawRefinedProfile = {
  id: "raw-refined",
  name: "Raw Refined",
  version: "0.1.0",
  eligibility: {
    requiredExtension: "md",
    requireFrontmatter: true,
    requiredStatus: "raw",
    requiredHeading: "## \u539F\u59CB\u5185\u5BB9"
  },
  protectedRegions: {
    definitions: [
      {
        id: "original-content",
        heading: "## \u539F\u59CB\u5185\u5BB9",
        mode: "from-heading-to-end",
        required: true,
        preserveExactText: true
      }
    ]
  },
  outputSections: {
    required: ["summary", "coreQuestion", "currentConclusion", "reasoning"],
    optional: ["scope", "nextSteps", "refineNote"]
  },
  frontmatter: {
    allowedFields: ["status", "created", "source", "context"],
    readonlyFields: ["created"],
    confirmRequiredFields: ["status", "source", "context"],
    forbiddenFields: ["ai", "type", "subtype", "domain", "topic", "confidence", "verified", "updated"]
  },
  tags: {
    mode: "allow-list",
    allowedTags: [
      "#ai/generated",
      "#ai/assisted",
      "#ai/reviewed",
      "#ai/suggested",
      "#todo/refine",
      "#todo/link",
      "#todo/review",
      "#flag/core",
      "#flag/sensitive"
    ],
    blockedTags: ["#raw", "#refined", "#self", "#external", "#practice", "#rel/*"]
  },
  prompt: {
    systemPrompt: [
      "You are generating a raw-refined proposal for an Obsidian note.",
      "Return JSON only.",
      "Do not include any text outside JSON.",
      "Never include or rewrite the protected heading ## \u539F\u59CB\u5185\u5BB9 or any protected-region content.",
      "Use this schema:",
      '{"workflowProfileId":"raw-refined","refinedSections":{"summary":"string","coreQuestion":"string","currentConclusion":"string","reasoning":"string","scope":"string?","nextSteps":"string?","refineNote":"string?"},"frontmatterSuggestion":{"status":"refined","source":["self|external|practice"],"context":["string"]},"tagSuggestion":{"add":["string"],"remove":["string"]},"warnings":["string"]}'
    ].join("\n"),
    userPrompt: [
      "Refine the current note into the approved raw-refined structure.",
      "notePath: {{notePath}}",
      "noteTitle: {{noteTitle}}",
      "noteContent:",
      "{{noteContent}}"
    ].join("\n")
  },
  proposalSchema: {
    workflowProfileId: "raw-refined"
  },
  review: {
    required: true,
    defaultChannel: "obsidian-ui",
    allowApplyWithoutReview: false
  },
  apply: {
    requireFreshnessCheck: true,
    preserveProtectedRegions: true,
    requireApplyPlan: true,
    allowPartialApply: true,
    onConflict: "block-and-offer-draft"
  },
  capabilities: {
    body: true,
    frontmatter: true,
    tags: true,
    rename: false,
    move: false,
    links: false,
    moc: false,
    archive: false,
    delete: false
  }
};

// src/application/ListRecoverableSessionsUseCase.ts
var ListRecoverableSessionsUseCase = class {
  constructor(sessionStore, noteRepository) {
    this.sessionStore = sessionStore;
    this.noteRepository = noteRepository;
    this.extractor = new ProtectedRegionExtractor();
  }
  async execute() {
    const activeNote = await this.noteRepository.getActiveNote();
    if (activeNote.kind !== "markdown") {
      return { sessions: [], notePath: null };
    }
    const sessions = await this.sessionStore.listSessionsForNote(activeNote.note.path);
    const recoverable = [];
    for (const summary of sessions) {
      const session = await this.sessionStore.get(summary.id);
      if (!session) continue;
      if (session.status === "discarded") continue;
      const freshness = this.computeFreshness(session, activeNote.note.content);
      recoverable.push({
        id: session.id,
        notePath: session.notePath,
        noteTitle: session.noteTitle,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        workflowProfileId: session.workflowProfileId,
        tokenUsage: session.tokenUsage,
        warnings: session.proposal.warnings,
        summary: session.proposal.refinedSections.summary,
        currentConclusion: session.proposal.refinedSections.currentConclusion,
        freshness
      });
    }
    return {
      sessions: recoverable,
      notePath: activeNote.note.path
    };
  }
  computeFreshness(session, currentContent) {
    const currentFileHash = hashText(currentContent);
    if (currentFileHash !== session.baseFileHash) {
      return "stale-file";
    }
    if (session.baseProtectedRegionHash) {
      const region = this.extractor.extract(
        currentContent,
        rawRefinedProfile.protectedRegions.definitions[0]
      );
      if (region.ok) {
        const currentRegionHash = hashText(region.region.text);
        if (currentRegionHash !== session.baseProtectedRegionHash) {
          return "stale-region";
        }
      }
    }
    return "fresh";
  }
};

// src/application/OpenCachedSessionUseCase.ts
var OpenCachedSessionUseCase = class {
  constructor(sessionCache) {
    this.sessionCache = sessionCache;
  }
  async list() {
    const sessions = await this.sessionCache.loadAll();
    return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((session) => ({
      id: session.id,
      notePath: session.notePath,
      noteTitle: session.noteTitle,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      status: session.status,
      provider: session.source.provider,
      model: session.source.model,
      attemptsUsed: session.source.attemptsUsed,
      tokenUsage: session.tokenUsage
    }));
  }
  async open(sessionId) {
    var _a5;
    const sessions = await this.sessionCache.loadAll();
    return (_a5 = sessions.find((session) => session.id === sessionId)) != null ? _a5 : null;
  }
};

// src/application/RecoverProposalSessionUseCase.ts
var RecoverProposalSessionUseCase = class {
  constructor(sessionStore, noteRepository) {
    this.sessionStore = sessionStore;
    this.noteRepository = noteRepository;
    this.extractor = new ProtectedRegionExtractor();
  }
  async execute(sessionId) {
    const session = await this.sessionStore.get(sessionId);
    if (!session) return null;
    const activeNote = await this.noteRepository.getActiveNote();
    if (activeNote.kind !== "markdown") {
      return { kind: "stale", session, reason: "note-unavailable" };
    }
    if (activeNote.note.path !== session.notePath) {
      return { kind: "stale", session, reason: "note-unavailable" };
    }
    const currentContent = activeNote.note.content;
    const currentFileHash = hashText(currentContent);
    if (currentFileHash !== session.baseFileHash) {
      return { kind: "stale", session, reason: "file-changed" };
    }
    if (session.baseProtectedRegionHash) {
      const region = this.extractor.extract(
        currentContent,
        rawRefinedProfile.protectedRegions.definitions[0]
      );
      if (region.ok) {
        const currentRegionHash = hashText(region.region.text);
        if (currentRegionHash !== session.baseProtectedRegionHash) {
          return { kind: "stale", session, reason: "region-changed" };
        }
      } else {
        return { kind: "stale", session, reason: "region-changed" };
      }
    }
    return { kind: "fresh", session };
  }
};

// src/application/RequestReviewUseCase.ts
var RequestReviewUseCase = class {
  constructor(reviewGate) {
    this.reviewGate = reviewGate;
  }
  async execute(session) {
    return this.reviewGate.requestReview(session);
  }
};

// src/application/SaveDraftUseCase.ts
var SaveDraftUseCase = class {
  constructor(sessionStore, noteFilePort, settings, sessionCacheV2) {
    this.sessionStore = sessionStore;
    this.noteFilePort = noteFilePort;
    this.settings = settings;
    this.sessionCacheV2 = sessionCacheV2;
  }
  async execute(sessionId, conflictReason, editedRefinedSections) {
    var _a5, _b, _c;
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return {
        saved: false,
        message: `Proposal session ${sessionId} was not found.`
      };
    }
    const fileName = `${sanitizeFileName(session.noteTitle)}-${session.id}.md`;
    const draftPath = `${this.settings.draftFolder}/${fileName}`;
    const refinedSections = editedRefinedSections != null ? editedRefinedSections : session.proposal.refinedSections;
    const content = [
      `# Refined Layer Draft`,
      ``,
      `- source note path: ${session.notePath}`,
      `- workflow id: ${session.workflowProfileId}`,
      `- created time: ${session.createdAt}`,
      `- token usage: ${(_b = (_a5 = session.tokenUsage) == null ? void 0 : _a5.countingMode) != null ? _b : "unavailable"}`,
      ...conflictReason ? [`- conflict reason: ${conflictReason}`] : [],
      ``,
      `## Proposed Sections`,
      ``,
      ...Object.entries(refinedSections).flatMap(([key, value]) => value ? [`### ${key}`, String(value), ``] : []),
      `## Warnings`,
      ``,
      ...((_c = session.proposal.warnings) == null ? void 0 : _c.length) ? session.proposal.warnings : ["none"],
      ``
    ].join("\n");
    await this.noteFilePort.writeDraft(draftPath, content);
    session.status = "saved_as_draft";
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.sessionStore.save(session);
    return {
      saved: true,
      draftPath
    };
  }
  async executeV2(sessionId, decision) {
    var _a5;
    const session = await this.findSessionV2(sessionId);
    if (!session) {
      return {
        saved: false,
        message: `Proposal session ${sessionId} was not found.`
      };
    }
    const fileName = `${sanitizeFileName(session.noteTitle)}-${session.id}.md`;
    const draftPath = `${this.settings.draftFolder}/${fileName}`;
    const content = redactSensitiveText(buildV2DraftContent(session, decision));
    await this.noteFilePort.writeDraft(draftPath, content);
    session.status = "saved_as_draft";
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await ((_a5 = this.sessionCacheV2) == null ? void 0 : _a5.save(session));
    return {
      saved: true,
      draftPath
    };
  }
  async findSessionV2(sessionId) {
    var _a5, _b;
    const sessions = await ((_a5 = this.sessionCacheV2) == null ? void 0 : _a5.loadAll());
    return (_b = sessions == null ? void 0 : sessions.find((session) => session.id === sessionId)) != null ? _b : null;
  }
};
function sanitizeFileName(value) {
  return value.replace(/[<>:"/\\|?*]/g, "-");
}
function buildV2DraftContent(session, decision) {
  var _a5, _b, _c, _d, _e, _f;
  const selectedTags = (_b = (_a5 = session.proposal.tagSuggestion) == null ? void 0 : _a5.selectedTags) != null ? _b : [];
  const newTagSuggestions = (_d = (_c = session.proposal.tagSuggestion) == null ? void 0 : _c.newTagSuggestions) != null ? _d : [];
  return [
    `# Refined Layer Draft`,
    ``,
    `- source note path: ${session.notePath}`,
    `- workflow id: ${session.workflowProfileId}`,
    `- schema version: ${session.schemaVersion}`,
    `- created time: ${session.createdAt}`,
    `- token usage: ${(_f = (_e = session.tokenUsage) == null ? void 0 : _e.countingMode) != null ? _f : "unavailable"}`,
    `- attempts used: ${session.source.attemptsUsed}`,
    ``,
    `## Proposed A Blocks`,
    ``,
    ...session.proposal.blocks.flatMap((block) => {
      var _a6;
      return [
        `### ${block.id}`,
        `accepted in review: ${(decision == null ? void 0 : decision.acceptBlocks[block.id]) === true ? "yes" : "no"}`,
        ``,
        block.content,
        ``,
        ...((_a6 = block.warnings) == null ? void 0 : _a6.length) ? [`warnings:`, ...block.warnings.map((warning) => `- ${warning}`), ``] : []
      ];
    }),
    `## Selected Tags`,
    ``,
    ...selectedTags.length ? selectedTags.map((tag) => `- ${tag}${(decision == null ? void 0 : decision.acceptTags.add.includes(tag)) ? " (accepted)" : ""}`) : ["none"],
    ``,
    `## New Tag Suggestions`,
    ``,
    ...newTagSuggestions.length ? newTagSuggestions.map((tag) => `- ${tag}`) : ["none"],
    ``,
    `## Validation`,
    ``,
    `- status: ${session.validation.status}`,
    `- tagNormalizationApplied: ${session.validation.tagNormalizationApplied}`,
    ``,
    `### Warnings`,
    ``,
    ...session.validation.warnings.length ? session.validation.warnings.map((warning) => `- ${warning}`) : ["none"],
    ``,
    `### Rejected Fields`,
    ``,
    ...session.validation.rejectedFields.length ? session.validation.rejectedFields.map((field) => `- ${field.field}: ${field.reason}`) : ["none"],
    ``
  ].join("\n");
}

// src/runtime/ProposalSessionStore.ts
var DEFAULT_HISTORY_LIMIT = 5;
var ProposalSessionStore = class {
  constructor(historyLimit = DEFAULT_HISTORY_LIMIT, persistence) {
    this.sessionsById = /* @__PURE__ */ new Map();
    this.sessionsByNotePath = /* @__PURE__ */ new Map();
    this.historyLimit = historyLimit;
    this.persistence = persistence;
  }
  setHistoryLimit(historyLimit) {
    this.historyLimit = historyLimit;
    for (const [notePath, sessions] of this.sessionsByNotePath.entries()) {
      const trimmed = sessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, this.historyLimit);
      this.sessionsByNotePath.set(notePath, trimmed);
      const keptIds = new Set(trimmed.map((session) => session.id));
      for (const session of sessions) {
        if (!keptIds.has(session.id)) {
          this.sessionsById.delete(session.id);
        }
      }
    }
    this.persistIfNeeded();
  }
  async save(session) {
    var _a5;
    this.sessionsById.set(session.id, session);
    const existing = (_a5 = this.sessionsByNotePath.get(session.notePath)) != null ? _a5 : [];
    const withoutCurrent = existing.filter((item) => item.id !== session.id);
    const next = [session, ...withoutCurrent].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, this.historyLimit);
    this.sessionsByNotePath.set(session.notePath, next);
    const preservedIds = new Set(next.map((item) => item.id));
    for (const previous of withoutCurrent) {
      if (!preservedIds.has(previous.id)) {
        this.sessionsById.delete(previous.id);
      }
    }
    await this.persistIfNeeded();
  }
  async get(sessionId) {
    var _a5;
    return (_a5 = this.sessionsById.get(sessionId)) != null ? _a5 : null;
  }
  async getLatestSessionForNote(notePath) {
    var _a5, _b;
    const sessions = (_a5 = this.sessionsByNotePath.get(notePath)) != null ? _a5 : [];
    return (_b = sessions[0]) != null ? _b : null;
  }
  async listSessionsForNote(notePath) {
    var _a5;
    const sessions = (_a5 = this.sessionsByNotePath.get(notePath)) != null ? _a5 : [];
    return sessions.map((session) => ({
      id: session.id,
      notePath: session.notePath,
      noteTitle: session.noteTitle,
      status: session.status,
      updatedAt: session.updatedAt
    }));
  }
  async restoreFromDisk() {
    if (!this.persistence) return;
    const loaded = await this.persistence.loadAll();
    this.sessionsById.clear();
    this.sessionsByNotePath.clear();
    for (const [notePath, sessions] of loaded.entries()) {
      const trimmed = sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, this.historyLimit);
      this.sessionsByNotePath.set(notePath, trimmed);
      for (const session of trimmed) {
        this.sessionsById.set(session.id, session);
      }
    }
  }
  async updateSessionStatus(sessionId, status) {
    const session = this.sessionsById.get(sessionId);
    if (!session) return;
    session.status = status;
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.persistIfNeeded();
  }
  async updateSessionDecision(sessionId, decision) {
    const session = this.sessionsById.get(sessionId);
    if (!session) return;
    session.decision = decision;
    session.status = "reviewing";
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.persistIfNeeded();
  }
  async persistIfNeeded() {
    if (!this.persistence) return;
    try {
      await this.persistence.saveAll(new Map(this.sessionsByNotePath));
    } catch (error51) {
      console.warn(
        "[Obsidian-Refined-Layer] Session persistence failed:",
        toSafeErrorMessage(error51)
      );
    }
  }
};

// src/settings/ProviderConfig.ts
var PROVIDER_PRESETS = {
  mock: {
    type: "mock",
    requiresSecret: false,
    allowsBaseUrlEdit: false
  },
  "openai-compatible": {
    type: "openai-compatible",
    defaultModel: "gpt-4.1-mini",
    defaultSecretRef: "obsidian-refined-layer-openai",
    defaultBaseUrl: "https://api.openai.com/v1",
    requiresSecret: true,
    allowsBaseUrlEdit: false
  },
  deepseek: {
    type: "deepseek",
    defaultModel: "deepseek-v4-flash",
    defaultSecretRef: "obsidian-refined-layer-deepseek",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    requiresSecret: true,
    allowsBaseUrlEdit: false
  },
  "custom-openai-compatible": {
    type: "custom-openai-compatible",
    defaultSecretRef: "obsidian-refined-layer-custom",
    defaultBaseUrl: "https://your-provider.example.com/v1",
    requiresSecret: true,
    allowsBaseUrlEdit: true
  },
  "local-openai-compatible": {
    type: "local-openai-compatible",
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    requiresSecret: false,
    allowsBaseUrlEdit: true
  }
};
function getProviderPreset(type) {
  return PROVIDER_PRESETS[type];
}
function getDefaultProviderSettings(type) {
  const preset = getProviderPreset(type);
  return {
    type,
    ...preset.defaultModel ? { model: preset.defaultModel } : {},
    ...preset.defaultSecretRef ? { secretRef: preset.defaultSecretRef } : {},
    ...preset.defaultBaseUrl ? { baseUrl: preset.defaultBaseUrl } : {}
  };
}

// src/ui/i18n/en.ts
var enStrings = {
  "review.title": "Refined Proposal Review",
  "review.noteMeta": "{title} \xB7 {path}",
  "review.section.body": "Editable refined body",
  "review.section.frontmatter": "YAML suggestions",
  "review.section.tags": "Tag suggestions",
  "review.section.newTagSuggestions": "New tag suggestions",
  "review.section.tokenUsage": "Token Usage",
  "review.section.warnings": "Warnings",
  "review.section.validation": "Validation",
  "review.empty.none": "None",
  "review.toggle.body": "Accept body changes",
  "review.toggle.block": "Apply block: {heading}",
  "review.toggle.frontmatter.status": "Accept status change",
  "review.toggle.frontmatter.source": "Accept source change",
  "review.toggle.frontmatter.context": "Accept context change",
  "review.toggle.tag.add": "Accept added tag: {tag}",
  "review.toggle.tag.remove": "Accept removed tag: {tag}",
  "review.notice.tagNormalizationApplied": "Tag fields were normalized locally.",
  "review.notice.newTagSuggestions": "These are new tag suggestions. Add them to the tag whitelist before applying them.",
  "review.meta.attemptsUsed": "Requests used: {attemptsUsed}",
  "review.button.apply": "Apply selected changes",
  "review.button.saveDraft": "Save as Draft",
  "review.button.close": "Close",
  "review.token.unavailable": "unavailable",
  "review.token.summary": "{provider} / {model} / {mode} / total: {total}",
  "review.placeholder.saveDraft": "Save as Draft is still a placeholder callback and will not write any files.",
  "review.placeholder.apply": "Only generated UserDecision, no files were written: {decision}",
  "review.placeholder.cancel": "Review modal closed.",
  "settings.title.providerType": "Provider type",
  "settings.title.providerModel": "Provider model",
  "settings.title.baseUrl": "API base URL",
  "settings.title.secretRef": "Secret reference",
  "settings.title.apiKey": "API key",
  "settings.title.secretDiagnostics": "SecretStorage diagnostics",
  "settings.title.language": "Language",
  "settings.title.historyLimit": "Cache record limit",
  "settings.title.sessionCache": "Cache records",
  "settings.title.sessionCacheLimit": "Cache record limit",
  "settings.title.sessionCacheLocation": "Cache content location",
  "settings.title.openSessionCache": "View cache records",
  "settings.title.errorSessionCache": "Error session cache",
  "settings.title.errorSessionCacheLimit": "Error session cache limit",
  "settings.title.errorSessionCacheLocation": "Error session cache location",
  "settings.title.draftFolder": "Draft folder",
  "settings.title.promptProfile": "Prompt Override Profile",
  "settings.title.systemPrompt": "System Prompt Override",
  "settings.title.userPrompt": "User Prompt Override",
  "settings.desc.language": "Switch the plugin UI language.",
  "settings.desc.historyLimit": "Maximum saved cache records.",
  "settings.desc.sessionCache": "Cache records restore recent proposal review state. They are not long-term history or user-visible notes.",
  "settings.desc.sessionCacheLimit": "Maximum saved cache records.",
  "settings.desc.openSessionCache": "Open the cache record viewer. Cached sessions can be viewed and saved as drafts, but not applied directly.",
  "settings.desc.errorSessionCache": "Save failed generation attempts for debugging. Error session cache is separate from proposal cache records.",
  "settings.desc.errorSessionCacheLimit": "Maximum failed attempts to keep. Default: {defaultLimit}.",
  "settings.desc.cachePrivacy": "Cache records do not save API keys, Authorization headers, or provider secrets.",
  "settings.desc.draftFolder": "Output folder for Save as Draft.",
  "settings.desc.promptProfile": "Only raw-refined prompt override is supported.",
  "settings.desc.promptVariables": "Available variables: {{notePath}} {{noteTitle}} {{noteContent}}",
  "settings.desc.systemPrompt": "Advanced override only. No highlighting or advanced validation.",
  "settings.desc.userPrompt": "Advanced override only. No highlighting or advanced validation.",
  "settings.desc.providerType": "Choose where the model call should go.",
  "settings.desc.providerModel": "Enter the model name to call.",
  "settings.desc.baseUrl": "Only needed for custom or local providers. Usually stop at `/v1`.",
  "settings.desc.secretRef": "Secure storage name for the API key. `data.json` stores only this name.",
  "settings.desc.apiKey": "Saved only to Obsidian SecretStorage, never to plugin settings.",
  "settings.desc.secretDiagnostics": "Expand only when debugging SecretStorage issues.",
  "settings.warning.secretUnavailable": "This environment does not support secure secret storage. Direct LLM calls are disabled and the plugin will fall back to mock-llm.",
  "settings.placeholder.apiKeyUnavailable": "SecretStorage is not exposed in this runtime, so API key input is disabled",
  "settings.placeholder.model.openai-compatible": "Example: gpt-4.1-mini",
  "settings.placeholder.model.deepseek": "Example: deepseek-v4-flash",
  "settings.placeholder.model.custom-openai-compatible": "Enter a model supported by your service",
  "settings.placeholder.model.local-openai-compatible": "Example: qwen2.5:7b, gpt-oss, local-model",
  "settings.placeholder.baseUrl.custom-openai-compatible": "Example: https://your-provider.example.com/v1",
  "settings.placeholder.baseUrl.local-openai-compatible": "Example: http://127.0.0.1:11434/v1",
  "settings.placeholder.secretRef.openai-compatible": "Example: obsidian-refined-layer-openai",
  "settings.placeholder.secretRef.deepseek": "Example: obsidian-refined-layer-deepseek",
  "settings.placeholder.secretRef.custom-openai-compatible": "Example: obsidian-refined-layer-custom",
  "settings.help.provider.mock": "Local mock flow only. No external API call. Good for checking eligibility, review, and apply.",
  "settings.help.provider.openai-compatible": "Connect to the official OpenAI API. You only need model, secret reference, and API key.",
  "settings.help.provider.deepseek": "Connect to the official DeepSeek OpenAI-compatible API. `deepseek-v4-flash` is the recommended default.",
  "settings.help.provider.custom-openai-compatible": "Connect to any remote service that supports OpenAI Chat Completions. Requires model, base URL, and API key.",
  "settings.help.provider.local-openai-compatible": "Connect to a local OpenAI-compatible server such as Ollama, LM Studio, or vLLM. API key is usually not required.",
  "settings.option.language.zh-CN": "Simplified Chinese",
  "settings.option.language.en": "English",
  "settings.option.provider.mock": "Mock",
  "settings.option.provider.openai": "OpenAI",
  "settings.option.provider.deepseek": "DeepSeek",
  "settings.option.provider.custom": "Custom compatible service",
  "settings.option.provider.local": "Local compatible service",
  "settings.button.openSessionCache": "View cache records",
  "notice.review.reopened": "Reopened last proposal: {sessionId} \xB7 {title} \xB7 token usage {mode}",
  "notice.review.noSession": "No saved proposal session for the current note: {path}",
  "notice.provider.downgradedMock": "Secure secret storage is unavailable. Falling back to mock-llm.",
  "notice.provider.missingModel": "{provider} requires a model name.",
  "notice.provider.missingBaseUrl": "{provider} requires an API base URL.",
  "notice.provider.missingSecretRef": "{provider} requires a secret reference.",
  "notice.provider.missingApiKey": "No API key is stored for {provider}.",
  "notice.provider.secretSaved": "API key saved to secure secret storage.",
  "notice.provider.secretBlocked": "Cannot save API key because secure secret storage is unavailable.",
  "notice.provider.secretInvalidRef": "Secret reference must use lowercase letters, numbers, and dashes only.",
  "notice.provider.error": "Provider error: {message}",
  "notice.v2.retry.success": "Refined Layer: generation succeeded after {attemptsUsed}/{maxAttempts} requests.",
  "notice.v2.retry.failure": "Refined Layer: generation used {attemptsUsed}/{maxAttempts} requests and did not produce a reviewable proposal.",
  "notice.v2.errorCache.saved": "Refined Layer: failed attempts were saved to cache records: {path}",
  "notice.v2.errorCache.disabled": "Refined Layer: error cache is disabled, so failed sessions were not saved.",
  "sessionPicker.title": "Recoverable Proposal Sessions",
  "sessionPicker.freshness.fresh": "Fresh",
  "sessionPicker.freshness.stale-file": "File changed",
  "sessionPicker.freshness.stale-region": "Protected region changed",
  "sessionPicker.freshness.unknown": "Unknown",
  "sessionPicker.button.continue": "Continue review",
  "sessionPicker.button.manualCopy": "Manual copy",
  "sessionPicker.button.regenerate": "Regenerate",
  "sessionPicker.button.discard": "Discard",
  "sessionPicker.button.cancel": "Cancel",
  "sessionPicker.empty": "No recoverable proposal sessions for this note.",
  "sessionPicker.sessionMeta": "{createdAt} \xB7 {status} \xB7 token {mode}",
  "sessionPicker.conflict": "File has changed: {reason}. Cannot apply directly.",
  "cachedSessionPicker.title": "Open cached proposal session",
  "cachedSessionPicker.empty": "No cache records are available.",
  "cachedSessionPicker.button.open": "Open cache record",
  "cachedSessionPicker.sessionMeta": "{createdAt} \xB7 {status} \xB7 {provider}/{model} \xB7 requests {attemptsUsed} \xB7 token {mode}",
  "notice.cachedSession.notFound": "Cache record not found.",
  "notice.cachedSession.applyDisabled": "Cache records can be viewed and saved as drafts, but cannot be applied directly.",
  "notice.cachedSession.draftPending": "Cached session draft export will be wired in D58.",
  "eligibility.missingBBlock": "Missing B block heading",
  "eligibility.multipleBBlock": "B block heading appears multiple times",
  "eligibility.bBlockLevelMismatch": "B block heading level mismatch",
  "eligibility.emptyBBlock": "B block content is empty",
  "eligibility.invalidABlockConfig": "Invalid A block configuration"
};

// src/ui/i18n/zh-CN.ts
var zhCNStrings = {
  "review.title": "Refined Proposal \u5BA1\u6838",
  "review.noteMeta": "{title} \xB7 {path}",
  "review.section.body": "Refined \u6B63\u6587\u7F16\u8F91",
  "review.section.frontmatter": "YAML \u4FEE\u6539\u5EFA\u8BAE",
  "review.section.tags": "\u6807\u7B7E\u4FEE\u6539\u5EFA\u8BAE",
  "review.section.newTagSuggestions": "\u65B0\u6807\u7B7E\u5EFA\u8BAE",
  "review.section.tokenUsage": "Token Usage",
  "review.section.warnings": "Warnings",
  "review.section.validation": "Validation",
  "review.empty.none": "\u65E0",
  "review.toggle.body": "\u63A5\u53D7\u6B63\u6587\u4FEE\u6539",
  "review.toggle.block": "\u5E94\u7528\u5206\u5757\uFF1A{heading}",
  "review.toggle.frontmatter.status": "\u63A5\u53D7 status \u4FEE\u6539",
  "review.toggle.frontmatter.source": "\u63A5\u53D7 source \u4FEE\u6539",
  "review.toggle.frontmatter.context": "\u63A5\u53D7 context \u4FEE\u6539",
  "review.toggle.tag.add": "\u63A5\u53D7\u65B0\u589E\u6807\u7B7E\uFF1A{tag}",
  "review.toggle.tag.remove": "\u63A5\u53D7\u79FB\u9664\u6807\u7B7E\uFF1A{tag}",
  "review.notice.tagNormalizationApplied": "\u6807\u7B7E\u5B57\u6BB5\u5DF2\u5728\u672C\u5730\u505A\u89C4\u8303\u5316\u5904\u7406\u3002",
  "review.notice.newTagSuggestions": "\u8FD9\u4E9B\u662F\u65B0\u6807\u7B7E\u5EFA\u8BAE\u3002\u82E5\u8981\u4F7F\u7528\uFF0C\u8BF7\u5148\u5C06\u5176\u52A0\u5165 Tag \u767D\u540D\u5355\u3002",
  "review.meta.attemptsUsed": "\u8BF7\u6C42\u6B21\u6570\uFF1A{attemptsUsed}",
  "review.button.apply": "Apply selected changes",
  "review.button.saveDraft": "Save as Draft",
  "review.button.close": "\u5173\u95ED",
  "review.token.unavailable": "unavailable",
  "review.token.summary": "{provider} / {model} / {mode} / total: {total}",
  "review.placeholder.saveDraft": "Save as Draft \u4ECD\u4E3A\u5360\u4F4D\u56DE\u8C03\uFF0C\u5F53\u524D\u4E0D\u4F1A\u5199\u5165\u6587\u4EF6\u3002",
  "review.placeholder.apply": "\u5F53\u524D\u53EA\u751F\u6210 UserDecision\uFF0C\u4E0D\u5199\u5165\u6587\u4EF6\uFF1A{decision}",
  "review.placeholder.cancel": "\u5DF2\u5173\u95ED\u5BA1\u6838\u7A97\u53E3\u3002",
  "settings.title.providerType": "Provider \u7C7B\u578B",
  "settings.title.providerModel": "Provider \u6A21\u578B",
  "settings.title.baseUrl": "API Base URL",
  "settings.title.secretRef": "Secret Reference",
  "settings.title.apiKey": "API Key",
  "settings.title.secretDiagnostics": "SecretStorage \u8BCA\u65AD",
  "settings.title.language": "\u754C\u9762\u8BED\u8A00",
  "settings.title.historyLimit": "\u7F13\u5B58\u8BB0\u5F55\u6570\u91CF\u4E0A\u9650",
  "settings.title.sessionCache": "\u7F13\u5B58\u8BB0\u5F55",
  "settings.title.sessionCacheLimit": "\u7F13\u5B58\u8BB0\u5F55\u6570\u91CF\u4E0A\u9650",
  "settings.title.sessionCacheLocation": "\u7F13\u5B58\u5185\u5BB9\u4F4D\u7F6E",
  "settings.title.openSessionCache": "\u67E5\u770B\u7F13\u5B58\u8BB0\u5F55",
  "settings.title.errorSessionCache": "\u9519\u8BEF\u4F1A\u8BDD\u7F13\u5B58",
  "settings.title.errorSessionCacheLimit": "\u9519\u8BEF\u4F1A\u8BDD\u7F13\u5B58\u6570\u91CF\u4E0A\u9650",
  "settings.title.errorSessionCacheLocation": "\u9519\u8BEF\u4F1A\u8BDD\u7F13\u5B58\u4F4D\u7F6E",
  "settings.title.draftFolder": "\u8349\u7A3F\u76EE\u5F55",
  "settings.title.promptProfile": "Prompt Override Profile",
  "settings.title.systemPrompt": "System Prompt Override",
  "settings.title.userPrompt": "User Prompt Override",
  "settings.desc.language": "\u5207\u6362\u63D2\u4EF6\u754C\u9762\u8BED\u8A00\u3002",
  "settings.desc.historyLimit": "\u6700\u591A\u4FDD\u7559\u591A\u5C11\u6761\u7F13\u5B58\u8BB0\u5F55\u3002",
  "settings.desc.sessionCache": "\u7F13\u5B58\u8BB0\u5F55\u7528\u4E8E\u6062\u590D\u6700\u8FD1 proposal \u7684\u67E5\u770B\u72B6\u6001\uFF0C\u4E0D\u662F\u957F\u671F\u5386\u53F2\uFF0C\u4E5F\u4E0D\u662F\u6B63\u5F0F\u7B14\u8BB0\u3002",
  "settings.desc.sessionCacheLimit": "\u6700\u591A\u4FDD\u7559\u591A\u5C11\u6761\u7F13\u5B58\u8BB0\u5F55\u3002",
  "settings.desc.openSessionCache": "\u6253\u5F00\u7F13\u5B58\u8BB0\u5F55\u67E5\u770B\u5668\u3002\u7F13\u5B58\u8BB0\u5F55\u4EC5\u53EF\u67E5\u770B\u548C\u4FDD\u5B58\u8349\u7A3F\uFF0C\u4E0D\u80FD\u76F4\u63A5 Apply\u3002",
  "settings.desc.errorSessionCache": "\u4FDD\u5B58\u5931\u8D25\u751F\u6210\u5C1D\u8BD5\uFF0C\u65B9\u4FBF\u6392\u67E5\u95EE\u9898\u3002\u9519\u8BEF\u4F1A\u8BDD\u7F13\u5B58\u4E0E proposal \u7F13\u5B58\u8BB0\u5F55\u5206\u5F00\u4FDD\u5B58\u3002",
  "settings.desc.errorSessionCacheLimit": "\u6700\u591A\u4FDD\u7559\u591A\u5C11\u6761\u5931\u8D25\u5C1D\u8BD5\u3002\u9ED8\u8BA4\uFF1A{defaultLimit}\u3002",
  "settings.desc.cachePrivacy": "\u7F13\u5B58\u8BB0\u5F55\u4E0D\u4FDD\u5B58 API key\u3001Authorization header \u6216 provider secret\u3002",
  "settings.desc.draftFolder": "Save as Draft \u7684\u8F93\u51FA\u76EE\u5F55\u3002",
  "settings.desc.promptProfile": "\u5F53\u524D\u53EA\u652F\u6301 raw-refined \u7684 prompt \u8986\u76D6\u3002",
  "settings.desc.promptVariables": "\u53EF\u7528\u53D8\u91CF\uFF1A{{notePath}} {{noteTitle}} {{noteContent}}",
  "settings.desc.systemPrompt": "\u4EC5\u9650\u9AD8\u7EA7\u7528\u6CD5\uFF1B\u4E0D\u505A\u9AD8\u4EAE\u6216\u590D\u6742\u6821\u9A8C\u3002",
  "settings.desc.userPrompt": "\u4EC5\u9650\u9AD8\u7EA7\u7528\u6CD5\uFF1B\u4E0D\u505A\u9AD8\u4EAE\u6216\u590D\u6742\u6821\u9A8C\u3002",
  "settings.desc.providerType": "\u9009\u62E9\u8981\u8FDE\u63A5\u7684\u6A21\u578B\u6765\u6E90\u3002",
  "settings.desc.providerModel": "\u586B\u5199\u8981\u8C03\u7528\u7684\u6A21\u578B\u540D\u3002",
  "settings.desc.baseUrl": "\u4EC5\u81EA\u5B9A\u4E49/\u672C\u5730 provider \u9700\u8981\u586B\u5199\uFF1B\u901A\u5E38\u5199\u5230 `/v1` \u5373\u53EF\u3002",
  "settings.desc.secretRef": "API key \u7684\u5B89\u5168\u5B58\u50A8\u540D\u3002`data.json` \u53EA\u4FDD\u5B58\u8FD9\u4E2A\u540D\u5B57\uFF0C\u4E0D\u4FDD\u5B58 key\u3002",
  "settings.desc.apiKey": "\u53EA\u5199\u5165 Obsidian SecretStorage\uFF0C\u4E0D\u843D\u76D8\u5230\u63D2\u4EF6\u8BBE\u7F6E\u3002",
  "settings.desc.secretDiagnostics": "\u4EC5\u5728\u6392\u67E5 SecretStorage \u95EE\u9898\u65F6\u5C55\u5F00\u67E5\u770B\u3002",
  "settings.warning.secretUnavailable": "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5B89\u5168\u5B58\u50A8 API key\uFF0C\u771F\u5B9E LLM \u76F4\u8FDE\u80FD\u529B\u5DF2\u7981\u7528\uFF0C\u63D2\u4EF6\u5C06\u964D\u7EA7\u4E3A mock-llm\u3002",
  "settings.placeholder.apiKeyUnavailable": "\u5F53\u524D\u8FD0\u884C\u65F6\u672A\u66B4\u9732 SecretStorage\uFF0C\u65E0\u6CD5\u8F93\u5165 API key",
  "settings.placeholder.model.openai-compatible": "\u4F8B\u5982\uFF1Agpt-4.1-mini",
  "settings.placeholder.model.deepseek": "\u4F8B\u5982\uFF1Adeepseek-v4-flash",
  "settings.placeholder.model.custom-openai-compatible": "\u586B\u5199\u4F60\u7684\u670D\u52A1\u652F\u6301\u7684\u6A21\u578B\u540D",
  "settings.placeholder.model.local-openai-compatible": "\u4F8B\u5982\uFF1Aqwen2.5:7b\u3001gpt-oss\u3001local-model",
  "settings.placeholder.baseUrl.custom-openai-compatible": "\u4F8B\u5982\uFF1Ahttps://your-provider.example.com/v1",
  "settings.placeholder.baseUrl.local-openai-compatible": "\u4F8B\u5982\uFF1Ahttp://127.0.0.1:11434/v1",
  "settings.placeholder.secretRef.openai-compatible": "\u4F8B\u5982\uFF1Aobsidian-refined-layer-openai",
  "settings.placeholder.secretRef.deepseek": "\u4F8B\u5982\uFF1Aobsidian-refined-layer-deepseek",
  "settings.placeholder.secretRef.custom-openai-compatible": "\u4F8B\u5982\uFF1Aobsidian-refined-layer-custom",
  "settings.help.provider.mock": "\u672C\u5730 mock \u6D41\u7A0B\uFF0C\u4E0D\u4F1A\u8C03\u7528\u5916\u90E8 API\u3002\u9002\u5408\u5148\u9A8C\u8BC1 eligibility\u3001review\u3001apply \u6D41\u7A0B\u3002",
  "settings.help.provider.openai-compatible": "\u8FDE\u63A5 OpenAI \u5B98\u65B9\u63A5\u53E3\u3002\u53EA\u9700\u8981\u6A21\u578B\u540D\u3001Secret Reference \u548C API Key\u3002",
  "settings.help.provider.deepseek": "\u8FDE\u63A5 DeepSeek \u5B98\u65B9 OpenAI-compatible \u63A5\u53E3\u3002\u9ED8\u8BA4\u6A21\u578B\u5EFA\u8BAE\u4F7F\u7528 deepseek-v4-flash\u3002",
  "settings.help.provider.custom-openai-compatible": "\u8FDE\u63A5\u4EFB\u610F\u517C\u5BB9 OpenAI Chat Completions \u7684\u8FDC\u7A0B\u670D\u52A1\u3002\u9700\u8981\u6A21\u578B\u540D\u3001Base URL \u548C API Key\u3002",
  "settings.help.provider.local-openai-compatible": "\u8FDE\u63A5\u672C\u5730 OpenAI-compatible \u670D\u52A1\uFF0C\u4F8B\u5982 Ollama\u3001LM Studio\u3001vLLM\u3002\u901A\u5E38\u4E0D\u9700\u8981 API Key\u3002",
  "settings.option.language.zh-CN": "\u7B80\u4F53\u4E2D\u6587",
  "settings.option.language.en": "English",
  "settings.option.provider.mock": "Mock",
  "settings.option.provider.openai": "OpenAI",
  "settings.option.provider.deepseek": "DeepSeek",
  "settings.option.provider.custom": "\u81EA\u5B9A\u4E49\u517C\u5BB9\u670D\u52A1",
  "settings.option.provider.local": "\u672C\u5730\u517C\u5BB9\u670D\u52A1",
  "settings.button.openSessionCache": "\u67E5\u770B\u7F13\u5B58\u8BB0\u5F55",
  "notice.review.reopened": "\u5DF2\u6062\u590D\u6700\u8FD1 proposal\uFF1A{sessionId} \xB7 {title} \xB7 token usage {mode}",
  "notice.review.noSession": "\u5F53\u524D\u7B14\u8BB0\u6CA1\u6709\u53EF\u6062\u590D\u7684 proposal session\uFF1A{path}",
  "notice.provider.downgradedMock": "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5B89\u5168 secret \u5B58\u50A8\uFF0C\u5DF2\u964D\u7EA7\u4E3A mock-llm\u3002",
  "notice.provider.missingModel": "{provider} \u9700\u8981\u914D\u7F6E\u6A21\u578B\u540D\u3002",
  "notice.provider.missingBaseUrl": "{provider} \u9700\u8981\u914D\u7F6E API Base URL\u3002",
  "notice.provider.missingSecretRef": "{provider} \u9700\u8981\u914D\u7F6E secret reference\u3002",
  "notice.provider.missingApiKey": "{provider} \u5F53\u524D secret reference \u4E0B\u6CA1\u6709\u4FDD\u5B58 API key\u3002",
  "notice.provider.secretSaved": "API key \u5DF2\u4FDD\u5B58\u5230\u5B89\u5168 SecretStorage\u3002",
  "notice.provider.secretBlocked": "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5B89\u5168 secret \u5B58\u50A8\uFF0C\u65E0\u6CD5\u4FDD\u5B58 API key\u3002",
  "notice.provider.secretInvalidRef": "Secret reference \u53EA\u80FD\u5305\u542B\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u8FDE\u5B57\u7B26\u3002",
  "notice.provider.error": "Provider \u9519\u8BEF\uFF1A{message}",
  "notice.v2.retry.success": "Refined Layer\uFF1A\u672C\u6B21\u751F\u6210\u8BF7\u6C42\u4E86 {attemptsUsed}/{maxAttempts} \u6B21\u540E\u6210\u529F\u3002",
  "notice.v2.retry.failure": "Refined Layer\uFF1A\u672C\u6B21\u751F\u6210\u5DF2\u8BF7\u6C42 {attemptsUsed}/{maxAttempts} \u6B21\uFF0C\u672A\u751F\u6210\u53EF\u5BA1\u6838 proposal\u3002",
  "notice.v2.errorCache.saved": "Refined Layer\uFF1A\u5931\u8D25\u5C1D\u8BD5\u5DF2\u4FDD\u5B58\u5230\u7F13\u5B58\u8BB0\u5F55\uFF1A{path}",
  "notice.v2.errorCache.disabled": "Refined Layer\uFF1A\u9519\u8BEF\u7F13\u5B58\u5DF2\u5173\u95ED\uFF0C\u5931\u8D25\u4F1A\u8BDD\u672A\u4FDD\u5B58\u3002",
  "sessionPicker.title": "\u53EF\u6062\u590D\u7684 Proposal Session",
  "sessionPicker.freshness.fresh": "\u6587\u4EF6\u672A\u53D8\u5316",
  "sessionPicker.freshness.stale-file": "\u6587\u4EF6\u5DF2\u53D8\u5316",
  "sessionPicker.freshness.stale-region": "\u53D7\u4FDD\u62A4\u533A\u57DF\u5DF2\u53D8\u5316",
  "sessionPicker.freshness.unknown": "\u672A\u77E5",
  "sessionPicker.button.continue": "\u7EE7\u7EED\u5BA1\u6838",
  "sessionPicker.button.manualCopy": "\u624B\u52A8\u590D\u5236",
  "sessionPicker.button.regenerate": "\u91CD\u65B0\u751F\u6210",
  "sessionPicker.button.discard": "\u4E22\u5F03",
  "sessionPicker.button.cancel": "\u53D6\u6D88",
  "sessionPicker.empty": "\u5F53\u524D\u7B14\u8BB0\u6CA1\u6709\u53EF\u6062\u590D\u7684 proposal session\u3002",
  "sessionPicker.sessionMeta": "{createdAt} \xB7 {status} \xB7 token {mode}",
  "sessionPicker.conflict": "\u6587\u4EF6\u5DF2\u53D8\u5316\uFF1A{reason}\u3002\u65E0\u6CD5\u76F4\u63A5 apply\u3002",
  "cachedSessionPicker.title": "\u67E5\u770B\u7F13\u5B58\u8BB0\u5F55",
  "cachedSessionPicker.empty": "\u5F53\u524D\u6CA1\u6709\u7F13\u5B58\u8BB0\u5F55\u3002",
  "cachedSessionPicker.button.open": "\u6253\u5F00\u7F13\u5B58\u8BB0\u5F55",
  "cachedSessionPicker.sessionMeta": "{createdAt} \xB7 {status} \xB7 {provider}/{model} \xB7 \u8BF7\u6C42 {attemptsUsed} \xB7 token {mode}",
  "notice.cachedSession.notFound": "\u7F13\u5B58\u8BB0\u5F55\u672A\u627E\u5230\u3002",
  "notice.cachedSession.applyDisabled": "\u7F13\u5B58\u8BB0\u5F55\u4EC5\u53EF\u67E5\u770B\u548C\u4FDD\u5B58\u8349\u7A3F\uFF0C\u4E0D\u80FD\u76F4\u63A5 Apply\u3002",
  "notice.cachedSession.draftPending": "\u7F13\u5B58\u8BB0\u5F55\u8349\u7A3F\u5BFC\u51FA\u5C06\u5728 D58 \u63A5\u5165\u3002",
  "eligibility.missingBBlock": "\u7F3A\u5C11 B \u7C7B\u5206\u5757 heading",
  "eligibility.multipleBBlock": "B \u7C7B\u5206\u5757 heading \u51FA\u73B0\u591A\u6B21",
  "eligibility.bBlockLevelMismatch": "B \u7C7B\u5206\u5757 heading \u5C42\u7EA7\u4E0D\u5339\u914D",
  "eligibility.emptyBBlock": "B \u7C7B\u5206\u5757\u5185\u5BB9\u4E3A\u7A7A",
  "eligibility.invalidABlockConfig": "A \u7C7B\u5206\u5757\u914D\u7F6E\u4E0D\u5408\u6CD5"
};

// src/ui/i18n/index.ts
var dictionaries = {
  "zh-CN": zhCNStrings,
  en: enStrings
};
function t(language, key, variables = {}) {
  var _a5, _b;
  const template = (_b = (_a5 = dictionaries[language][key]) != null ? _a5 : dictionaries.en[key]) != null ? _b : key;
  return Object.entries(variables).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template
  );
}

// src/ui/review/ReviewModal.ts
var import_obsidian2 = require("obsidian");
var ReviewModal = class extends import_obsidian2.Modal {
  constructor(app, viewModel, language, callbacks) {
    super(app);
    this.viewModel = viewModel;
    this.language = language;
    this.callbacks = callbacks;
    this.completed = false;
    this.decision = structuredClone(viewModel.initialDecision);
  }
  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText(t(this.language, "review.title"));
    contentEl.empty();
    contentEl.addClass("obsidian-refined-layer-review");
    contentEl.createEl("p", {
      cls: "obsidian-refined-layer-meta",
      text: t(this.language, "review.noteMeta", {
        title: this.viewModel.noteTitle,
        path: this.viewModel.notePath
      })
    });
    this.renderBodySection(contentEl);
    this.renderFrontmatterSection(contentEl);
    this.renderTagSection(contentEl);
    this.renderTokenUsageSection(contentEl);
    this.renderWarningsSection(contentEl);
    this.renderActionRow(contentEl);
  }
  onClose() {
    this.contentEl.empty();
    if (!this.completed) {
      this.callbacks.onCloseWithoutDecision();
    }
  }
  renderBodySection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.body") });
    const toggle = this.createCheckboxRow(section, t(this.language, "review.toggle.body"), false, (checked) => {
      this.decision.acceptBody = checked;
    });
    toggle.addClass("obsidian-refined-layer-toggle");
    for (const editableSection of this.viewModel.editableRefinedSections) {
      this.renderEditableSection(section, editableSection);
    }
  }
  renderEditableSection(container, editableSection) {
    const field = container.createDiv("obsidian-refined-layer-editable-section");
    field.createEl("label", {
      cls: "obsidian-refined-layer-editable-label",
      text: `${editableSection.heading}${editableSection.required ? " *" : ""}`
    });
    const textArea = new import_obsidian2.TextAreaComponent(field);
    textArea.inputEl.rows = editableSection.required ? 4 : 3;
    textArea.inputEl.addClass("obsidian-refined-layer-editable-textarea");
    textArea.setValue(editableSection.content);
    this.setEditedSection(editableSection.key, editableSection.content);
    textArea.onChange((value) => {
      this.setEditedSection(editableSection.key, value);
    });
  }
  renderFrontmatterSection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.frontmatter") });
    if (this.viewModel.frontmatterSuggestions.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }
    for (const suggestion of this.viewModel.frontmatterSuggestions) {
      const key = `review.toggle.frontmatter.${suggestion.field}`;
      const row = this.createCheckboxRow(section, t(this.language, key), false, (checked) => {
        this.decision.acceptFrontmatter[suggestion.field] = checked;
      });
      row.createEl("code", { text: `${suggestion.field}: ${suggestion.value}` });
    }
  }
  renderTagSection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.tags") });
    const hasAdd = this.viewModel.tagSuggestions.add.length > 0;
    const hasRemove = this.viewModel.tagSuggestions.remove.length > 0;
    if (!hasAdd && !hasRemove) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }
    for (const tag of this.viewModel.tagSuggestions.add) {
      this.createCheckboxRow(section, t(this.language, "review.toggle.tag.add", { tag }), false, (checked) => {
        var _a5;
        const next = new Set((_a5 = this.decision.acceptTags.add) != null ? _a5 : []);
        checked ? next.add(tag) : next.delete(tag);
        this.decision.acceptTags.add = [...next];
      });
    }
    for (const tag of this.viewModel.tagSuggestions.remove) {
      this.createCheckboxRow(section, t(this.language, "review.toggle.tag.remove", { tag }), false, (checked) => {
        var _a5;
        const next = new Set((_a5 = this.decision.acceptTags.remove) != null ? _a5 : []);
        checked ? next.add(tag) : next.delete(tag);
        this.decision.acceptTags.remove = [...next];
      });
    }
  }
  renderTokenUsageSection(container) {
    var _a5;
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.tokenUsage") });
    const usage = this.viewModel.tokenUsage;
    section.createEl("p", {
      text: usage ? t(this.language, "review.token.summary", {
        provider: usage.provider,
        model: usage.model,
        mode: usage.countingMode,
        total: (_a5 = usage.totalTokens) != null ? _a5 : t(this.language, "review.token.unavailable")
      }) : t(this.language, "review.token.unavailable")
    });
  }
  renderWarningsSection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.warnings") });
    if (this.viewModel.warnings.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }
    const list = section.createEl("ul");
    for (const warning of this.viewModel.warnings) {
      list.createEl("li", { text: warning });
    }
  }
  renderActionRow(container) {
    const row = container.createDiv("obsidian-refined-layer-actions");
    const applyButton = row.createEl("button", { text: t(this.language, "review.button.apply") });
    applyButton.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onApply(this.decision);
      this.close();
    });
    const draftButton = row.createEl("button", { text: t(this.language, "review.button.saveDraft") });
    draftButton.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onSaveDraft({
        ...this.decision,
        saveAsDraftOnly: true
      });
      this.close();
    });
    const closeButton = row.createEl("button", { text: t(this.language, "review.button.close") });
    closeButton.addEventListener("click", () => {
      this.close();
    });
  }
  createCheckboxRow(container, labelText, checked, onChange) {
    const row = container.createEl("label", { cls: "obsidian-refined-layer-checkbox-row" });
    const checkbox = row.createEl("input", { type: "checkbox" });
    checkbox.checked = checked;
    checkbox.addEventListener("change", () => onChange(checkbox.checked));
    row.createSpan({ text: labelText });
    return row;
  }
  setEditedSection(key, value) {
    var _a5;
    this.decision.editedRefinedSections = {
      ...(_a5 = this.decision.editedRefinedSections) != null ? _a5 : {},
      [key]: value
    };
  }
};
var ReviewModalV2 = class extends import_obsidian2.Modal {
  constructor(app, viewModel, language, callbacks, options = {}) {
    super(app);
    this.viewModel = viewModel;
    this.language = language;
    this.callbacks = callbacks;
    this.options = options;
    this.completed = false;
    this.decision = structuredClone(viewModel.initialDecision);
  }
  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText(t(this.language, "review.title"));
    contentEl.empty();
    contentEl.addClass("obsidian-refined-layer-review");
    contentEl.createEl("p", {
      cls: "obsidian-refined-layer-meta",
      text: t(this.language, "review.noteMeta", {
        title: this.viewModel.noteTitle,
        path: this.viewModel.notePath
      })
    });
    contentEl.createEl("p", {
      cls: "obsidian-refined-layer-meta",
      text: t(this.language, "review.meta.attemptsUsed", {
        attemptsUsed: String(this.viewModel.attemptsUsed)
      })
    });
    this.renderBlocksSection(contentEl);
    this.renderFrontmatterSection(contentEl);
    this.renderSelectedTagsSection(contentEl);
    this.renderNewTagSuggestionsSection(contentEl);
    this.renderTokenUsageSection(contentEl);
    this.renderValidationSection(contentEl);
    this.renderActionRow(contentEl);
  }
  onClose() {
    this.contentEl.empty();
    if (!this.completed) {
      this.callbacks.onCloseWithoutDecision();
    }
  }
  renderBlocksSection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.body") });
    if (this.viewModel.blocks.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }
    for (const block of this.viewModel.blocks) {
      this.renderBlock(section, block);
    }
  }
  renderBlock(container, block) {
    const blockEl = container.createDiv("obsidian-refined-layer-v2-block");
    const row = this.createCheckboxRow(blockEl, t(this.language, "review.toggle.block", { heading: block.heading }), false, (checked) => {
      this.decision.acceptBlocks[block.id] = checked;
    });
    row.addClass("obsidian-refined-layer-toggle");
    blockEl.createEl(`h${Math.min(Math.max(block.headingLevel, 1), 6)}`, {
      cls: "obsidian-refined-layer-v2-block-heading",
      text: block.heading
    });
    blockEl.createEl("pre", {
      cls: "obsidian-refined-layer-preview",
      text: block.content
    });
    if (block.warnings.length > 0) {
      const list = blockEl.createEl("ul", { cls: "obsidian-refined-layer-warning-list" });
      for (const warning of block.warnings) {
        list.createEl("li", { text: warning });
      }
    }
  }
  renderFrontmatterSection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.frontmatter") });
    if (this.viewModel.frontmatterSuggestions.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }
    for (const suggestion of this.viewModel.frontmatterSuggestions) {
      const key = `review.toggle.frontmatter.${suggestion.field}`;
      const row = this.createCheckboxRow(section, t(this.language, key), false, (checked) => {
        this.decision.acceptFrontmatter[suggestion.field] = checked;
      });
      row.createEl("code", { text: `${suggestion.field}: ${suggestion.value}` });
    }
  }
  renderSelectedTagsSection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.tags") });
    if (this.viewModel.selectedTags.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }
    for (const item of this.viewModel.selectedTags) {
      this.createCheckboxRow(section, t(this.language, "review.toggle.tag.add", { tag: item.tag }), false, (checked) => {
        const next = new Set(this.decision.acceptTags.add);
        checked ? next.add(item.tag) : next.delete(item.tag);
        this.decision.acceptTags.add = [...next];
      });
    }
  }
  renderNewTagSuggestionsSection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.newTagSuggestions") });
    if (this.viewModel.newTagSuggestions.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }
    section.createEl("p", {
      cls: "obsidian-refined-layer-meta",
      text: t(this.language, "review.notice.newTagSuggestions")
    });
    const textArea = new import_obsidian2.TextAreaComponent(section);
    textArea.inputEl.rows = Math.min(Math.max(this.viewModel.newTagSuggestions.length, 2), 6);
    textArea.inputEl.addClass("obsidian-refined-layer-readonly-textarea");
    textArea.setValue(this.viewModel.newTagSuggestions.join("\n"));
    textArea.inputEl.readOnly = true;
  }
  renderTokenUsageSection(container) {
    var _a5;
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.tokenUsage") });
    const usage = this.viewModel.tokenUsage;
    section.createEl("p", {
      text: usage ? t(this.language, "review.token.summary", {
        provider: usage.provider,
        model: usage.model,
        mode: usage.countingMode,
        total: (_a5 = usage.totalTokens) != null ? _a5 : t(this.language, "review.token.unavailable")
      }) : t(this.language, "review.token.unavailable")
    });
  }
  renderValidationSection(container) {
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.validation") });
    const items = [];
    if (this.viewModel.tagNormalizationApplied) {
      items.push(t(this.language, "review.notice.tagNormalizationApplied"));
    }
    items.push(...this.viewModel.validationWarnings);
    for (const rejected of this.viewModel.rejectedFields) {
      items.push(`${rejected.field}: ${rejected.reason}`);
    }
    if (items.length === 0) {
      section.createEl("p", { text: t(this.language, "review.empty.none") });
      return;
    }
    const list = section.createEl("ul", { cls: "obsidian-refined-layer-warning-list" });
    for (const item of items) {
      list.createEl("li", { text: item });
    }
  }
  renderActionRow(container) {
    const row = container.createDiv("obsidian-refined-layer-actions");
    const applyButton = row.createEl("button", { text: t(this.language, "review.button.apply") });
    applyButton.disabled = this.options.applyDisabled === true;
    applyButton.addEventListener("click", () => {
      if (this.options.applyDisabled) return;
      this.completed = true;
      this.callbacks.onApply(this.decision);
      this.close();
    });
    const draftButton = row.createEl("button", { text: t(this.language, "review.button.saveDraft") });
    draftButton.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onSaveDraft({
        ...this.decision,
        saveAsDraftOnly: true
      });
      this.close();
    });
    const closeButton = row.createEl("button", { text: t(this.language, "review.button.close") });
    closeButton.addEventListener("click", () => {
      this.close();
    });
  }
  createCheckboxRow(container, labelText, checked, onChange) {
    const row = container.createEl("label", { cls: "obsidian-refined-layer-checkbox-row" });
    const checkbox = row.createEl("input", { type: "checkbox" });
    checkbox.checked = checked;
    checkbox.addEventListener("change", () => onChange(checkbox.checked));
    row.createSpan({ text: labelText });
    return row;
  }
};

// src/ui/review/ReviewViewModel.ts
function createReviewViewModel(session) {
  var _a5, _b, _c, _d, _e, _f, _g;
  const frontmatterSuggestions = [];
  const suggestion = session.proposal.frontmatterSuggestion;
  if (suggestion == null ? void 0 : suggestion.status) {
    frontmatterSuggestions.push({ field: "status", value: suggestion.status });
  }
  if (suggestion == null ? void 0 : suggestion.source) {
    frontmatterSuggestions.push({ field: "source", value: suggestion.source.join(", ") });
  }
  if (suggestion == null ? void 0 : suggestion.context) {
    frontmatterSuggestions.push({ field: "context", value: suggestion.context.join(", ") });
  }
  const editableRefinedSections = buildEditableSections(session.proposal.refinedSections);
  return {
    sessionId: session.id,
    workflowProfileId: session.workflowProfileId,
    notePath: session.notePath,
    noteTitle: session.noteTitle,
    bodyPreview: buildRefinedBodyPreview(session.proposal.refinedSections),
    editableRefinedSections,
    frontmatterSuggestions,
    tagSuggestions: {
      add: (_b = (_a5 = session.proposal.tagSuggestion) == null ? void 0 : _a5.add) != null ? _b : [],
      remove: (_d = (_c = session.proposal.tagSuggestion) == null ? void 0 : _c.remove) != null ? _d : []
    },
    warnings: (_e = session.proposal.warnings) != null ? _e : [],
    tokenUsage: session.tokenUsage ? {
      provider: session.tokenUsage.provider,
      model: session.tokenUsage.model,
      countingMode: session.tokenUsage.countingMode,
      totalTokens: session.tokenUsage.totalTokens,
      inputTokens: session.tokenUsage.inputTokens,
      outputTokens: session.tokenUsage.outputTokens,
      generatedAt: session.tokenUsage.generatedAt
    } : null,
    initialDecision: {
      acceptBody: false,
      editedRefinedSections: {
        ...session.proposal.refinedSections
      },
      acceptFrontmatter: {
        ...(suggestion == null ? void 0 : suggestion.status) ? { status: false } : {},
        ...(suggestion == null ? void 0 : suggestion.source) ? { source: false } : {},
        ...(suggestion == null ? void 0 : suggestion.context) ? { context: false } : {}
      },
      acceptTags: {
        ...((_f = session.proposal.tagSuggestion) == null ? void 0 : _f.add) ? { add: [] } : {},
        ...((_g = session.proposal.tagSuggestion) == null ? void 0 : _g.remove) ? { remove: [] } : {}
      }
    }
  };
}
function createReviewViewModelV2(session) {
  var _a5, _b, _c, _d, _e, _f;
  const frontmatterSuggestions = [];
  const suggestion = session.proposal.frontmatterSuggestion;
  if (suggestion == null ? void 0 : suggestion.status) {
    frontmatterSuggestions.push({ field: "status", value: suggestion.status });
  }
  if (suggestion == null ? void 0 : suggestion.source) {
    frontmatterSuggestions.push({ field: "source", value: suggestion.source.join(", ") });
  }
  if (suggestion == null ? void 0 : suggestion.context) {
    frontmatterSuggestions.push({ field: "context", value: suggestion.context.join(", ") });
  }
  const configById = new Map(
    session.blockConfigSnapshot.aBlocks.map((block) => [block.id, block])
  );
  const configuredOrder = new Map(
    session.blockConfigSnapshot.aBlocks.map((block) => [block.id, block.order])
  );
  const blocks = [...session.proposal.blocks].sort((a, b) => {
    var _a6, _b2;
    return ((_a6 = configuredOrder.get(a.id)) != null ? _a6 : Number.MAX_SAFE_INTEGER) - ((_b2 = configuredOrder.get(b.id)) != null ? _b2 : Number.MAX_SAFE_INTEGER);
  }).map((block) => {
    var _a6, _b2, _c2;
    const config2 = configById.get(block.id);
    return {
      id: block.id,
      heading: (_a6 = config2 == null ? void 0 : config2.heading) != null ? _a6 : block.id,
      headingLevel: (_b2 = config2 == null ? void 0 : config2.headingLevel) != null ? _b2 : 2,
      content: block.content,
      warnings: (_c2 = block.warnings) != null ? _c2 : [],
      accepted: false
    };
  });
  const selectedTags = ((_b = (_a5 = session.proposal.tagSuggestion) == null ? void 0 : _a5.selectedTags) != null ? _b : []).map((tag) => ({
    tag,
    accepted: false
  }));
  const acceptBlocks = Object.fromEntries(blocks.map((block) => [block.id, false]));
  return {
    sessionId: session.id,
    workflowProfileId: session.workflowProfileId,
    schemaVersion: session.schemaVersion,
    notePath: session.notePath,
    noteTitle: session.noteTitle,
    blocks,
    frontmatterSuggestions,
    selectedTags,
    newTagSuggestions: (_d = (_c = session.proposal.tagSuggestion) == null ? void 0 : _c.newTagSuggestions) != null ? _d : [],
    tagNormalizationApplied: session.validation.tagNormalizationApplied || session.proposal.tagNormalizationApplied === true,
    validationWarnings: [
      ...(_e = session.validation.warnings) != null ? _e : [],
      ...(_f = session.proposal.warnings) != null ? _f : []
    ],
    rejectedFields: session.validation.rejectedFields,
    attemptsUsed: session.source.attemptsUsed,
    tokenUsage: session.tokenUsage ? {
      provider: session.tokenUsage.provider,
      model: session.tokenUsage.model,
      countingMode: session.tokenUsage.countingMode,
      totalTokens: session.tokenUsage.totalTokens,
      inputTokens: session.tokenUsage.inputTokens,
      outputTokens: session.tokenUsage.outputTokens,
      generatedAt: session.tokenUsage.generatedAt
    } : null,
    initialDecision: {
      acceptBlocks,
      acceptFrontmatter: {
        ...(suggestion == null ? void 0 : suggestion.status) ? { status: false } : {},
        ...(suggestion == null ? void 0 : suggestion.source) ? { source: false } : {},
        ...(suggestion == null ? void 0 : suggestion.context) ? { context: false } : {}
      },
      acceptTags: {
        add: []
      }
    }
  };
}
function buildEditableSections(refinedSections) {
  const keys = [
    "summary",
    "coreQuestion",
    "currentConclusion",
    "reasoning",
    "scope",
    "nextSteps",
    "refineNote"
  ];
  return keys.filter((key) => refinedSections[key] !== void 0).map((key) => {
    var _a5;
    return {
      key,
      heading: SECTION_HEADINGS[key],
      content: (_a5 = refinedSections[key]) != null ? _a5 : "",
      required: key === "summary" || key === "coreQuestion" || key === "currentConclusion" || key === "reasoning"
    };
  });
}

// src/ui/review/ObsidianReviewGate.ts
var ObsidianReviewGate = class {
  constructor(app, language, handlers) {
    this.app = app;
    this.language = language;
    this.handlers = handlers;
  }
  async requestReview(session) {
    const viewModel = createReviewViewModel(session);
    return new Promise((resolve) => {
      const modal = new ReviewModal(this.app, viewModel, this.language, {
        onApply: (decision) => {
          var _a5, _b;
          void ((_b = (_a5 = this.handlers) == null ? void 0 : _a5.onApplyNotice) == null ? void 0 : _b.call(_a5, decision));
          resolve({ action: "apply", decision });
        },
        onSaveDraft: (decision) => {
          var _a5, _b;
          void ((_b = (_a5 = this.handlers) == null ? void 0 : _a5.onSaveDraftNotice) == null ? void 0 : _b.call(_a5, decision));
          resolve({ action: "save-draft", decision });
        },
        onCloseWithoutDecision: () => {
          var _a5, _b;
          void ((_b = (_a5 = this.handlers) == null ? void 0 : _a5.onCancelNotice) == null ? void 0 : _b.call(_a5));
          resolve({ action: "cancel" });
        }
      });
      modal.open();
    });
  }
};

// src/ui/review/CachedSessionPickerModal.ts
var import_obsidian3 = require("obsidian");
var CachedSessionPickerModal = class extends import_obsidian3.Modal {
  constructor(app, sessions, language, callbacks) {
    super(app);
    this.sessions = sessions;
    this.language = language;
    this.callbacks = callbacks;
    this.completed = false;
  }
  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText(t(this.language, "cachedSessionPicker.title"));
    contentEl.empty();
    contentEl.addClass("obsidian-refined-layer-session-picker");
    if (this.sessions.length === 0) {
      contentEl.createEl("p", {
        cls: "obsidian-refined-layer-empty",
        text: t(this.language, "cachedSessionPicker.empty")
      });
      this.renderCloseButton(contentEl);
      return;
    }
    for (const session of this.sessions) {
      this.renderSessionItem(contentEl, session);
    }
    this.renderCloseButton(contentEl);
  }
  onClose() {
    this.contentEl.empty();
    if (!this.completed) {
      this.callbacks.onCancel();
    }
  }
  renderSessionItem(container, session) {
    var _a5, _b;
    const item = container.createDiv("obsidian-refined-layer-session-item");
    const header = item.createDiv("obsidian-refined-layer-session-header");
    header.createEl("strong", { text: session.noteTitle });
    item.createDiv("obsidian-refined-layer-session-meta").createSpan({
      text: session.notePath
    });
    const mode = (_b = (_a5 = session.tokenUsage) == null ? void 0 : _a5.countingMode) != null ? _b : "unavailable";
    item.createDiv("obsidian-refined-layer-session-meta").createSpan({
      text: t(this.language, "cachedSessionPicker.sessionMeta", {
        createdAt: session.createdAt.slice(0, 10),
        status: session.status,
        provider: session.provider,
        model: session.model,
        attemptsUsed: String(session.attemptsUsed),
        mode
      })
    });
    const actions = item.createDiv("obsidian-refined-layer-session-actions");
    const openButton = actions.createEl("button", {
      text: t(this.language, "cachedSessionPicker.button.open")
    });
    openButton.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onOpenSession(session.id);
      this.close();
    });
  }
  renderCloseButton(container) {
    const row = container.createDiv("obsidian-refined-layer-actions");
    const closeBtn = row.createEl("button", {
      text: t(this.language, "sessionPicker.button.cancel")
    });
    closeBtn.addEventListener("click", () => {
      this.close();
    });
  }
};

// src/ui/review/SessionPickerModal.ts
var import_obsidian4 = require("obsidian");
var SessionPickerModal = class extends import_obsidian4.Modal {
  constructor(app, sessions, noteTitle, notePath, language, callbacks) {
    super(app);
    this.sessions = sessions;
    this.noteTitle = noteTitle;
    this.notePath = notePath;
    this.language = language;
    this.callbacks = callbacks;
    this.completed = false;
  }
  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText(t(this.language, "sessionPicker.title"));
    contentEl.empty();
    contentEl.addClass("obsidian-refined-layer-session-picker");
    if (this.notePath) {
      contentEl.createEl("p", {
        cls: "obsidian-refined-layer-meta",
        text: t(this.language, "review.noteMeta", {
          title: this.noteTitle,
          path: this.notePath
        })
      });
    }
    if (this.sessions.length === 0) {
      contentEl.createEl("p", {
        cls: "obsidian-refined-layer-empty",
        text: t(this.language, "sessionPicker.empty")
      });
      this.renderCloseButton(contentEl);
      return;
    }
    for (const session of this.sessions) {
      this.renderSessionItem(contentEl, session);
    }
    this.renderCloseButton(contentEl);
  }
  onClose() {
    this.contentEl.empty();
    if (!this.completed) {
      this.callbacks.onCancel();
    }
  }
  renderSessionItem(container, session) {
    var _a5, _b;
    const item = container.createDiv("obsidian-refined-layer-session-item");
    const header = item.createDiv("obsidian-refined-layer-session-header");
    header.createEl("strong", { text: session.summary });
    const meta3 = item.createDiv("obsidian-refined-layer-session-meta");
    const countingMode = (_b = (_a5 = session.tokenUsage) == null ? void 0 : _a5.countingMode) != null ? _b : "unavailable";
    meta3.createSpan({
      text: t(this.language, "sessionPicker.sessionMeta", {
        createdAt: session.createdAt.slice(0, 10),
        status: session.status,
        mode: countingMode
      })
    });
    const freshness = item.createDiv("obsidian-refined-layer-session-freshness");
    freshness.createSpan({
      text: t(this.language, `sessionPicker.freshness.${session.freshness}`),
      cls: `obsidian-refined-layer-freshness-${session.freshness}`
    });
    const actions = item.createDiv("obsidian-refined-layer-session-actions");
    if (session.freshness === "fresh") {
      const continueBtn = actions.createEl("button", {
        text: t(this.language, "sessionPicker.button.continue")
      });
      continueBtn.addEventListener("click", () => {
        this.completed = true;
        this.callbacks.onContinue(session.id);
        this.close();
      });
    } else {
      const conflictMsg = actions.createDiv("obsidian-refined-layer-conflict-msg");
      conflictMsg.createSpan({
        text: t(this.language, "sessionPicker.conflict", {
          reason: session.freshness
        })
      });
      const draftBtn = actions.createEl("button", {
        text: t(this.language, "review.button.saveDraft")
      });
      draftBtn.addEventListener("click", () => {
        this.completed = true;
        this.callbacks.onSaveDraft(session.id);
        this.close();
      });
      const manualBtn = actions.createEl("button", {
        text: t(this.language, "sessionPicker.button.manualCopy")
      });
      manualBtn.addEventListener("click", () => {
        this.completed = true;
        this.callbacks.onManualCopy(session.id);
        this.close();
      });
    }
    const regenerateBtn = actions.createEl("button", {
      text: t(this.language, "sessionPicker.button.regenerate")
    });
    regenerateBtn.addEventListener("click", () => {
      this.completed = true;
      this.callbacks.onRegenerate();
      this.close();
    });
    const discardBtn = actions.createEl("button", {
      text: t(this.language, "sessionPicker.button.discard")
    });
    discardBtn.addEventListener("click", () => {
      this.callbacks.onDiscard(session.id);
    });
  }
  renderCloseButton(container) {
    const row = container.createDiv("obsidian-refined-layer-actions");
    const closeBtn = row.createEl("button", {
      text: t(this.language, "sessionPicker.button.cancel")
    });
    closeBtn.addEventListener("click", () => {
      this.close();
    });
  }
};

// src/ui/settings/SettingsTab.ts
var import_obsidian5 = require("obsidian");
var SettingsTab = class extends import_obsidian5.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    var _a5;
    const { containerEl } = this;
    const settings = this.plugin.getSettings();
    const provider = settings.provider;
    const providerType = (_a5 = provider == null ? void 0 : provider.type) != null ? _a5 : "mock";
    const providerPreset = getProviderPreset(providerType);
    const secretAvailable = this.plugin.hasSecureSecretStorage();
    const secretDiagnostics = this.plugin.getSecretStorageDiagnostics();
    const sessionCacheInfo = this.plugin.getSessionCacheInfo();
    const errorSessionCacheInfo = this.plugin.getErrorSessionCacheInfo();
    containerEl.empty();
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.language")).setDesc(t(settings.language, "settings.desc.language")).addDropdown((dropdown) => {
      dropdown.addOption("zh-CN", t(settings.language, "settings.option.language.zh-CN")).addOption("en", t(settings.language, "settings.option.language.en")).setValue(settings.language).onChange(async (value) => {
        await this.plugin.updateSettings({ language: value });
        this.display();
      });
    });
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.sessionCache")).setDesc(t(settings.language, "settings.desc.sessionCache"));
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.sessionCacheLimit")).setDesc(t(settings.language, "settings.desc.sessionCacheLimit")).addText((text) => {
      text.setPlaceholder("5").setValue(String(settings.sessionCache.limit)).onChange(async (value) => {
        const parsed = Number.parseInt(value, 10);
        await this.plugin.updateSessionCacheSettings({ limit: parsed });
      });
    });
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.sessionCacheLocation")).setDesc(sessionCacheInfo.cachePath);
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.openSessionCache")).setDesc(t(settings.language, "settings.desc.openSessionCache")).addButton((button) => {
      button.setButtonText(t(settings.language, "settings.button.openSessionCache")).onClick(async () => {
        await this.plugin.openCachedProposalSessionFlow();
      });
    });
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.errorSessionCache")).setDesc(t(settings.language, "settings.desc.errorSessionCache")).addToggle((toggle) => {
      toggle.setValue(settings.errorSessionCache.enabled).onChange(async (enabled) => {
        await this.plugin.updateErrorSessionCacheSettings({ enabled });
      });
    });
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.errorSessionCacheLimit")).setDesc(t(settings.language, "settings.desc.errorSessionCacheLimit", {
      defaultLimit: errorSessionCacheInfo.defaultLimit
    })).addText((text) => {
      text.setPlaceholder(String(errorSessionCacheInfo.defaultLimit)).setValue(String(settings.errorSessionCache.limit)).onChange(async (value) => {
        const parsed = Number.parseInt(value, 10);
        await this.plugin.updateErrorSessionCacheSettings({ limit: parsed });
      });
    });
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.errorSessionCacheLocation")).setDesc(errorSessionCacheInfo.cachePath);
    containerEl.createEl("p", {
      cls: "obsidian-refined-layer-settings-note",
      text: t(settings.language, "settings.desc.cachePrivacy")
    });
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.draftFolder")).setDesc(t(settings.language, "settings.desc.draftFolder")).addText((text) => {
      text.setValue(settings.draftFolder).onChange(async (value) => {
        await this.plugin.updateSettings({ draftFolder: value.trim() || settings.draftFolder });
      });
    });
    const providerSetting = new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.providerType")).setDesc(secretAvailable ? t(settings.language, "settings.desc.providerType") : t(settings.language, "settings.warning.secretUnavailable"));
    providerSetting.addDropdown((dropdown) => {
      dropdown.addOption("mock", t(settings.language, "settings.option.provider.mock")).addOption("openai-compatible", t(settings.language, "settings.option.provider.openai")).addOption("deepseek", t(settings.language, "settings.option.provider.deepseek")).addOption("custom-openai-compatible", t(settings.language, "settings.option.provider.custom")).addOption("local-openai-compatible", t(settings.language, "settings.option.provider.local")).setValue(providerType).onChange(async (value) => {
        await this.plugin.switchProviderType(value);
        this.display();
      });
    });
    containerEl.createEl("p", {
      cls: "obsidian-refined-layer-settings-note",
      text: t(settings.language, `settings.help.provider.${providerType}`)
    });
    if (providerType !== "mock") {
      const modelSetting = new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.providerModel")).setDesc(t(settings.language, "settings.desc.providerModel"));
      modelSetting.addText((text) => {
        var _a6;
        text.setValue((_a6 = provider == null ? void 0 : provider.model) != null ? _a6 : "").setPlaceholder(t(settings.language, `settings.placeholder.model.${providerType}`)).onChange(async (value) => {
          await this.plugin.updateProviderSettings({ model: value.trim() });
        });
      });
    }
    if (providerPreset.allowsBaseUrlEdit) {
      const baseUrlSetting = new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.baseUrl")).setDesc(t(settings.language, "settings.desc.baseUrl"));
      baseUrlSetting.addText((text) => {
        var _a6;
        text.setValue((_a6 = provider == null ? void 0 : provider.baseUrl) != null ? _a6 : "").setPlaceholder(t(settings.language, `settings.placeholder.baseUrl.${providerType}`)).onChange(async (value) => {
          await this.plugin.updateProviderSettings({ baseUrl: value.trim() });
        });
      });
    }
    if (providerPreset.requiresSecret) {
      const secretRefSetting = new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.secretRef")).setDesc(t(settings.language, "settings.desc.secretRef")).setDisabled(!secretAvailable);
      secretRefSetting.addText((text) => {
        var _a6;
        text.setValue((_a6 = provider == null ? void 0 : provider.secretRef) != null ? _a6 : "").setPlaceholder(t(settings.language, `settings.placeholder.secretRef.${providerType}`)).setDisabled(!secretAvailable).onChange(async (value) => {
          await this.plugin.updateProviderSettings({ secretRef: value.trim() });
        });
      });
      const apiKeySetting = new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.apiKey")).setDesc(t(settings.language, "settings.desc.apiKey")).setDisabled(!secretAvailable);
      if (secretAvailable) {
        const secretComponent = new import_obsidian5.SecretComponent(this.app, apiKeySetting.controlEl);
        secretComponent.onChange(async (value) => {
          var _a6, _b;
          if (!value.trim()) return;
          const secretRef = (_b = (_a6 = this.plugin.getSettings().provider) == null ? void 0 : _a6.secretRef) != null ? _b : "";
          await this.plugin.saveProviderApiKey(secretRef, value);
        });
        secretComponent.setValue("");
      } else {
        apiKeySetting.addText((text) => {
          text.setPlaceholder(t(settings.language, "settings.placeholder.apiKeyUnavailable")).setDisabled(true);
        });
      }
    }
    const diagnosticsContainer = containerEl.createEl("details", {
      cls: "obsidian-refined-layer-settings-details"
    });
    diagnosticsContainer.createEl("summary", {
      text: t(settings.language, "settings.title.secretDiagnostics")
    });
    diagnosticsContainer.createEl("p", {
      cls: "obsidian-refined-layer-settings-note",
      text: t(settings.language, "settings.desc.secretDiagnostics")
    });
    diagnosticsContainer.createEl("pre", {
      cls: "obsidian-refined-layer-settings-diagnostics",
      text: [
        `available: ${String(secretDiagnostics.available)}`,
        `hasSecretStorage: ${String(secretDiagnostics.hasSecretStorage)}`,
        `secretStorageType: ${secretDiagnostics.secretStorageType}`,
        `secretStorageConstructorName: ${secretDiagnostics.secretStorageConstructorName}`,
        `getSecretType: ${secretDiagnostics.getSecretType}`,
        `setSecretType: ${secretDiagnostics.setSecretType}`,
        `ownKeys: ${secretDiagnostics.ownKeys.length > 0 ? secretDiagnostics.ownKeys.join(", ") : "(none)"}`,
        `reason: ${secretDiagnostics.reason}`
      ].join("\n")
    });
    new import_obsidian5.Setting(containerEl).setName(t(settings.language, "settings.title.promptProfile")).setDesc(t(settings.language, "settings.desc.promptProfile"));
    this.addPromptOverrideField(
      containerEl,
      settings,
      "systemPrompt",
      t(settings.language, "settings.title.systemPrompt"),
      t(settings.language, "settings.desc.systemPrompt")
    );
    this.addPromptOverrideField(
      containerEl,
      settings,
      "userPrompt",
      t(settings.language, "settings.title.userPrompt"),
      t(settings.language, "settings.desc.userPrompt")
    );
    containerEl.createEl("p", {
      cls: "obsidian-refined-layer-settings-note",
      text: t(settings.language, "settings.desc.promptVariables")
    });
  }
  addPromptOverrideField(containerEl, settings, field, title, description) {
    var _a5, _b, _c;
    const setting = new import_obsidian5.Setting(containerEl).setName(title).setDesc(description);
    setting.controlEl.createDiv();
    const textArea = new import_obsidian5.TextAreaComponent(setting.controlEl);
    textArea.inputEl.rows = 5;
    textArea.inputEl.cols = 40;
    textArea.setValue((_c = (_b = (_a5 = settings.promptOverrides) == null ? void 0 : _a5["raw-refined"]) == null ? void 0 : _b[field]) != null ? _c : "");
    textArea.onChange(async (value) => {
      await this.plugin.updatePromptOverride(field, value);
    });
  }
};

// src/main.ts
var REFINE_COMMAND_ID = "refine-current-note";
var REOPEN_LAST_PROPOSAL_COMMAND_ID = "reopen-last-proposal-for-current-note";
var OPEN_CACHED_PROPOSAL_SESSION_COMMAND_ID = "open-cached-proposal-session";
var ObsidianRefinedLayerPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_PLUGIN_SETTINGS;
    this.settingsStore = new ObsidianSettingsStore(this);
    this.sessionStore = new ProposalSessionStore(DEFAULT_PLUGIN_SETTINGS.historyLimit, new ObsidianSessionStore(this));
    this.sessionCacheV2 = new ObsidianSessionCacheV2Store(this);
    this.secretStore = new ObsidianSecretStore(this.app);
  }
  async onload() {
    this.settings = await this.settingsStore.load();
    this.sessionStore = new ProposalSessionStore(this.settings.historyLimit, new ObsidianSessionStore(this));
    await this.sessionStore.restoreFromDisk();
    this.sessionCacheV2 = new ObsidianSessionCacheV2Store(this, this.settings.sessionCache.limit);
    this.secretStore = new ObsidianSecretStore(this.app);
    this.addSettingTab(new SettingsTab(this.app, this));
    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        var _a5;
        const providerSelection = this.selectLlmProvider();
        if (providerSelection.kind === "error") {
          new import_obsidian6.Notice(providerSelection.message, 8e3);
          return;
        }
        if (providerSelection.warning) {
          new import_obsidian6.Notice(providerSelection.warning, 6e3);
        }
        const noteRepository = new ObsidianNoteRepository(this.app);
        const createProposalUseCase = new CreateProposalUseCase(
          noteRepository,
          rawRefinedProfile,
          providerSelection.provider,
          this.sessionStore,
          this.settings.rawRefined,
          (_a5 = this.settings.promptOverrides) == null ? void 0 : _a5["raw-refined"]
        );
        const result = await createProposalUseCase.execute();
        if (result.kind === "created") {
          await this.openReviewForSession(result.session.id);
          return;
        }
        new import_obsidian6.Notice(formatCreateProposalMessage(this.settings.language, result), 8e3);
      }
    });
    this.addCommand({
      id: REOPEN_LAST_PROPOSAL_COMMAND_ID,
      name: "Reopen last proposal for current note",
      callback: async () => {
        var _a5, _b;
        const noteRepository = new ObsidianNoteRepository(this.app);
        const listUseCase = new ListRecoverableSessionsUseCase(this.sessionStore, noteRepository);
        const result = await listUseCase.execute();
        if (result.sessions.length === 0) {
          new import_obsidian6.Notice(t(this.settings.language, "sessionPicker.empty"), 6e3);
          return;
        }
        new SessionPickerModal(
          this.app,
          result.sessions,
          (_b = (_a5 = result.sessions[0]) == null ? void 0 : _a5.noteTitle) != null ? _b : "",
          result.notePath,
          this.settings.language,
          {
            onContinue: async (sessionId) => {
              await this.recoverAndOpenReview(sessionId);
            },
            onSaveDraft: async (sessionId) => {
              await this.saveDraft(sessionId, "manual-draft-from-picker");
            },
            onManualCopy: async (sessionId) => {
              await this.discardSession(sessionId);
              new import_obsidian6.Notice("Session content shown for manual copy. Copy and close the modal.", 6e3);
            },
            onRegenerate: () => {
            },
            onDiscard: async (sessionId) => {
              await this.discardSession(sessionId);
              new import_obsidian6.Notice("Session discarded.", 4e3);
            },
            onCancel: () => {
            }
          }
        ).open();
      }
    });
    this.addCommand({
      id: OPEN_CACHED_PROPOSAL_SESSION_COMMAND_ID,
      name: "Open cached proposal session",
      callback: async () => {
        await this.openCachedProposalSessionFlow();
      }
    });
  }
  onunload() {
    console.log("Obsidian Refined Layer unloaded");
  }
  getSettings() {
    return this.settings;
  }
  hasSecureSecretStorage() {
    return this.secretStore.isAvailable();
  }
  getSecretStorageDiagnostics() {
    return this.secretStore.getDiagnostics();
  }
  getSessionCacheInfo() {
    var _a5, _b, _c;
    return (_c = (_b = (_a5 = this.sessionCacheV2).getCacheInfo) == null ? void 0 : _b.call(_a5)) != null ? _c : {
      cachePath: ".obsidian/plugins/obsidian-refined-layer/session-cache",
      filePath: ".obsidian/plugins/obsidian-refined-layer/session-cache/sessions.v2.json",
      legacyFilePath: ".obsidian/plugins/obsidian-refined-layer/session-cache/sessions.v1.json",
      compatibilityStrategy: "ignore-v1",
      limit: this.settings.sessionCache.limit
    };
  }
  getErrorSessionCacheInfo() {
    return {
      cachePath: ERROR_SESSION_CACHE_PATH,
      filePath: ERROR_SESSION_CACHE_FILE_PATH,
      limit: this.settings.errorSessionCache.limit,
      defaultLimit: DEFAULT_ERROR_SESSION_CACHE_LIMIT
    };
  }
  async updateSettings(partial2) {
    var _a5, _b;
    this.settings = {
      ...this.settings,
      ...partial2
    };
    if (partial2.historyLimit !== void 0) {
      this.sessionStore.setHistoryLimit(this.settings.historyLimit);
    }
    if (partial2.sessionCache !== void 0) {
      await ((_b = (_a5 = this.sessionCacheV2).setSessionCacheLimit) == null ? void 0 : _b.call(_a5, this.settings.sessionCache.limit));
    }
    await this.settingsStore.save(this.settings);
  }
  async updateSessionCacheSettings(partial2) {
    const current = this.settings.sessionCache;
    const limit = normalizePositiveInteger(partial2.limit, current.limit);
    await this.updateSettings({
      sessionCache: {
        ...current,
        ...partial2,
        limit
      }
    });
  }
  async updateErrorSessionCacheSettings(partial2) {
    const current = this.settings.errorSessionCache;
    const limit = normalizePositiveInteger(partial2.limit, current.limit);
    await this.updateSettings({
      errorSessionCache: {
        ...current,
        ...partial2,
        limit
      }
    });
  }
  async updateProviderSettings(partial2) {
    var _a5;
    const currentProvider = (_a5 = this.settings.provider) != null ? _a5 : DEFAULT_PLUGIN_SETTINGS.provider;
    this.settings = {
      ...this.settings,
      provider: {
        type: currentProvider.type,
        ...currentProvider.model ? { model: currentProvider.model } : {},
        ...currentProvider.secretRef ? { secretRef: currentProvider.secretRef } : {},
        ...currentProvider.baseUrl ? { baseUrl: currentProvider.baseUrl } : {},
        ...partial2
      }
    };
    await this.settingsStore.save(this.settings);
  }
  async switchProviderType(type) {
    var _a5;
    const currentProvider = (_a5 = this.settings.provider) != null ? _a5 : DEFAULT_PLUGIN_SETTINGS.provider;
    const nextProvider = getDefaultProviderSettings(type);
    this.settings = {
      ...this.settings,
      provider: {
        ...nextProvider,
        ...type === currentProvider.type && currentProvider.model ? { model: currentProvider.model } : {},
        ...type === currentProvider.type && currentProvider.secretRef ? { secretRef: currentProvider.secretRef } : {},
        ...type === currentProvider.type && currentProvider.baseUrl ? { baseUrl: currentProvider.baseUrl } : {}
      }
    };
    await this.settingsStore.save(this.settings);
  }
  async saveProviderApiKey(secretRef, value) {
    if (!this.secretStore.isAvailable()) {
      new import_obsidian6.Notice(t(this.settings.language, "notice.provider.secretBlocked"), 8e3);
      return;
    }
    if (!secretRef.trim()) {
      new import_obsidian6.Notice(t(this.settings.language, "notice.provider.missingSecretRef"), 8e3);
      return;
    }
    if (!value.trim()) {
      return;
    }
    try {
      this.secretStore.setSecret(secretRef.trim(), value);
      new import_obsidian6.Notice(t(this.settings.language, "notice.provider.secretSaved"), 4e3);
    } catch (error51) {
      const message = error51 instanceof Error ? error51.message : String(error51);
      if (message.includes("Secret reference")) {
        new import_obsidian6.Notice(t(this.settings.language, "notice.provider.secretInvalidRef"), 8e3);
      } else {
        new import_obsidian6.Notice(
          t(this.settings.language, "notice.provider.error", { message: toSafeErrorMessage(error51) }),
          8e3
        );
      }
    }
  }
  async updatePromptOverride(field, value) {
    var _a5, _b, _c, _d, _e;
    const nextOverride = {
      enabled: value.trim().length > 0,
      systemPrompt: (_b = (_a5 = this.settings.promptOverrides) == null ? void 0 : _a5["raw-refined"]) == null ? void 0 : _b.systemPrompt,
      userPrompt: (_d = (_c = this.settings.promptOverrides) == null ? void 0 : _c["raw-refined"]) == null ? void 0 : _d.userPrompt,
      [field]: value
    };
    this.settings = {
      ...this.settings,
      promptOverrides: {
        ...(_e = this.settings.promptOverrides) != null ? _e : {},
        "raw-refined": nextOverride
      }
    };
    await this.settingsStore.save(this.settings);
  }
  async openReviewForSession(sessionId) {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return;
    }
    await this.sessionStore.updateSessionStatus(sessionId, "reviewing");
    const gate = new ObsidianReviewGate(this.app, this.settings.language, {
      onApplyNotice: async (decision) => {
        await this.sessionStore.updateSessionDecision(sessionId, decision);
        await this.applySelectedChanges(sessionId, decision);
      },
      onSaveDraftNotice: async (decision) => {
        await this.sessionStore.updateSessionDecision(sessionId, decision);
        await this.saveDraft(sessionId, void 0, decision);
      },
      onCancelNotice: () => {
        new import_obsidian6.Notice(t(this.settings.language, "review.placeholder.cancel"), 4e3);
      }
    });
    const requestReviewUseCase = new RequestReviewUseCase(gate);
    await requestReviewUseCase.execute(session);
  }
  async recoverAndOpenReview(sessionId) {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const recoverUseCase = new RecoverProposalSessionUseCase(this.sessionStore, noteRepository);
    const recovery = await recoverUseCase.execute(sessionId);
    if (!recovery) {
      new import_obsidian6.Notice("Session not found.", 6e3);
      return;
    }
    if (recovery.kind === "fresh") {
      await this.openReviewForSession(sessionId);
      return;
    }
    new import_obsidian6.Notice(
      t(this.settings.language, "sessionPicker.conflict", {
        reason: recovery.reason
      }),
      8e3
    );
    await this.sessionStore.updateSessionStatus(sessionId, "conflicted");
  }
  async discardSession(sessionId) {
    await this.sessionStore.updateSessionStatus(sessionId, "discarded");
  }
  async openCachedProposalSessionFlow() {
    const useCase = new OpenCachedSessionUseCase(this.sessionCacheV2);
    const sessions = await useCase.list();
    if (sessions.length === 0) {
      new import_obsidian6.Notice(t(this.settings.language, "cachedSessionPicker.empty"), 6e3);
      return;
    }
    new CachedSessionPickerModal(this.app, sessions, this.settings.language, {
      onOpenSession: async (sessionId) => {
        const session = await useCase.open(sessionId);
        if (!session) {
          new import_obsidian6.Notice(t(this.settings.language, "notice.cachedSession.notFound"), 6e3);
          return;
        }
        const modal = new ReviewModalV2(
          this.app,
          createReviewViewModelV2(session),
          this.settings.language,
          {
            onApply: () => {
              new import_obsidian6.Notice(t(this.settings.language, "notice.cachedSession.applyDisabled"), 6e3);
            },
            onSaveDraft: async (decision) => {
              await this.saveCachedDraft(session.id, decision);
            },
            onCloseWithoutDecision: () => {
              new import_obsidian6.Notice(t(this.settings.language, "review.placeholder.cancel"), 4e3);
            }
          },
          { applyDisabled: true }
        );
        modal.open();
      },
      onCancel: () => {
      }
    }).open();
  }
  async applySelectedChanges(sessionId, decision) {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const buildApplyPlanUseCase = new BuildApplyPlanUseCase(
      rawRefinedProfile,
      this.sessionStore,
      noteRepository
    );
    const planResult = await buildApplyPlanUseCase.execute(sessionId, decision);
    if (!planResult.ok) {
      new import_obsidian6.Notice(`Refined Layer: apply plan failed (${planResult.code}) - ${planResult.message}`, 8e3);
      return;
    }
    const applyDecisionUseCase = new ApplyDecisionUseCase(
      rawRefinedProfile,
      this.sessionStore,
      noteRepository
    );
    const applyResult = await applyDecisionUseCase.execute(planResult.plan);
    if (applyResult.kind === "applied") {
      await this.sessionStore.updateSessionStatus(sessionId, "applied");
      new import_obsidian6.Notice(`Refined Layer: applied selected changes to ${applyResult.notePath}.`, 6e3);
      return;
    }
    if (applyResult.kind === "conflict") {
      await this.sessionStore.updateSessionStatus(sessionId, "conflicted");
      new import_obsidian6.Notice(
        `Refined Layer: apply blocked by conflict (${applyResult.reason}). Options: ${applyResult.options.join(", ")}.`,
        8e3
      );
      return;
    }
    new import_obsidian6.Notice(`Refined Layer: apply failed (${applyResult.code}) - ${applyResult.message}`, 8e3);
  }
  async saveDraft(sessionId, conflictReason, decision) {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const saveDraftUseCase = new SaveDraftUseCase(this.sessionStore, noteRepository, this.settings);
    const result = await saveDraftUseCase.execute(sessionId, conflictReason, decision == null ? void 0 : decision.editedRefinedSections);
    if (result.saved) {
      await this.sessionStore.updateSessionStatus(sessionId, "saved_as_draft");
      new import_obsidian6.Notice(`Refined Layer: draft saved to ${result.draftPath}.`, 6e3);
      return;
    }
    new import_obsidian6.Notice(`Refined Layer: save draft failed - ${result.message}`, 8e3);
  }
  async saveCachedDraft(sessionId, decision) {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const saveDraftUseCase = new SaveDraftUseCase(this.sessionStore, noteRepository, this.settings, this.sessionCacheV2);
    const result = await saveDraftUseCase.executeV2(sessionId, decision);
    if (result.saved) {
      new import_obsidian6.Notice(`Refined Layer: draft saved to ${result.draftPath}.`, 6e3);
      return;
    }
    new import_obsidian6.Notice(`Refined Layer: save draft failed - ${result.message}`, 8e3);
  }
  selectLlmProvider() {
    var _a5, _b, _c, _d, _e, _f;
    const providerConfig = (_a5 = this.settings.provider) != null ? _a5 : DEFAULT_PLUGIN_SETTINGS.provider;
    const providerPreset = getProviderPreset(providerConfig.type);
    if (providerConfig.type === "mock") {
      return {
        kind: "provider",
        provider: new MockLlmProvider()
      };
    }
    if (providerPreset.requiresSecret && !this.secretStore.isAvailable()) {
      return {
        kind: "provider",
        provider: new MockLlmProvider(),
        warning: t(this.settings.language, "notice.provider.downgradedMock")
      };
    }
    if (!((_b = providerConfig.model) == null ? void 0 : _b.trim())) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.missingModel", {
          provider: providerConfig.type
        })
      };
    }
    if (providerPreset.allowsBaseUrlEdit && !((_c = providerConfig.baseUrl) == null ? void 0 : _c.trim())) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.missingBaseUrl", {
          provider: providerConfig.type
        })
      };
    }
    if (providerPreset.requiresSecret && !((_d = providerConfig.secretRef) == null ? void 0 : _d.trim())) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.missingSecretRef", {
          provider: providerConfig.type
        })
      };
    }
    if (providerPreset.requiresSecret) {
      try {
        const apiKey = this.secretStore.getSecret(providerConfig.secretRef.trim());
        if (!apiKey) {
          return {
            kind: "error",
            message: t(this.settings.language, "notice.provider.missingApiKey", {
              provider: providerConfig.type
            })
          };
        }
      } catch (e) {
        return {
          kind: "error",
          message: t(this.settings.language, "notice.provider.secretInvalidRef")
        };
      }
    }
    return {
      kind: "provider",
      provider: new OpenAICompatibleProvider({
        providerId: providerConfig.type,
        secretStore: this.secretStore,
        ...((_e = providerConfig.secretRef) == null ? void 0 : _e.trim()) ? { secretRef: providerConfig.secretRef.trim() } : {},
        model: providerConfig.model.trim(),
        ...((_f = providerConfig.baseUrl) == null ? void 0 : _f.trim()) ? { baseUrl: providerConfig.baseUrl.trim() } : {},
        requiresApiKey: providerPreset.requiresSecret
      })
    };
  }
};
function formatEligibilityMessage(result) {
  var _a5, _b, _c, _d, _e;
  if (!result.hasActiveMarkdownNote) {
    if (result.reason === "non-markdown-file") {
      const extension = (_a5 = result.extension) != null ? _a5 : "unknown";
      const notePath = (_b = result.notePath) != null ? _b : "(unknown path)";
      return `Refined Layer: active file is not Markdown (${extension}) - ${notePath}`;
    }
    return "Refined Layer: no active note is open.";
  }
  if (!result.eligible) {
    const reasons = (_d = (_c = result.failureReasons) == null ? void 0 : _c.join(", ")) != null ? _d : "unknown";
    return `Refined Layer: note is not eligible (${reasons}) - ${result.notePath}`;
  }
  return `Refined Layer: ${result.noteTitle} (${result.notePath}), raw content length ${(_e = result.rawContentLength) != null ? _e : 0}.`;
}
function normalizePositiveInteger(value, fallback) {
  if (value === void 0) return fallback;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
function formatCreateProposalMessage(language, result) {
  var _a5, _b;
  if (result.kind === "eligibility-failed") {
    return formatEligibilityMessage(result.eligibility);
  }
  if (result.kind === "provider-failed") {
    return t(language, "notice.provider.error", {
      message: result.message
    });
  }
  if (result.kind === "validation-failed") {
    const detail = result.errors.map((error51) => `${error51.layer}:${error51.code}`).join(", ");
    return `Refined Layer: proposal validation failed (${detail}).`;
  }
  const tokenUsage = (_b = (_a5 = result.session.tokenUsage) == null ? void 0 : _a5.totalTokens) != null ? _b : t(language, "review.token.unavailable");
  return `Refined Layer: proposal created for ${result.session.noteTitle}, session ${result.session.id}, tokens ${tokenUsage}.`;
}
