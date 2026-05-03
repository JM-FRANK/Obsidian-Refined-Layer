import { Notice, Plugin } from "obsidian";

import { ApplyDecisionUseCase } from "./application/ApplyDecisionUseCase";
import { BuildApplyPlanUseCase } from "./application/BuildApplyPlanUseCase";
import { CreateProposalUseCase } from "./application/CreateProposalUseCase";
import { RequestReviewUseCase } from "./application/RequestReviewUseCase";
import { SaveDraftUseCase } from "./application/SaveDraftUseCase";
import type { CheckEligibilityResult } from "./application/CheckEligibilityUseCase";
import type { UserDecision } from "./core/review/UserDecision";
import { MockLlmProvider } from "./adapters/llm/MockLlmProvider";
import { ObsidianNoteRepository } from "./adapters/obsidian/ObsidianNoteRepository";
import { ObsidianSettingsStore } from "./adapters/obsidian/ObsidianSettingsStore";
import { rawRefinedProfile } from "./core/profile/rawRefinedProfile";
import { ProposalSessionStore } from "./runtime/ProposalSessionStore";
import type { PluginSettings } from "./settings/PluginSettings";
import { DEFAULT_PLUGIN_SETTINGS } from "./settings/PluginSettings";
import { t } from "./ui/i18n";
import { ObsidianReviewGate } from "./ui/review/ObsidianReviewGate";
import { SettingsTab } from "./ui/settings/SettingsTab";

const REFINE_COMMAND_ID = "refine-current-note";
const REOPEN_LAST_PROPOSAL_COMMAND_ID = "reopen-last-proposal-for-current-note";

export default class ObsidianRefinedLayerPlugin extends Plugin {
  private settings: PluginSettings = DEFAULT_PLUGIN_SETTINGS;
  private settingsStore = new ObsidianSettingsStore(this);
  private sessionStore = new ProposalSessionStore(DEFAULT_PLUGIN_SETTINGS.historyLimit);

  async onload(): Promise<void> {
    this.settings = await this.settingsStore.load();
    this.sessionStore = new ProposalSessionStore(this.settings.historyLimit);

    this.addSettingTab(new SettingsTab(this.app, this));

    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        const noteRepository = new ObsidianNoteRepository(this.app);
        const createProposalUseCase = new CreateProposalUseCase(
          noteRepository,
          rawRefinedProfile,
          new MockLlmProvider(),
          this.sessionStore,
        );
        const result = await createProposalUseCase.execute();

        if (result.kind === "created") {
          await this.openReviewForSession(result.session.id);
          return;
        }

        new Notice(formatCreateProposalMessage(this.settings.language, result), 8000);
      },
    });

    this.addCommand({
      id: REOPEN_LAST_PROPOSAL_COMMAND_ID,
      name: "Reopen last proposal for current note",
      callback: async () => {
        const noteRepository = new ObsidianNoteRepository(this.app);
        const activeNote = await noteRepository.getActiveNote();

        if (activeNote.kind !== "markdown") {
          new Notice(formatEligibilityMessage(activeNoteToEligibility(activeNote)), 6000);
          return;
        }

        const session = await this.sessionStore.getLatestSessionForNote(activeNote.note.path);
        if (!session) {
          new Notice(
            t(this.settings.language, "notice.review.noSession", {
              path: activeNote.note.path,
            }),
            6000,
          );
          return;
        }

        new Notice(
          t(this.settings.language, "notice.review.reopened", {
            sessionId: session.id,
            title: session.noteTitle,
            mode: session.tokenUsage?.countingMode ?? "unavailable",
          }),
          6000,
        );
        await this.openReviewForSession(session.id);
      },
    });
  }

  onunload(): void {
    console.log("Obsidian Refined Layer unloaded");
  }

  getSettings(): PluginSettings {
    return this.settings;
  }

  async updateSettings(partial: Partial<PluginSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...partial,
    };

    if (partial.historyLimit !== undefined) {
      this.sessionStore.setHistoryLimit(this.settings.historyLimit);
    }

    await this.settingsStore.save(this.settings);
  }

  async updatePromptOverride(field: "systemPrompt" | "userPrompt", value: string): Promise<void> {
    const nextOverride = {
      enabled: value.trim().length > 0,
      systemPrompt: this.settings.promptOverrides?.["raw-refined"]?.systemPrompt,
      userPrompt: this.settings.promptOverrides?.["raw-refined"]?.userPrompt,
      [field]: value,
    };

    this.settings = {
      ...this.settings,
      promptOverrides: {
        ...(this.settings.promptOverrides ?? {}),
        "raw-refined": nextOverride,
      },
    };

    await this.settingsStore.save(this.settings);
  }

  private async openReviewForSession(sessionId: string): Promise<void> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return;
    }

    const noteRepository = new ObsidianNoteRepository(this.app);
    const gate = new ObsidianReviewGate(this.app, this.settings.language, {
      onApplyNotice: async (decision) => {
        await this.applySelectedChanges(sessionId, decision);
      },
      onSaveDraftNotice: async () => {
        await this.saveDraft(sessionId);
      },
      onCancelNotice: () => {
        new Notice(t(this.settings.language, "review.placeholder.cancel"), 4000);
      },
    });
    const requestReviewUseCase = new RequestReviewUseCase(gate);
    await requestReviewUseCase.execute(session);

    void noteRepository;
  }

  private async applySelectedChanges(sessionId: string, decision: UserDecision): Promise<void> {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const buildApplyPlanUseCase = new BuildApplyPlanUseCase(
      rawRefinedProfile,
      this.sessionStore,
      noteRepository,
    );
    const planResult = await buildApplyPlanUseCase.execute(sessionId, decision);

    if (!planResult.ok) {
      new Notice(`Refined Layer: apply plan failed (${planResult.code}) - ${planResult.message}`, 8000);
      return;
    }

    const applyDecisionUseCase = new ApplyDecisionUseCase(
      rawRefinedProfile,
      this.sessionStore,
      noteRepository,
    );
    const applyResult = await applyDecisionUseCase.execute(planResult.plan);

    if (applyResult.kind === "applied") {
      new Notice(`Refined Layer: applied selected changes to ${applyResult.notePath}.`, 6000);
      return;
    }

    if (applyResult.kind === "conflict") {
      new Notice(
        `Refined Layer: apply blocked by conflict (${applyResult.reason}). Options: ${applyResult.options.join(", ")}.`,
        8000,
      );
      return;
    }

    new Notice(`Refined Layer: apply failed (${applyResult.code}) - ${applyResult.message}`, 8000);
  }

  private async saveDraft(sessionId: string, conflictReason?: string): Promise<void> {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const saveDraftUseCase = new SaveDraftUseCase(this.sessionStore, noteRepository, this.settings);
    const result = await saveDraftUseCase.execute(sessionId, conflictReason);

    if (result.saved) {
      new Notice(`Refined Layer: draft saved to ${result.draftPath}.`, 6000);
      return;
    }

    new Notice(`Refined Layer: save draft failed - ${result.message}`, 8000);
  }
}

