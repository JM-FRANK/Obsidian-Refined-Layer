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
var import_obsidian4 = require("obsidian");

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
};

// src/runtime/redaction.ts
var SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._\-]+/gi,
  /Authorization:\s*[^\s,;]+/gi,
  /api[_-]?key["']?\s*[:=]\s*["'][^"']+["']/gi,
  /token["']?\s*[:=]\s*["'][^"']+["']/gi
];
function redactSensitiveText(text) {
  return SECRET_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, "[REDACTED]"),
    text
  );
}
function toSafeErrorMessage(error) {
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }
  return redactSensitiveText(String(error));
}

// src/adapters/llm/OpenAICompatibleProvider.ts
var OpenAICompatibleProvider = class {
  constructor(options) {
    this.options = options;
    this.providerId = "openai-compatible";
    var _a;
    this.model = options.model;
    this.endpoint = (_a = options.endpoint) != null ? _a : "https://api.openai.com/v1/chat/completions";
  }
  async generateProposal(request) {
    var _a, _b, _c, _d, _e, _f;
    const apiKey = this.options.secretStore.getSecret(this.options.secretRef);
    if (!apiKey) {
      throw new Error("API key is missing for the configured secret reference.");
    }
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
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
    }).catch((error) => {
      throw new Error(toSafeErrorMessage(error));
    });
    const payload = await response.json().catch(() => {
      throw new Error("Provider returned a non-JSON response.");
    });
    if (!response.ok) {
      throw new Error(toSafeErrorMessage((_b = (_a = payload == null ? void 0 : payload.error) == null ? void 0 : _a.message) != null ? _b : response.statusText));
    }
    const rawText = String((_f = (_e = (_d = (_c = payload == null ? void 0 : payload.choices) == null ? void 0 : _c[0]) == null ? void 0 : _d.message) == null ? void 0 : _e.content) != null ? _f : "");
    return {
      rawText,
      parsedJson: tryParseJson(rawText),
      usage: normalizeUsage(payload == null ? void 0 : payload.usage, this.model)
    };
  }
};
function normalizeUsage(usage, model) {
  if (!usage) {
    return void 0;
  }
  return {
    provider: "openai-compatible",
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
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian.TFile) || file.extension !== "md") {
      return null;
    }
    const content = await this.app.vault.cachedRead(file);
    return {
      path: file.path,
      title: file.basename,
      content
    };
  }
  async writeNote(path, content) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian.TFile) || file.extension !== "md") {
      throw new Error(`Markdown note not found: ${path}`);
    }
    await this.app.vault.modify(file, content);
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

