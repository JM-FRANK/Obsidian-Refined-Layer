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
var import_obsidian = require("obsidian");
var REFINE_COMMAND_ID = "refine-current-note";
var ObsidianRefinedLayerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    console.log("Obsidian Refined Layer loaded");
    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: () => {
        new import_obsidian.Notice("Refine current note is not implemented yet.");
      }
    });
  }
  onunload() {
    console.log("Obsidian Refined Layer unloaded");
  }
};