function activeNoteToEligibility(
  activeNote:
    | { kind: "no-active-file" }
    | { kind: "non-markdown-file"; path: string; extension: string },
): CheckEligibilityResult {
  if (activeNote.kind === "no-active-file") {
    return {
      hasActiveMarkdownNote: false,
      reason: "no-active-file",
    };
  }

  return {
    hasActiveMarkdownNote: false,
    reason: "non-markdown-file",
    notePath: activeNote.path,
    extension: activeNote.extension,
  };
}

function formatEligibilityMessage(result: CheckEligibilityResult): string {
  if (!result.hasActiveMarkdownNote) {
    if (result.reason === "non-markdown-file") {
      const extension = result.extension ?? "unknown";
      const notePath = result.notePath ?? "(unknown path)";

      return `Refined Layer: active file is not Markdown (${extension}) - ${notePath}`;
    }

    return "Refined Layer: no active note is open.";
  }

  if (!result.eligible) {
    const reasons = result.failureReasons?.join(", ") ?? "unknown";
    return `Refined Layer: note is not eligible (${reasons}) - ${result.notePath}`;
  }

  return `Refined Layer: ${result.noteTitle} (${result.notePath}), raw content length ${result.rawContentLength ?? 0}.`;
}

function formatCreateProposalMessage(
  language: PluginSettings["language"],
  result: Awaited<ReturnType<CreateProposalUseCase["execute"]>>,
): string {
  if (result.kind === "eligibility-failed") {
    return formatEligibilityMessage(result.eligibility);
  }

  if (result.kind === "validation-failed") {
    const detail = result.errors.map((error) => `${error.layer}:${error.code}`).join(", ");
    return `Refined Layer: proposal validation failed (${detail}).`;
  }

  const tokenUsage = result.session.tokenUsage?.totalTokens ?? t(language, "review.token.unavailable");
  return `Refined Layer: mock proposal created for ${result.session.noteTitle}, session ${result.session.id}, tokens ${tokenUsage}.`;
}
