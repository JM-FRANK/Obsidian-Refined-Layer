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

// src/application/CheckEligibilityUseCase.ts
var CheckEligibilityUseCase = class {
  constructor(noteRepository) {
    this.noteRepository = noteRepository;
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
    return {
      hasActiveMarkdownNote: true,
      notePath: activeNote.note.path,
      noteTitle: activeNote.note.title,
      rawContentLength: activeNote.note.content.length
    };
  }
};

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
        const checkEligibilityUseCase = new CheckEligibilityUseCase(noteRepository);
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
  var _a, _b, _c;
  if (!result.hasActiveMarkdownNote) {
    if (result.reason === "non-markdown-file") {
      const extension = (_a = result.extension) != null ? _a : "unknown";
      const notePath = (_b = result.notePath) != null ? _b : "(unknown path)";
      return `Refined Layer: active file is not Markdown (${extension}) - ${notePath}`;
    }
    return "Refined Layer: no active note is open.";
  }
  return `Refined Layer: ${result.noteTitle} (${result.notePath}), raw content length ${(_c = result.rawContentLength) != null ? _c : 0}.`;
}
