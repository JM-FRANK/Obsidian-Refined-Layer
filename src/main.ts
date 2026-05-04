import { Notice, Plugin } from "obsidian";

import { MockLlmProvider } from "./adapters/llm/MockLlmProvider";
import { OpenAICompatibleProvider } from "./adapters/llm/OpenAICompatibleProvider";
import type { LlmProvider } from "./adapters/llm/LlmProvider";
import { ObsidianNoteRepository } from "./adapters/obsidian/ObsidianNoteRepository";
import { ObsidianSecretStore, type SecretStorageDiagnostics } from "./adapters/obsidian/ObsidianSecretStore";
import { ObsidianSessionStore } from "./adapters/obsidian/ObsidianSessionStore";
import { ObsidianSettingsStore } from "./adapters/obsidian/ObsidianSettingsStore";
import { ApplyDecisionUseCase } from "./application/ApplyDecisionUseCase";
import { BuildApplyPlanUseCase } from "./application/BuildApplyPlanUseCase";
import type { CheckEligibilityResult } from "./application/CheckEligibilityUseCase";
import { CreateProposalUseCase } from "./application/CreateProposalUseCase";
import { ListRecoverableSessionsUseCase } from "./application/ListRecoverableSessionsUseCase";
import { RecoverProposalSessionUseCase } from "./application/RecoverProposalSessionUseCase";
import { RequestReviewUseCase } from "./application/RequestReviewUseCase";
import { SaveDraftUseCase } from "./application/SaveDraftUseCase";
import { rawRefinedProfile } from "./core/profile/rawRefinedProfile";
import type { UserDecision } from "./core/review/UserDecision";
import { ProposalSessionStore } from "./runtime/ProposalSessionStore";
import { toSafeErrorMessage } from "./runtime/redaction";
import { getDefaultProviderSettings, getProviderPreset, type ProviderType } from "./settings/ProviderConfig";
import type { PluginSettings } from "./settings/PluginSettings";
import { DEFAULT_PLUGIN_SETTINGS } from "./settings/PluginSettings";
import { t } from "./ui/i18n";
import { ObsidianReviewGate } from "./ui/review/ObsidianReviewGate";
import { SessionPickerModal } from "./ui/review/SessionPickerModal";
import { SettingsTab } from "./ui/settings/SettingsTab";

const REFINE_COMMAND_ID = "refine-current-note";
const REOPEN_LAST_PROPOSAL_COMMAND_ID = "reopen-last-proposal-for-current-note";

export default class ObsidianRefinedLayerPlugin extends Plugin {
  private settings: PluginSettings = DEFAULT_PLUGIN_SETTINGS;
  private settingsStore = new ObsidianSettingsStore(this);
  private sessionStore = new ProposalSessionStore(DEFAULT_PLUGIN_SETTINGS.historyLimit, new ObsidianSessionStore(this));
  private secretStore = new ObsidianSecretStore(this.app);

