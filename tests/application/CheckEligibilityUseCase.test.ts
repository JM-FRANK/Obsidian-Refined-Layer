import { describe, expect, it } from "vitest";

import { CheckEligibilityUseCase, type ActiveNoteRepository } from "../../src/application/CheckEligibilityUseCase";
import { rawRefinedProfile } from "../../src/core/profile/rawRefinedProfile";

describe("CheckEligibilityUseCase", () => {
  it("returns note metadata for an eligible markdown note", async () => {
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

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile);

    await expect(useCase.execute()).resolves.toEqual({
      hasActiveMarkdownNote: true,
      eligible: true,
      notePath: "10_Raw/example.md",
      noteTitle: "example",
      rawContentLength: 42,
      status: "raw",
    });
  });

  it("returns a clear result when no active file exists", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "no-active-file",
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile);

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

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile);

    await expect(useCase.execute()).resolves.toEqual({
      hasActiveMarkdownNote: false,
      reason: "non-markdown-file",
      notePath: "assets/image.png",
      extension: "png",
    });
  });

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

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: ["missingFrontmatter", "invalidStatus"],
    });
  });

  it("fails when status is not raw or the protected heading is missing", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "10_Raw/not-raw.md",
            title: "not-raw",
            content: "---\nstatus: refined\n---\n# Title\n\n## Other\nhello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository, rawRefinedProfile);

    await expect(useCase.execute()).resolves.toMatchObject({
      hasActiveMarkdownNote: true,
      eligible: false,
      failureReasons: ["invalidStatus", "missingOriginalContentHeading"],
      status: "refined",
    });
  });
});
