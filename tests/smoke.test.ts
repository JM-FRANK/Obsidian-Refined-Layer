import { describe, expect, it } from "vitest";

import { CheckEligibilityUseCase, type ActiveNoteRepository } from "../src/application/CheckEligibilityUseCase";

describe("project scaffold", () => {
  it("keeps test tooling available", () => {
    expect(true).toBe(true);
  });

  it("returns note metadata for an active markdown note", async () => {
    const repository: ActiveNoteRepository = {
      async getActiveNote() {
        return {
          kind: "markdown",
          note: {
            path: "Inbox/example.md",
            title: "example",
            content: "hello",
          },
        };
      },
    };

    const useCase = new CheckEligibilityUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual({
      hasActiveMarkdownNote: true,
      notePath: "Inbox/example.md",
      noteTitle: "example",
      rawContentLength: 5,
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

    const useCase = new CheckEligibilityUseCase(repository);

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

    const useCase = new CheckEligibilityUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual({
      hasActiveMarkdownNote: false,
      reason: "non-markdown-file",
      notePath: "assets/image.png",
      extension: "png",
    });
  });
});