  async onload(): Promise<void> {
    this.settings = await this.settingsStore.load();
    this.sessionStore = new ProposalSessionStore(this.settings.historyLimit, new ObsidianSessionStore(this));
    await this.sessionStore.restoreFromDisk();
    this.secretStore = new ObsidianSecretStore(this.app);

    this.addSettingTab(new SettingsTab(this.app, this));

    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        const providerSelection = this.selectLlmProvider();
        if (providerSelection.kind === "error") {
          new Notice(providerSelection.message, 8000);
          return;
        }

        if (providerSelection.warning) {
          new Notice(providerSelection.warning, 6000);
        }

        const noteRepository = new ObsidianNoteRepository(this.app);
        const createProposalUseCase = new CreateProposalUseCase(
          noteRepository,
          rawRefinedProfile,
          providerSelection.provider,
          this.sessionStore,
          this.settings.promptOverrides?.["raw-refined"],
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
        const listUseCase = new ListRecoverableSessionsUseCase(this.sessionStore, noteRepository);
        const result = await listUseCase.execute();

        if (result.sessions.length === 0) {
          new Notice(t(this.settings.language, "sessionPicker.empty"), 6000);
          return;
        }

        new SessionPickerModal(
          this.app,
          result.sessions,
          result.sessions[0]?.noteTitle ?? "",
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
              new Notice("Session content shown for manual copy. Copy and close the modal.", 6000);
            },
            onRegenerate: () => {
              // Just close the picker; user can run Refine manually
            },
            onDiscard: async (sessionId) => {
              await this.discardSession(sessionId);
              new Notice("Session discarded.", 4000);
            },
            onCancel: () => {
              // Modal closed; nothing to do
            },
          },
        ).open();
      },
    });
  }

  onunload(): void {
    console.log("Obsidian Refined Layer unloaded");
  }

  getSettings(): PluginSettings {
    return this.settings;
  }

  hasSecureSecretStorage(): boolean {
    return this.secretStore.isAvailable();
  }

  getSecretStorageDiagnostics(): SecretStorageDiagnostics {
    return this.secretStore.getDiagnostics();
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

  async updateProviderSettings(partial: Partial<NonNullable<PluginSettings["provider"]>>): Promise<void> {
    const currentProvider = this.settings.provider ?? DEFAULT_PLUGIN_SETTINGS.provider!;
    this.settings = {
      ...this.settings,
      provider: {
        type: currentProvider.type,
        ...(currentProvider.model ? { model: currentProvider.model } : {}),
        ...(currentProvider.secretRef ? { secretRef: currentProvider.secretRef } : {}),
        ...(currentProvider.baseUrl ? { baseUrl: currentProvider.baseUrl } : {}),
        ...partial,
      },
    };

    await this.settingsStore.save(this.settings);
  }

  async switchProviderType(type: ProviderType): Promise<void> {
    const currentProvider = this.settings.provider ?? DEFAULT_PLUGIN_SETTINGS.provider!;
    const nextProvider = getDefaultProviderSettings(type);

    this.settings = {
      ...this.settings,
      provider: {
        ...nextProvider,
        ...(type === currentProvider.type && currentProvider.model ? { model: currentProvider.model } : {}),
        ...(type === currentProvider.type && currentProvider.secretRef ? { secretRef: currentProvider.secretRef } : {}),
        ...(type === currentProvider.type && currentProvider.baseUrl ? { baseUrl: currentProvider.baseUrl } : {}),
      },
    };

    await this.settingsStore.save(this.settings);
  }

  async saveProviderApiKey(secretRef: string, value: string): Promise<void> {
    if (!this.secretStore.isAvailable()) {
      new Notice(t(this.settings.language, "notice.provider.secretBlocked"), 8000);
      return;
    }

    if (!secretRef.trim()) {
      new Notice(t(this.settings.language, "notice.provider.missingSecretRef"), 8000);
      return;
    }

    if (!value.trim()) {
      return;
    }

    try {
      this.secretStore.setSecret(secretRef.trim(), value);
      new Notice(t(this.settings.language, "notice.provider.secretSaved"), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Secret reference")) {
        new Notice(t(this.settings.language, "notice.provider.secretInvalidRef"), 8000);
      } else {
        new Notice(
          t(this.settings.language, "notice.provider.error", { message: toSafeErrorMessage(error) }),
          8000,
        );
      }
    }
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

    await this.sessionStore.updateSessionStatus(sessionId, "reviewing");

    const gate = new ObsidianReviewGate(this.app, this.settings.language, {
      onApplyNotice: async (decision) => {
        await this.sessionStore.updateSessionDecision(sessionId, decision);
        await this.applySelectedChanges(sessionId, decision);
      },
      onSaveDraftNotice: async (decision) => {
        await this.sessionStore.updateSessionDecision(sessionId, decision);
        await this.saveDraft(sessionId, undefined, decision);
      },
      onCancelNotice: () => {
        new Notice(t(this.settings.language, "review.placeholder.cancel"), 4000);
      },
    });
    const requestReviewUseCase = new RequestReviewUseCase(gate);
    await requestReviewUseCase.execute(session);
  }

  private async recoverAndOpenReview(sessionId: string): Promise<void> {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const recoverUseCase = new RecoverProposalSessionUseCase(this.sessionStore, noteRepository);
    const recovery = await recoverUseCase.execute(sessionId);

    if (!recovery) {
      new Notice("Session not found.", 6000);
      return;
    }

    if (recovery.kind === "fresh") {
      await this.openReviewForSession(sessionId);
      return;
    }

    new Notice(
      t(this.settings.language, "sessionPicker.conflict", {
        reason: recovery.reason,
      }),
      8000,
    );
    await this.sessionStore.updateSessionStatus(sessionId, "conflicted");
  }

  private async discardSession(sessionId: string): Promise<void> {
    await this.sessionStore.updateSessionStatus(sessionId, "discarded");
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
      await this.sessionStore.updateSessionStatus(sessionId, "applied");
      new Notice(`Refined Layer: applied selected changes to ${applyResult.notePath}.`, 6000);
      return;
    }

    if (applyResult.kind === "conflict") {
      await this.sessionStore.updateSessionStatus(sessionId, "conflicted");
      new Notice(
        `Refined Layer: apply blocked by conflict (${applyResult.reason}). Options: ${applyResult.options.join(", ")}.`,
        8000,
      );
      return;
    }

    new Notice(`Refined Layer: apply failed (${applyResult.code}) - ${applyResult.message}`, 8000);
  }

  private async saveDraft(sessionId: string, conflictReason?: string, decision?: UserDecision): Promise<void> {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const saveDraftUseCase = new SaveDraftUseCase(this.sessionStore, noteRepository, this.settings);
    const result = await saveDraftUseCase.execute(sessionId, conflictReason, decision?.editedRefinedSections);

    if (result.saved) {
      await this.sessionStore.updateSessionStatus(sessionId, "saved_as_draft");
      new Notice(`Refined Layer: draft saved to ${result.draftPath}.`, 6000);
      return;
    }

    new Notice(`Refined Layer: save draft failed - ${result.message}`, 8000);
  }

  private selectLlmProvider():
    | { kind: "provider"; provider: LlmProvider; warning?: string }
    | { kind: "error"; message: string } {
    const providerConfig = this.settings.provider ?? DEFAULT_PLUGIN_SETTINGS.provider!;
    const providerPreset = getProviderPreset(providerConfig.type);

    if (providerConfig.type === "mock") {
      return {
        kind: "provider",
        provider: new MockLlmProvider(),
      };
    }

    if (providerPreset.requiresSecret && !this.secretStore.isAvailable()) {
      return {
        kind: "provider",
        provider: new MockLlmProvider(),
        warning: t(this.settings.language, "notice.provider.downgradedMock"),
      };
    }

    if (!providerConfig.model?.trim()) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.missingModel", {
          provider: providerConfig.type,
        }),
      };
    }

    if (providerPreset.allowsBaseUrlEdit && !providerConfig.baseUrl?.trim()) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.missingBaseUrl", {
          provider: providerConfig.type,
        }),
      };
    }

    if (providerPreset.requiresSecret && !providerConfig.secretRef?.trim()) {
      return {
        kind: "error",
        message: t(this.settings.language, "notice.provider.missingSecretRef", {
          provider: providerConfig.type,
        }),
      };
    }

    if (providerPreset.requiresSecret) {
      try {
        const apiKey = this.secretStore.getSecret(providerConfig.secretRef!.trim());
        if (!apiKey) {
          return {
            kind: "error",
            message: t(this.settings.language, "notice.provider.missingApiKey", {
              provider: providerConfig.type,
            }),
          };
        }
      } catch {
        return {
          kind: "error",
          message: t(this.settings.language, "notice.provider.secretInvalidRef"),
        };
      }
    }

    return {
      kind: "provider",
      provider: new OpenAICompatibleProvider({
        providerId: providerConfig.type,
        secretStore: this.secretStore,
        ...(providerConfig.secretRef?.trim() ? { secretRef: providerConfig.secretRef.trim() } : {}),
        model: providerConfig.model.trim(),
        ...(providerConfig.baseUrl?.trim() ? { baseUrl: providerConfig.baseUrl.trim() } : {}),
        requiresApiKey: providerPreset.requiresSecret,
      }),
    };
  }
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

  if (result.kind === "provider-failed") {
    return t(language, "notice.provider.error", {
      message: result.message,
    });
  }

  if (result.kind === "validation-failed") {
    const detail = result.errors.map((error) => `${error.layer}:${error.code}`).join(", ");
    return `Refined Layer: proposal validation failed (${detail}).`;
  }

  const tokenUsage = result.session.tokenUsage?.totalTokens ?? t(language, "review.token.unavailable");
  return `Refined Layer: proposal created for ${result.session.noteTitle}, session ${result.session.id}, tokens ${tokenUsage}.`;
}
