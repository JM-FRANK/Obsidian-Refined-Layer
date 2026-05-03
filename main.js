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

// src/main.ts
var REFINE_COMMAND_ID = "refine-current-note";
var ObsidianRefinedLayerPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    console.log("Obsidian Refined Layer loaded");
    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        const noteRepository = new ObsidianNoteRepository(this.app);
        const checkEligibilityUseCase = new CheckEligibilityUseCase(noteRepository, rawRefinedProfile);
        const result = await checkEligibilityUseCase.execute();
        new import_obsidian2.Notice(formatEligibilityMessage(result), 6e3);
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
