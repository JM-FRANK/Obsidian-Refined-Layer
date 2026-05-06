import { describe, expect, it } from "vitest";

import { CheckEligibilityUseCase, type ActiveNoteRepository } from "../../src/application/CheckEligibilityUseCase";
import { resolveRefineProfile } from "../../src/core/profile/RefineProfile";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";
import { DEFAULT_PLUGIN_SETTINGS } from "../../src/settings/PluginSettings";

const defaultSettings = resolveRefineProfile(DEFAULT_PLUGIN_SETTINGS.rawRefined);

describe("CheckEligibilityUseCase", () => {
  // ── v0.1.0 retained: no active file, non-markdown ──

  it("returns a clear result when no active file exists", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return { kind: "no-active-file" };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, defaultSettings);

    await expect(useCase.execute()).resolves.toEqual({
      hasActiveMarkdownNote: false,
      reason: "no-active-file",
    });
  });

  it("returns a clear result when the active file is not markdown", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "non-markdown-file",
          path: "assets/image.png",
          extension: "png",
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, defaultSettings);

    await expect(useCase.execute()).resolves.toEqual({
      hasActiveMarkdownNote: false,
      reason: "non-markdown-file",
      notePath: "assets/image.png",
      extension: "png",
    });
  });

  // ── Eligible ──

  it("returns note metadata for an eligible markdown note (default config)", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/example.md",
            title: "example",
            content: "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, defaultSettings);

    await expect(useCase.execute()).resolves.toEqual({
      hasActiveMarkdownNote: true,
      eligible: true,
      notePath: "10_Raw/example.md",
      noteTitle: "example",
      rawContentLength: 42,
      status: "raw",
    });
  });

  // ── v0.1.0 retained checks ──

  it("fails when frontmatter is missing", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/no-frontmatter.md",
            title: "no-frontmatter",
            content: "# Title\n\n## 原始内容\nhello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, defaultSettings);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: ["missingFrontmatter", "invalidStatus"],
    });
  });

  // ── v0.2.0 B block checks ──

  it("fails when B block heading is missing (old note with different heading)", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/not-raw.md",
            title: "not-raw",
            content: "---\nstatus: raw\n---\n# Title\n\n## Other\nhello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, defaultSettings);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: expect.arrayContaining(["missingBBlock"]),
    });
  });

  it("fails when B block heading level mismatches (heading text exists at wrong level)", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/wrong-level.md",
            title: "wrong-level",
            content: "---\nstatus: raw\n---\n# Title\n\n### 原始内容\nhello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, defaultSettings);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: expect.arrayContaining(["bBlockLevelMismatch"]),
    });
  });

  it("fails when B block heading appears multiple times", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/dup.md",
            title: "dup",
            content: "---\nstatus: raw\n---\n## 原始内容\nfirst\n\n## 原始内容\nsecond\n",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, defaultSettings);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: expect.arrayContaining(["multipleBBlock"]),
    });
  });

  it("fails when B block has no content", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/empty-b.md",
            title: "empty-b",
            content: "---\nstatus: raw\n---\n# Title\n\n## 原始内容\n\n## Next\nnext\n",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, defaultSettings);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: expect.arrayContaining(["emptyBBlock"]),
    });
  });

  // ── v0.2.0 A block config checks ──

  it("fails when A block config has duplicate IDs", async () => {
    const settings = {
      ...defaultSettings,
      aBlocks: [
        defaultSettings.aBlocks[0],
        { ...defaultSettings.aBlocks[0], name: "dup" },
      ],
    };

    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/example.md",
            title: "example",
            content: "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, settings);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: expect.arrayContaining(["invalidABlockConfig"]),
    });
  });

  it("fails when protectH1=true and A block has headingLevel=1", async () => {
    const settings = {
      ...defaultSettings,
      protectH1: true,
      aBlocks: [
        { ...defaultSettings.aBlocks[0], headingLevel: 1 as const, id: "h1-block" },
      ],
    };

    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/example.md",
            title: "example",
            content: "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, settings);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: expect.arrayContaining(["invalidABlockConfig"]),
    });
  });

  it("accepts A block with headingLevel=1 when protectH1=false", async () => {
    const settings = {
      ...defaultSettings,
      protectH1: false,
      aBlocks: [
        { ...defaultSettings.aBlocks[0], headingLevel: 1 as const, id: "h1-block" },
      ],
    };

    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/example.md",
            title: "example",
            content: "---\nstatus: raw\n---\n# Title\n\n## 原始内容\nhello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile, settings);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: true,
    });
  });
});
