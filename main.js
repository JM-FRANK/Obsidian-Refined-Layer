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
var import_obsidian2 = require("obsidian");

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
    const headingPattern = new RegExp(`^${escapeRegExp(this.profile.eligibility.requiredHeading)}\\s*$`, "m");
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
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    for (const key of this.profile.outputSections.required) {
      if (typeof value.refinedSections[key] !== "string" || value.refinedSections[key].trim() === "") {
        return schemaError(`missing-required-section-${key}`, `refinedSections.${key} must be a non-empty string.`);
      }
    }
    for (const key of this.profile.outputSections.optional) {
      const sectionValue = value.refinedSections[key];
      if (sectionValue !== void 0 && typeof sectionValue !== "string") {
        return schemaError(`invalid-section-type-${key}`, `refinedSections.${key} must be a string when present.`);
      }
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
    const headingPattern = new RegExp(`^${escapeRegExp2(definition.heading)}\\s*\\r?$`, "gm");
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
function escapeRegExp2(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/core/protected-region/hash.ts
var import_node_crypto = require("node:crypto");
function hashText(text) {
  return (0, import_node_crypto.createHash)("sha256").update(text, "utf8").digest("hex");
}

// src/application/CreateProposalUseCase.ts
var CreateProposalUseCase = class {
  constructor(noteRepository, profile, llmProvider, sessionStore) {
    this.noteRepository = noteRepository;
    this.profile = profile;
    this.llmProvider = llmProvider;
    this.sessionStore = sessionStore;
    this.eligibilityUseCase = new CheckEligibilityUseCase(noteRepository, profile);
    this.proposalValidator = new ProposalValidator(profile);
    this.protectedRegionExtractor = new ProtectedRegionExtractor();
  }
  async execute() {
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
    const llmResponse = await this.llmProvider.generateProposal({
      workflowProfileId: "raw-refined",
      notePath: lookup.note.path,
      noteTitle: lookup.note.title,
      noteContent: lookup.note.content,
      promptVariables: {
        notePath: lookup.note.path,
        noteTitle: lookup.note.title,
        noteContent: lookup.note.content
      }
    });
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
      ...llmResponse.usage ? { tokenUsage: llmResponse.usage } : {},
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
};

// src/adapters/llm/MockLlmProvider.ts
var MockLlmProvider = class {
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
        provider: "mock-llm",
        model: "mock-gpt",
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
        countingMode: "actual",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
};

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
    systemPrompt: "",
    userPrompt: ""
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

// src/runtime/ProposalSessionStore.ts
var DEFAULT_HISTORY_LIMIT = 5;
var ProposalSessionStore = class {
  constructor(historyLimit = DEFAULT_HISTORY_LIMIT) {
    this.historyLimit = historyLimit;
    this.sessionsById = /* @__PURE__ */ new Map();
    this.sessionsByNotePath = /* @__PURE__ */ new Map();
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

// src/main.ts
var REFINE_COMMAND_ID = "refine-current-note";
var REOPEN_LAST_PROPOSAL_COMMAND_ID = "reopen-last-proposal-for-current-note";
var ObsidianRefinedLayerPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.sessionStore = new ProposalSessionStore(5);
  }
  async onload() {
    console.log("Obsidian Refined Layer loaded");
    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        const noteRepository = new ObsidianNoteRepository(this.app);
        const createProposalUseCase = new CreateProposalUseCase(
          noteRepository,
          rawRefinedProfile,
          new MockLlmProvider(),
          this.sessionStore
        );
        const result = await createProposalUseCase.execute();
        new import_obsidian2.Notice(formatCreateProposalMessage(result), 8e3);
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
          new import_obsidian2.Notice(formatEligibilityMessage({
            hasActiveMarkdownNote: false,
            reason: activeNote.kind,
            ...activeNote.kind === "non-markdown-file" ? { notePath: activeNote.path, extension: activeNote.extension } : {}
          }), 6e3);
          return;
        }
        const session = await this.sessionStore.getLatestSessionForNote(activeNote.note.path);
        if (!session) {
          new import_obsidian2.Notice(`Refined Layer: no saved proposal session for ${activeNote.note.path}.`, 6e3);
          return;
        }
        const tokenUsage = (_b = (_a = session.tokenUsage) == null ? void 0 : _a.countingMode) != null ? _b : "unavailable";
        new import_obsidian2.Notice(
          `Refined Layer: reopened ${session.id} for ${session.noteTitle} (${session.notePath}), token usage ${tokenUsage}.`,
          8e3
        );
      }
    });
  }
  onunload() {
    console.log("Obsidian Refined Layer unloaded");
  }
};
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
function formatCreateProposalMessage(result) {
  var _a, _b;
  if (result.kind === "eligibility-failed") {
    return formatEligibilityMessage(result.eligibility);
  }
  if (result.kind === "validation-failed") {
    const detail = result.errors.map((error) => `${error.layer}:${error.code}`).join(", ");
    return `Refined Layer: proposal validation failed (${detail}).`;
  }
  const tokenUsage = (_b = (_a = result.session.tokenUsage) == null ? void 0 : _a.totalTokens) != null ? _b : "unavailable";
  return `Refined Layer: mock proposal created for ${result.session.noteTitle}, session ${result.session.id}, tokens ${tokenUsage}.`;
}