// src/adapters/obsidian/ObsidianSecretStore.ts
var SECRET_ID_PATTERN = /^[a-z0-9-]+$/;
var ObsidianSecretStore = class {
  constructor(app) {
    this.app = app;
  }
  isAvailable() {
    const maybeSecretStorage = this.app.secretStorage;
    return typeof (maybeSecretStorage == null ? void 0 : maybeSecretStorage.getSecret) === "function" && typeof (maybeSecretStorage == null ? void 0 : maybeSecretStorage.setSecret) === "function";
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

// src/settings/PluginSettings.ts
var DEFAULT_PLUGIN_SETTINGS = {
  language: "zh-CN",
  historyLimit: 5,
  draftFolder: "80_Runtime/refine-drafts",
  provider: {
    type: "mock"
  },
  promptOverrides: {}
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
  var _a, _b;
  const loaded = typeof value === "object" && value !== null ? value : {};
  return {
    ...DEFAULT_PLUGIN_SETTINGS,
    ...loaded,
    provider: (_a = loaded.provider) != null ? _a : DEFAULT_PLUGIN_SETTINGS.provider,
    promptOverrides: (_b = loaded.promptOverrides) != null ? _b : DEFAULT_PLUGIN_SETTINGS.promptOverrides
  };
}
function sanitizeSettings(settings) {
  var _a;
  return {
    language: settings.language,
    historyLimit: settings.historyLimit,
    draftFolder: settings.draftFolder,
    provider: settings.provider ? {
      type: settings.provider.type,
      ...settings.provider.model ? { model: settings.provider.model } : {},
      ...settings.provider.secretRef ? { secretRef: settings.provider.secretRef } : {}
    } : void 0,
    promptOverrides: (_a = settings.promptOverrides) != null ? _a : {}
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

// src/core/protected-region/hash.ts
var import_node_crypto = require("node:crypto");
function hashText(text) {
  return (0, import_node_crypto.createHash)("sha256").update(text, "utf8").digest("hex");
}

// src/core/protected-region/ProtectedRegionExtractor.ts
var ProtectedRegionExtractor = class {
  extract(markdown, definition) {
    var _a;
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
    const regionStart = (_a = matches[0].index) != null ? _a : 0;
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

// src/application/ApplyDecisionUseCase.ts
var ApplyDecisionUseCase = class {
  constructor(profile, sessionStore, noteFilePort) {
    this.profile = profile;
    this.sessionStore = sessionStore;
    this.noteFilePort = noteFilePort;
    this.extractor = new ProtectedRegionExtractor();
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
      rawRefinedProfile.protectedRegions.definitions[0]
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
          nextContent = mergeBodyIntoMarkdown(nextContent, operation.body);
          break;
        case "update-frontmatter":
          nextContent = applyFrontmatterChanges(nextContent, operation.changes);
          break;
        case "update-tags":
          nextContent = applyTagChanges(nextContent, operation.add, operation.remove, this.profile);
          break;
      }
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
};
function mergeBodyIntoMarkdown(markdown, body) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const hasFrontmatter = normalized.startsWith("---\n") || normalized.startsWith("---\r\n");
  if (!hasFrontmatter) {
    return body;
  }
  const closingMarkerIndex = normalized.indexOf("\n---\n", 4);
  if (closingMarkerIndex === -1) {
    return body;
  }
  const frontmatterBlock = normalized.slice(0, closingMarkerIndex + 5);
  return `${frontmatterBlock}${body.startsWith("\n") ? "" : "\n"}${body}`;
}

// src/core/apply/ApplyPlanner.ts
var ApplyPlanner = class {
  buildPlan(session, decision, body) {
    var _a, _b, _c, _d, _e;
    const operations = [];
    if (decision.acceptBody && body) {
      operations.push({
        type: "replace-refined-body",
        targetPath: session.notePath,
        body
      });
    }
    const frontmatterChanges = {
      ...decision.acceptFrontmatter.status && ((_a = session.proposal.frontmatterSuggestion) == null ? void 0 : _a.status) ? { status: session.proposal.frontmatterSuggestion.status } : {},
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
      var _a2, _b2;
      return (_b2 = (_a2 = session.proposal.tagSuggestion) == null ? void 0 : _a2.add) == null ? void 0 : _b2.includes(tag);
    });
    const remove = ((_e = decision.acceptTags.remove) != null ? _e : []).filter((tag) => {
      var _a2, _b2;
      return (_b2 = (_a2 = session.proposal.tagSuggestion) == null ? void 0 : _a2.remove) == null ? void 0 : _b2.includes(tag);
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
  assemble(session, currentContent, refinedSections) {
    const protectedRegion = this.extractor.extract(
      currentContent,
      rawRefinedProfile.protectedRegions.definitions[0]
    );
    if (!protectedRegion.ok) {
      return protectedRegion;
    }
    const refinedBody = buildRefinedBodyPreview(refinedSections != null ? refinedSections : session.proposal.refinedSections);
    const body = `${refinedBody}

${protectedRegion.region.text}`;
    if (!body.endsWith(protectedRegion.region.text)) {
      return {
        ok: false,
        error: {
          code: "empty-protected-region",
          message: "Protected region text was not preserved during body assembly."
        }
      };
    }
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
    const candidates = [output.trim(), extractJsonBlock(output)];
    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
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
    var _a, _b, _c, _d;
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
    const tags = [...(_b = (_a = proposal.tagSuggestion) == null ? void 0 : _a.add) != null ? _b : [], ...(_d = (_c = proposal.tagSuggestion) == null ? void 0 : _c.remove) != null ? _d : []];
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
    var _a;
    const errors = [];
    const protectedRegionText = (_a = context.protectedRegionText) == null ? void 0 : _a.trim();
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
  var _a, _b;
  const fencedMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (_b = (_a = fencedMatch == null ? void 0 : fencedMatch[1]) == null ? void 0 : _a.trim()) != null ? _b : null;
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
  constructor(profile, sessionStore, noteFilePort) {
    this.sessionStore = sessionStore;
    this.noteFilePort = noteFilePort;
    this.planner = new ApplyPlanner();
    this.bodyAssembler = new BodyAssembler();
    this.protectedRegionExtractor = new ProtectedRegionExtractor();
    this.policyGuard = new PolicyGuard(profile);
    this.proposalValidator = new ProposalValidator(profile);
  }
  async execute(sessionId, decision) {
    var _a;
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
      const editedSections = (_a = guardedDecision.editedRefinedSections) != null ? _a : session.proposal.refinedSections;
      const protectedRegion = this.protectedRegionExtractor.extract(
        note.content,
        rawRefinedProfile.protectedRegions.definitions[0]
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
      const assembled = this.bodyAssembler.assemble(session, note.content, validation.refinedSections);
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

// src/application/CheckEligibilityUseCase.ts
var CheckEligibilityUseCase = class {
  constructor(noteRepository, profile) {
    this.noteRepository = noteRepository;
    this.profile = profile;
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
    const headingPattern = new RegExp(`^${escapeRegExp2(this.profile.eligibility.requiredHeading)}\\s*$`, "m");
    if (!headingPattern.test(activeNote.note.content)) {
      failureReasons.push("missingOriginalContentHeading");
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
function escapeRegExp2(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/application/CreateProposalUseCase.ts
var CreateProposalUseCase = class {
  constructor(noteRepository, profile, llmProvider, sessionStore, promptOverride) {
    this.noteRepository = noteRepository;
    this.profile = profile;
    this.llmProvider = llmProvider;
    this.sessionStore = sessionStore;
    this.promptOverride = promptOverride;
    this.tokenUsageReporter = new TokenUsageReporter();
    this.eligibilityUseCase = new CheckEligibilityUseCase(noteRepository, profile);
    this.proposalValidator = new ProposalValidator(profile);
    this.protectedRegionExtractor = new ProtectedRegionExtractor();
  }
  async execute() {
    var _a, _b;
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
    const systemPrompt = renderPromptTemplate(
      ((_a = this.promptOverride) == null ? void 0 : _a.enabled) && this.promptOverride.systemPrompt ? this.promptOverride.systemPrompt : this.profile.prompt.systemPrompt,
      lookup.note
    );
    const userPrompt = renderPromptTemplate(
      ((_b = this.promptOverride) == null ? void 0 : _b.enabled) && this.promptOverride.userPrompt ? this.promptOverride.userPrompt : this.profile.prompt.userPrompt,
      lookup.note
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
    } catch (error) {
      return {
        kind: "provider-failed",
        message: toSafeErrorMessage(error)
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
};
function createSessionId() {
  return `proposal-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function renderPromptTemplate(template, note) {
  return template.split("{{notePath}}").join(note.path).split("{{noteTitle}}").join(note.title).split("{{noteContent}}").join(note.content);
}

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
  constructor(sessionStore, noteFilePort, settings) {
    this.sessionStore = sessionStore;
    this.noteFilePort = noteFilePort;
    this.settings = settings;
  }
  async execute(sessionId, conflictReason, editedRefinedSections) {
    var _a, _b, _c;
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
      `- token usage: ${(_b = (_a = session.tokenUsage) == null ? void 0 : _a.countingMode) != null ? _b : "unavailable"}`,
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
};
function sanitizeFileName(value) {
  return value.replace(/[<>:"/\\|?*]/g, "-");
}

// src/runtime/ProposalSessionStore.ts
var DEFAULT_HISTORY_LIMIT = 5;
var ProposalSessionStore = class {
  constructor(historyLimit = DEFAULT_HISTORY_LIMIT) {
    this.sessionsById = /* @__PURE__ */ new Map();
    this.sessionsByNotePath = /* @__PURE__ */ new Map();
    this.historyLimit = historyLimit;
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
  }
  async save(session) {
    var _a;
    this.sessionsById.set(session.id, session);
    const existing = (_a = this.sessionsByNotePath.get(session.notePath)) != null ? _a : [];
    const withoutCurrent = existing.filter((item) => item.id !== session.id);
    const next = [session, ...withoutCurrent].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, this.historyLimit);
    this.sessionsByNotePath.set(session.notePath, next);
    const preservedIds = new Set(next.map((item) => item.id));
    for (const previous of withoutCurrent) {
      if (!preservedIds.has(previous.id)) {
        this.sessionsById.delete(previous.id);
      }
    }
  }
  async get(sessionId) {
    var _a;
    return (_a = this.sessionsById.get(sessionId)) != null ? _a : null;
  }
  async getLatestSessionForNote(notePath) {
    var _a, _b;
    const sessions = (_a = this.sessionsByNotePath.get(notePath)) != null ? _a : [];
    return (_b = sessions[0]) != null ? _b : null;
  }
  async listSessionsForNote(notePath) {
    var _a;
    const sessions = (_a = this.sessionsByNotePath.get(notePath)) != null ? _a : [];
    return sessions.map((session) => ({
      id: session.id,
      notePath: session.notePath,
      noteTitle: session.noteTitle,
      status: session.status,
      updatedAt: session.updatedAt
    }));
  }
};

// src/ui/i18n/en.ts
var enStrings = {
  "review.title": "Refined Proposal Review",
  "review.noteMeta": "{title} \xB7 {path}",
  "review.section.body": "Editable refined body",
  "review.section.frontmatter": "YAML suggestions",
  "review.section.tags": "Tag suggestions",
  "review.section.tokenUsage": "Token Usage",
  "review.section.warnings": "Warnings",
  "review.empty.none": "None",
  "review.toggle.body": "Accept body changes",
  "review.toggle.frontmatter.status": "Accept status change",
  "review.toggle.frontmatter.source": "Accept source change",
  "review.toggle.frontmatter.context": "Accept context change",
  "review.toggle.tag.add": "Accept added tag: {tag}",
  "review.toggle.tag.remove": "Accept removed tag: {tag}",
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
  "settings.title.secretRef": "Secret reference",
  "settings.title.apiKey": "API key",
  "settings.title.language": "Language",
  "settings.title.historyLimit": "History limit",
  "settings.title.draftFolder": "Draft folder",
  "settings.title.promptProfile": "Prompt Override Profile",
  "settings.title.systemPrompt": "System Prompt Override",
  "settings.title.userPrompt": "User Prompt Override",
  "settings.desc.language": "Controls the language used for plugin UI strings.",
  "settings.desc.historyLimit": "How many proposal sessions to keep per note.",
  "settings.desc.draftFolder": "Target folder for future Save as Draft output.",
  "settings.desc.promptProfile": "Only raw-refined profile override is supported in v0.1.0.",
  "settings.desc.promptVariables": "Available variables: {{notePath}} {{noteTitle}} {{noteContent}}",
  "settings.desc.systemPrompt": "Low-level override only. No highlighting, autocomplete, or advanced validation.",
  "settings.desc.userPrompt": "Low-level override only. No highlighting, autocomplete, or advanced validation.",
  "settings.desc.providerType": "Choose mock-llm or openai-compatible provider.",
  "settings.desc.providerModel": "Required only for openai-compatible provider.",
  "settings.desc.secretRef": "Lowercase letters, numbers, and dashes only. data.json stores only this reference.",
  "settings.desc.apiKey": "Stored only in Obsidian SecretStorage when available.",
  "settings.warning.secretUnavailable": "This environment does not support secure secret storage. Direct LLM calls are disabled and the plugin will fall back to mock-llm.",
  "settings.option.language.zh-CN": "Simplified Chinese",
  "settings.option.language.en": "English",
  "settings.option.provider.mock": "mock-llm",
  "settings.option.provider.openai": "openai-compatible",
  "notice.review.reopened": "Reopened last proposal: {sessionId} \xB7 {title} \xB7 token usage {mode}",
  "notice.review.noSession": "No saved proposal session for the current note: {path}",
  "notice.provider.downgradedMock": "Secure secret storage is unavailable. Falling back to mock-llm.",
  "notice.provider.missingModel": "OpenAI-compatible provider requires a model name.",
  "notice.provider.missingSecretRef": "OpenAI-compatible provider requires a secret reference.",
  "notice.provider.missingApiKey": "No API key is stored for the configured secret reference.",
  "notice.provider.secretSaved": "API key saved to secure secret storage.",
  "notice.provider.secretBlocked": "Cannot save API key because secure secret storage is unavailable.",
  "notice.provider.secretInvalidRef": "Secret reference must use lowercase letters, numbers, and dashes only.",
  "notice.provider.error": "Provider error: {message}"
};

// src/ui/i18n/zh-CN.ts
var zhCNStrings = {
  "review.title": "Refined Proposal \u5BA1\u6838",
  "review.noteMeta": "{title} \xB7 {path}",
  "review.section.body": "Refined \u6B63\u6587\u7F16\u8F91",
  "review.section.frontmatter": "YAML \u4FEE\u6539\u5EFA\u8BAE",
  "review.section.tags": "\u6807\u7B7E\u4FEE\u6539\u5EFA\u8BAE",
  "review.section.tokenUsage": "Token Usage",
  "review.section.warnings": "Warnings",
  "review.empty.none": "\u65E0",
  "review.toggle.body": "\u63A5\u53D7\u6B63\u6587\u4FEE\u6539",
  "review.toggle.frontmatter.status": "\u63A5\u53D7 status \u4FEE\u6539",
  "review.toggle.frontmatter.source": "\u63A5\u53D7 source \u4FEE\u6539",
  "review.toggle.frontmatter.context": "\u63A5\u53D7 context \u4FEE\u6539",
  "review.toggle.tag.add": "\u63A5\u53D7\u65B0\u589E\u6807\u7B7E\uFF1A{tag}",
  "review.toggle.tag.remove": "\u63A5\u53D7\u79FB\u9664\u6807\u7B7E\uFF1A{tag}",
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
  "settings.title.secretRef": "Secret Reference",
  "settings.title.apiKey": "API Key",
  "settings.title.language": "\u754C\u9762\u8BED\u8A00",
  "settings.title.historyLimit": "\u5386\u53F2\u8BB0\u5F55\u4E0A\u9650",
  "settings.title.draftFolder": "\u8349\u7A3F\u76EE\u5F55",
  "settings.title.promptProfile": "Prompt Override Profile",
  "settings.title.systemPrompt": "System Prompt Override",
  "settings.title.userPrompt": "User Prompt Override",
  "settings.desc.language": "\u8BFB\u53D6\u5E76\u663E\u793A\u63D2\u4EF6 UI \u6587\u6848\u8BED\u8A00\u3002",
  "settings.desc.historyLimit": "\u6309\u7B14\u8BB0\u4FDD\u7559\u7684 proposal session \u6570\u91CF\u3002",
  "settings.desc.draftFolder": "\u672A\u6765 Save as Draft \u7684\u76EE\u6807\u76EE\u5F55\u3002",
  "settings.desc.promptProfile": "\u5F53\u524D\u4EC5\u8986\u76D6 raw-refined profile\u3002",
  "settings.desc.promptVariables": "\u53EF\u7528\u53D8\u91CF\uFF1A{{notePath}} {{noteTitle}} {{noteContent}}",
  "settings.desc.systemPrompt": "\u4F4E\u7EA7\u8986\u76D6\u9879\uFF0C\u4E0D\u63D0\u4F9B\u9AD8\u4EAE\u3001\u8865\u5168\u6216\u590D\u6742\u6821\u9A8C\u3002",
  "settings.desc.userPrompt": "\u4F4E\u7EA7\u8986\u76D6\u9879\uFF0C\u4E0D\u63D0\u4F9B\u9AD8\u4EAE\u3001\u8865\u5168\u6216\u590D\u6742\u6821\u9A8C\u3002",
  "settings.desc.providerType": "\u9009\u62E9 mock-llm \u6216 openai-compatible provider\u3002",
  "settings.desc.providerModel": "\u4EC5\u5728 openai-compatible provider \u4E0B\u5FC5\u586B\u3002",
  "settings.desc.secretRef": "\u4EC5\u5141\u8BB8\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u8FDE\u5B57\u7B26\uFF1Bdata.json \u53EA\u4FDD\u5B58\u8FD9\u4E2A\u5F15\u7528\u3002",
  "settings.desc.apiKey": "\u53EF\u7528\u65F6\u4EC5\u4FDD\u5B58\u5230 Obsidian SecretStorage\u3002",
  "settings.warning.secretUnavailable": "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5B89\u5168\u5B58\u50A8 API key\uFF0C\u771F\u5B9E LLM \u76F4\u8FDE\u80FD\u529B\u5DF2\u7981\u7528\uFF0C\u63D2\u4EF6\u5C06\u964D\u7EA7\u4E3A mock-llm\u3002",
  "settings.option.language.zh-CN": "\u7B80\u4F53\u4E2D\u6587",
  "settings.option.language.en": "English",
  "settings.option.provider.mock": "mock-llm",
  "settings.option.provider.openai": "openai-compatible",
  "notice.review.reopened": "\u5DF2\u6062\u590D\u6700\u8FD1 proposal\uFF1A{sessionId} \xB7 {title} \xB7 token usage {mode}",
  "notice.review.noSession": "\u5F53\u524D\u7B14\u8BB0\u6CA1\u6709\u53EF\u6062\u590D\u7684 proposal session\uFF1A{path}",
  "notice.provider.downgradedMock": "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5B89\u5168 secret \u5B58\u50A8\uFF0C\u5DF2\u964D\u7EA7\u4E3A mock-llm\u3002",
  "notice.provider.missingModel": "openai-compatible provider \u9700\u8981\u914D\u7F6E\u6A21\u578B\u540D\u3002",
  "notice.provider.missingSecretRef": "openai-compatible provider \u9700\u8981\u914D\u7F6E secret reference\u3002",
  "notice.provider.missingApiKey": "\u5F53\u524D secret reference \u4E0B\u6CA1\u6709\u4FDD\u5B58 API key\u3002",
  "notice.provider.secretSaved": "API key \u5DF2\u4FDD\u5B58\u5230\u5B89\u5168 SecretStorage\u3002",
  "notice.provider.secretBlocked": "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5B89\u5168 secret \u5B58\u50A8\uFF0C\u65E0\u6CD5\u4FDD\u5B58 API key\u3002",
  "notice.provider.secretInvalidRef": "Secret reference \u53EA\u80FD\u5305\u542B\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u8FDE\u5B57\u7B26\u3002",
  "notice.provider.error": "Provider \u9519\u8BEF\uFF1A{message}"
};

// src/ui/i18n/index.ts
var dictionaries = {
  "zh-CN": zhCNStrings,
  en: enStrings
};
function t(language, key, variables = {}) {
  var _a, _b;
  const template = (_b = (_a = dictionaries[language][key]) != null ? _a : dictionaries.en[key]) != null ? _b : key;
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
        var _a;
        const next = new Set((_a = this.decision.acceptTags.add) != null ? _a : []);
        checked ? next.add(tag) : next.delete(tag);
        this.decision.acceptTags.add = [...next];
      });
    }
    for (const tag of this.viewModel.tagSuggestions.remove) {
      this.createCheckboxRow(section, t(this.language, "review.toggle.tag.remove", { tag }), false, (checked) => {
        var _a;
        const next = new Set((_a = this.decision.acceptTags.remove) != null ? _a : []);
        checked ? next.add(tag) : next.delete(tag);
        this.decision.acceptTags.remove = [...next];
      });
    }
  }
  renderTokenUsageSection(container) {
    var _a;
    const section = container.createDiv("obsidian-refined-layer-section");
    section.createEl("h3", { text: t(this.language, "review.section.tokenUsage") });
    const usage = this.viewModel.tokenUsage;
    section.createEl("p", {
      text: usage ? t(this.language, "review.token.summary", {
        provider: usage.provider,
        model: usage.model,
        mode: usage.countingMode,
        total: (_a = usage.totalTokens) != null ? _a : t(this.language, "review.token.unavailable")
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
    var _a;
    this.decision.editedRefinedSections = {
      ...(_a = this.decision.editedRefinedSections) != null ? _a : {},
      [key]: value
    };
  }
};

// src/ui/review/ReviewViewModel.ts
function createReviewViewModel(session) {
  var _a, _b, _c, _d, _e, _f, _g;
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
      add: (_b = (_a = session.proposal.tagSuggestion) == null ? void 0 : _a.add) != null ? _b : [],
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
    var _a;
    return {
      key,
      heading: SECTION_HEADINGS[key],
      content: (_a = refinedSections[key]) != null ? _a : "",
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
          var _a, _b;
          void ((_b = (_a = this.handlers) == null ? void 0 : _a.onApplyNotice) == null ? void 0 : _b.call(_a, decision));
          resolve({ action: "apply", decision });
        },
        onSaveDraft: (decision) => {
          var _a, _b;
          void ((_b = (_a = this.handlers) == null ? void 0 : _a.onSaveDraftNotice) == null ? void 0 : _b.call(_a, decision));
          resolve({ action: "save-draft", decision });
        },
        onCloseWithoutDecision: () => {
          var _a, _b;
          void ((_b = (_a = this.handlers) == null ? void 0 : _a.onCancelNotice) == null ? void 0 : _b.call(_a));
          resolve({ action: "cancel" });
        }
      });
      modal.open();
    });
  }
};

// src/ui/settings/SettingsTab.ts
var import_obsidian3 = require("obsidian");
var SettingsTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    const settings = this.plugin.getSettings();
    const secretAvailable = this.plugin.hasSecureSecretStorage();
    containerEl.empty();
    new import_obsidian3.Setting(containerEl).setName(t(settings.language, "settings.title.language")).setDesc(t(settings.language, "settings.desc.language")).addDropdown((dropdown) => {
      dropdown.addOption("zh-CN", t(settings.language, "settings.option.language.zh-CN")).addOption("en", t(settings.language, "settings.option.language.en")).setValue(settings.language).onChange(async (value) => {
        await this.plugin.updateSettings({ language: value });
        this.display();
      });
    });
    new import_obsidian3.Setting(containerEl).setName(t(settings.language, "settings.title.historyLimit")).setDesc(t(settings.language, "settings.desc.historyLimit")).addText((text) => {
      text.setPlaceholder("5").setValue(String(settings.historyLimit)).onChange(async (value) => {
        const parsed = Number.parseInt(value, 10);
        await this.plugin.updateSettings({
          historyLimit: Number.isFinite(parsed) && parsed > 0 ? parsed : settings.historyLimit
        });
      });
    });
    new import_obsidian3.Setting(containerEl).setName(t(settings.language, "settings.title.draftFolder")).setDesc(t(settings.language, "settings.desc.draftFolder")).addText((text) => {
      text.setValue(settings.draftFolder).onChange(async (value) => {
        await this.plugin.updateSettings({ draftFolder: value.trim() || settings.draftFolder });
      });
    });
    const providerSetting = new import_obsidian3.Setting(containerEl).setName(t(settings.language, "settings.title.providerType")).setDesc(secretAvailable ? t(settings.language, "settings.desc.providerType") : t(settings.language, "settings.warning.secretUnavailable"));
    providerSetting.addDropdown((dropdown) => {
      var _a, _b;
      dropdown.addOption("mock", t(settings.language, "settings.option.provider.mock")).addOption("openai-compatible", t(settings.language, "settings.option.provider.openai")).setValue((_b = (_a = settings.provider) == null ? void 0 : _a.type) != null ? _b : "mock").setDisabled(!secretAvailable).onChange(async (value) => {
        await this.plugin.updateProviderSettings({
          type: value
        });
        this.display();
      });
    });
    const modelSetting = new import_obsidian3.Setting(containerEl).setName(t(settings.language, "settings.title.providerModel")).setDesc(t(settings.language, "settings.desc.providerModel")).setDisabled(!secretAvailable);
    modelSetting.addText((text) => {
      var _a, _b;
      text.setValue((_b = (_a = settings.provider) == null ? void 0 : _a.model) != null ? _b : "").setDisabled(!secretAvailable).onChange(async (value) => {
        await this.plugin.updateProviderSettings({ model: value.trim() });
      });
    });
    const secretRefSetting = new import_obsidian3.Setting(containerEl).setName(t(settings.language, "settings.title.secretRef")).setDesc(t(settings.language, "settings.desc.secretRef")).setDisabled(!secretAvailable);
    secretRefSetting.addText((text) => {
      var _a, _b;
      text.setValue((_b = (_a = settings.provider) == null ? void 0 : _a.secretRef) != null ? _b : "").setDisabled(!secretAvailable).onChange(async (value) => {
        await this.plugin.updateProviderSettings({ secretRef: value.trim() });
      });
    });
    const apiKeySetting = new import_obsidian3.Setting(containerEl).setName(t(settings.language, "settings.title.apiKey")).setDesc(t(settings.language, "settings.desc.apiKey")).setDisabled(!secretAvailable);
    if (secretAvailable) {
      const secretComponent = new import_obsidian3.SecretComponent(this.app, apiKeySetting.controlEl);
      secretComponent.setValue("");
      secretComponent.onChange(async (value) => {
        var _a, _b;
        const secretRef = (_b = (_a = this.plugin.getSettings().provider) == null ? void 0 : _a.secretRef) != null ? _b : "";
        await this.plugin.saveProviderApiKey(secretRef, value);
      });
    }
    new import_obsidian3.Setting(containerEl).setName(t(settings.language, "settings.title.promptProfile")).setDesc(t(settings.language, "settings.desc.promptProfile"));
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
    var _a, _b, _c;
    const setting = new import_obsidian3.Setting(containerEl).setName(title).setDesc(description);
    setting.controlEl.createDiv();
    const textArea = new import_obsidian3.TextAreaComponent(setting.controlEl);
    textArea.inputEl.rows = 5;
    textArea.inputEl.cols = 40;
    textArea.setValue((_c = (_b = (_a = settings.promptOverrides) == null ? void 0 : _a["raw-refined"]) == null ? void 0 : _b[field]) != null ? _c : "");
    textArea.onChange(async (value) => {
      await this.plugin.updatePromptOverride(field, value);
    });
  }
};

// src/main.ts
var REFINE_COMMAND_ID = "refine-current-note";
var REOPEN_LAST_PROPOSAL_COMMAND_ID = "reopen-last-proposal-for-current-note";
var ObsidianRefinedLayerPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_PLUGIN_SETTINGS;
    this.settingsStore = new ObsidianSettingsStore(this);
    this.sessionStore = new ProposalSessionStore(DEFAULT_PLUGIN_SETTINGS.historyLimit);
    this.secretStore = new ObsidianSecretStore(this.app);
  }
  async onload() {
    this.settings = await this.settingsStore.load();
    this.sessionStore = new ProposalSessionStore(this.settings.historyLimit);
    this.secretStore = new ObsidianSecretStore(this.app);
    this.addSettingTab(new SettingsTab(this.app, this));
    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        var _a;
        const providerSelection = this.selectLlmProvider();
        if (providerSelection.kind === "error") {
          new import_obsidian4.Notice(providerSelection.message, 8e3);
          return;
        }
        if (providerSelection.warning) {
          new import_obsidian4.Notice(providerSelection.warning, 6e3);
        }
        const noteRepository = new ObsidianNoteRepository(this.app);
        const createProposalUseCase = new CreateProposalUseCase(
          noteRepository,
          rawRefinedProfile,
          providerSelection.provider,
          this.sessionStore,
          (_a = this.settings.promptOverrides) == null ? void 0 : _a["raw-refined"]
        );
        const result = await createProposalUseCase.execute();
        if (result.kind === "created") {
          await this.openReviewForSession(result.session.id);
          return;
        }
        new import_obsidian4.Notice(formatCreateProposalMessage(this.settings.language, result), 8e3);
      }
    });
    this.addCommand({
      id: REOPEN_LAST_PROPOSAL_COMMAND_ID,
      name: "Reopen last proposal for current note",
      callback: async () => {
        var _a, _b;
        const noteRepository = new ObsidianNoteRepository(this.app);
        const activeNote = await noteRepository.getActiveNote();
        if (activeNote.kind !== "markdown") {
          new import_obsidian4.Notice(formatEligibilityMessage(activeNoteToEligibility(activeNote)), 6e3);
          return;
        }
        const session = await this.sessionStore.getLatestSessionForNote(activeNote.note.path);
        if (!session) {
          new import_obsidian4.Notice(
            t(this.settings.language, "notice.review.noSession", {
              path: activeNote.note.path
            }),
            6e3
          );
          return;
        }
        new import_obsidian4.Notice(
          t(this.settings.language, "notice.review.reopened", {
            sessionId: session.id,
            title: session.noteTitle,
            mode: (_b = (_a = session.tokenUsage) == null ? void 0 : _a.countingMode) != null ? _b : "unavailable"
          }),
          6e3
        );
        await this.openReviewForSession(session.id);
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
  async updateSettings(partial) {
    this.settings = {
      ...this.settings,
      ...partial
    };
    if (partial.historyLimit !== void 0) {
      this.sessionStore.setHistoryLimit(this.settings.historyLimit);
    }
    await this.settingsStore.save(this.settings);
  }
  async updateProviderSettings(partial) {
    var _a;
    const currentProvider = (_a = this.settings.provider) != null ? _a : DEFAULT_PLUGIN_SETTINGS.provider;
    this.settings = {
      ...this.settings,
      provider: {
        type: currentProvider.type,
        ...currentProvider.model ? { model: currentProvider.model } : {},
        ...currentProvider.secretRef ? { secretRef: currentProvider.secretRef } : {},
        ...partial
      }
    };
    await this.settingsStore.save(this.settings);
  }
  async saveProviderApiKey(secretRef, value) {
    if (!this.secretStore.isAvailable()) {
      new import_obsidian4.Notice(t(this.settings.language, "notice.provider.secretBlocked"), 8e3);
      return;
    }
    if (!secretRef.trim()) {
      new import_obsidian4.Notice(t(this.settings.language, "notice.provider.missingSecretRef"), 8e3);
      return;
    }
    try {
      this.secretStore.setSecret(secretRef.trim(), value);
      new import_obsidian4.Notice(t(this.settings.language, "notice.provider.secretSaved"), 4e3);
    } catch (error) {
      new import_obsidian4.Notice(
        error instanceof Error && error.message.includes("Secret reference") ? t(this.settings.language, "notice.provider.secretInvalidRef") : t(this.settings.language, "notice.provider.secretBlocked"),
        8e3
      );
    }
  }
  async updatePromptOverride(field, value) {
    var _a, _b, _c, _d, _e;
    const nextOverride = {
      enabled: value.trim().length > 0,
      systemPrompt: (_b = (_a = this.settings.promptOverrides) == null ? void 0 : _a["raw-refined"]) == null ? void 0 : _b.systemPrompt,
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
    const gate = new ObsidianReviewGate(this.app, this.settings.language, {
      onApplyNotice: async (decision) => {
        await this.applySelectedChanges(sessionId, decision);
      },
      onSaveDraftNotice: async (decision) => {
        await this.saveDraft(sessionId, void 0, decision);
      },
      onCancelNotice: () => {
        new import_obsidian4.Notice(t(this.settings.language, "review.placeholder.cancel"), 4e3);
      }
    });
    const requestReviewUseCase = new RequestReviewUseCase(gate);
    await requestReviewUseCase.execute(session);
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
      new import_obsidian4.Notice(`Refined Layer: apply plan failed (${planResult.code}) - ${planResult.message}`, 8e3);
      return;
    }
    const applyDecisionUseCase = new ApplyDecisionUseCase(
      rawRefinedProfile,
      this.sessionStore,
      noteRepository
    );
    const applyResult = await applyDecisionUseCase.execute(planResult.plan);
    if (applyResult.kind === "applied") {
      new import_obsidian4.Notice(`Refined Layer: applied selected changes to ${applyResult.notePath}.`, 6e3);
      return;
    }
    if (applyResult.kind === "conflict") {
      new import_obsidian4.Notice(
        `Refined Layer: apply blocked by conflict (${applyResult.reason}). Options: ${applyResult.options.join(", ")}.`,
        8e3
      );
      return;
    }
    new import_obsidian4.Notice(`Refined Layer: apply failed (${applyResult.code}) - ${applyResult.message}`, 8e3);
  }
  async saveDraft(sessionId, conflictReason, decision) {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const saveDraftUseCase = new SaveDraftUseCase(this.sessionStore, noteRepository, this.settings);
    const result = await saveDraftUseCase.execute(sessionId, conflictReason, decision == null ? void 0 : decision.editedRefinedSections);
    if (result.saved) {
      new import_obsidian4.Notice(`Refined Layer: draft saved to ${result.draftPath}.`, 6e3);
      return;
    }
    new import_obsidian4.Notice(`Refined Layer: save draft failed - ${result.message}`, 8e3);
  }
  selectLlmProvider() {
    var _a, _b, _c;
    const providerConfig = (_a = this.settings.provider) != null ? _a : DEFAULT_PLUGIN_SETTINGS.provider;
    if (providerConfig.type !== "openai-compatible") {
      return {
        kind: "provider",
        provider: new MockLlmProvider()
      };
    }
    if (!this.secretStore.isAvailable()) {
      return {
        kind: "provider",
        provider: new MockLlmProvider(),
        warning: t(this.settings.language, "notice.provider.downgradedMock")
      };
    }
    if (!((_b = providerConfig.model) == null ? void 0 : _b.trim())) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.missingModel")
      };
    }
    if (!((_c = providerConfig.secretRef) == null ? void 0 : _c.trim())) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.missingSecretRef")
      };
    }
    try {
      const apiKey = this.secretStore.getSecret(providerConfig.secretRef.trim());
      if (!apiKey) {
        return {
          kind: "error",
          message: t(this.settings.language, "notice.provider.missingApiKey")
        };
      }
    } catch (e) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.secretInvalidRef")
      };
    }
    return {
      kind: "provider",
      provider: new OpenAICompatibleProvider({
        secretStore: this.secretStore,
        secretRef: providerConfig.secretRef.trim(),
        model: providerConfig.model.trim()
      })
    };
  }
};
function activeNoteToEligibility(activeNote) {
  if (activeNote.kind === "no-active-file") {
    return {
      hasActiveMarkdownNote: false,
      reason: "no-active-file"
    };
  }
  return {
    hasActiveMarkdownNote: false,
    reason: "non-markdown-file",
    notePath: activeNote.path,
    extension: activeNote.extension
  };
}
function formatEligibilityMessage(result) {
  var _a, _b, _c, _d, _e;
  if (!result.hasActiveMarkdownNote) {
    if (result.reason === "non-markdown-file") {
      const extension = (_a = result.extension) != null ? _a : "unknown";
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
function formatCreateProposalMessage(language, result) {
  var _a, _b;
  if (result.kind === "eligibility-failed") {
    return formatEligibilityMessage(result.eligibility);
  }
  if (result.kind === "provider-failed") {
    return t(language, "notice.provider.error", {
      message: result.message
    });
  }
  if (result.kind === "validation-failed") {
    const detail = result.errors.map((error) => `${error.layer}:${error.code}`).join(", ");
    return `Refined Layer: proposal validation failed (${detail}).`;
  }
  const tokenUsage = (_b = (_a = result.session.tokenUsage) == null ? void 0 : _a.totalTokens) != null ? _b : t(language, "review.token.unavailable");
  return `Refined Layer: proposal created for ${result.session.noteTitle}, session ${result.session.id}, tokens ${tokenUsage}.`;
}
