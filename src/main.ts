import { Notice, Plugin } from "obsidian";

import { MockLlmProvider } from "./adapters/llm/MockLlmProvider";
import { OpenAICompatibleProvider } from "./adapters/llm/OpenAICompatibleProvider";
import type { LlmProvider } from "./adapters/llm/LlmProvider";
import { ObsidianNoteRepository } from "./adapters/obsidian/ObsidianNoteRepository";
import {
  DEFAULT_ERROR_SESSION_CACHE_LIMIT,
  ERROR_SESSION_CACHE_FILE_PATH,
  ERROR_SESSION_CACHE_PATH,
  ObsidianErrorSessionCacheStore,
} from "./adapters/obsidian/ObsidianErrorSessionCacheStore";
import { ObsidianSecretStore, type SecretStorageDiagnostics } from "./adapters/obsidian/ObsidianSecretStore";
import { ObsidianRefineRunLogger } from "./adapters/obsidian/ObsidianRefineRunLogger";
import { ObsidianSessionCacheV2Store } from "./adapters/obsidian/ObsidianSessionCacheV2Store";
import { ObsidianSessionStore } from "./adapters/obsidian/ObsidianSessionStore";
import { ObsidianSettingsStore } from "./adapters/obsidian/ObsidianSettingsStore";
import { ApplyDecisionUseCase } from "./application/ApplyDecisionUseCase";
import { BuildApplyPlanUseCase } from "./application/BuildApplyPlanUseCase";
import type { CheckEligibilityResult } from "./application/CheckEligibilityUseCase";
import { CreateProposalUseCase } from "./application/CreateProposalUseCase";
import { ListRecoverableSessionsUseCase } from "./application/ListRecoverableSessionsUseCase";
import { OpenCachedSessionUseCase } from "./application/OpenCachedSessionUseCase";
import { RecoverProposalSessionUseCase } from "./application/RecoverProposalSessionUseCase";
import { RequestReviewUseCase } from "./application/RequestReviewUseCase";
import { SaveDraftUseCase } from "./application/SaveDraftUseCase";
import { TestModelConnectionUseCase } from "./application/TestModelConnectionUseCase";
import type { ABlockConfig, BBlockConfig } from "./core/profile/BlockConfig";
import { BlockConfigValidator, type BlockConfigValidationError } from "./core/profile/BlockConfigValidator";
import { cloneRefineProfile, createProfileId, resolveRefineProfile, type RefineProfile } from "./core/profile/RefineProfile";
import { rawRefinedProfile } from "./core/profile/rawRefinedProfile";
import type { UserDecision, UserDecisionV2 } from "./core/review/UserDecision";
import { ProposalSessionStore } from "./runtime/ProposalSessionStore";
import type { ErrorSessionCacheSettings } from "./runtime/ProposalSession";
import type { SessionCacheV2Store } from "./runtime/SessionCacheV2Store";
import { InMemoryPromptObservationStore } from "./runtime/PromptObservationStore";
import { toSafeErrorMessage } from "./runtime/redaction";
import { getDefaultProviderSettings, getProviderPreset, type ProviderType } from "./settings/ProviderConfig";
import type { PluginSettings } from "./settings/PluginSettings";
import { DEFAULT_PLUGIN_SETTINGS } from "./settings/PluginSettings";
import { t } from "./ui/i18n";
import { ObsidianReviewGate } from "./ui/review/ObsidianReviewGate";
import { CachedSessionPickerModal } from "./ui/review/CachedSessionPickerModal";
import { RefineProfilePickerModal } from "./ui/refine/RefineProfilePickerModal";
import { RefineRunStatusNotice } from "./ui/refine/RefineRunStatusModal";
import { ReviewModalV2 } from "./ui/review/ReviewModal";
import { createReviewViewModelV2 } from "./ui/review/ReviewViewModel";
import { SessionPickerModal } from "./ui/review/SessionPickerModal";
import { buildV2NoticeMessages } from "./ui/review/V2NoticeMessages";
import { SettingsTab } from "./ui/settings/SettingsTab";

const REFINE_COMMAND_ID = "refine-current-note";
const REFINE_WITH_PROFILE_COMMAND_ID = "refine-current-note-with-profile";
const REOPEN_LAST_PROPOSAL_COMMAND_ID = "reopen-last-proposal-for-current-note";
const OPEN_CACHED_PROPOSAL_SESSION_COMMAND_ID = "open-cached-proposal-session";
const ENABLE_REFINE_PERFORMANCE_LOGS = false;

export default class ObsidianRefinedLayerPlugin extends Plugin {
  private settings: PluginSettings = DEFAULT_PLUGIN_SETTINGS;
  private settingsStore = new ObsidianSettingsStore(this);
  private sessionStore = new ProposalSessionStore(DEFAULT_PLUGIN_SETTINGS.historyLimit, new ObsidianSessionStore(this));
  private sessionCacheV2: SessionCacheV2Store = new ObsidianSessionCacheV2Store(this);
  private promptObservationStore = new InMemoryPromptObservationStore();
  private secretStore = new ObsidianSecretStore(this.app);

  async onload(): Promise<void> {
    this.settings = await this.settingsStore.load();
    this.sessionStore = new ProposalSessionStore(this.settings.historyLimit, new ObsidianSessionStore(this));
    await this.sessionStore.restoreFromDisk();
    this.sessionCacheV2 = new ObsidianSessionCacheV2Store(this, this.settings.sessionCache.limit);
    this.secretStore = new ObsidianSecretStore(this.app);

    this.addSettingTab(new SettingsTab(this.app, this));

    this.addCommand({
      id: REFINE_COMMAND_ID,
      name: "Refine current note",
      callback: async () => {
        await this.refineCurrentNote(this.getActiveRefineProfile());
      },
    });

    this.addCommand({
      id: REFINE_WITH_PROFILE_COMMAND_ID,
      name: "Refine current note with profile...",
      callback: async () => {
        new RefineProfilePickerModal(this.app, this.settings.rawRefined.profiles, this.settings.language, {
          onChoose: async (profileId) => {
            const profile = resolveRefineProfile(this.settings.rawRefined, profileId);
            await this.refineCurrentNote(profile);
          },
          onCancel: () => {
            // Modal closed; nothing to do.
          },
        }).open();
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

    this.addCommand({
      id: OPEN_CACHED_PROPOSAL_SESSION_COMMAND_ID,
      name: "Open cached proposal session",
      callback: async () => {
        await this.openCachedProposalSessionFlow();
      },
    });
  }

  onunload(): void {
    console.log("Obsidian Refined Layer unloaded");
  }

  getSettings(): PluginSettings {
    return this.settings;
  }

  getActiveRefineProfile(): RefineProfile {
    return resolveRefineProfile(this.settings.rawRefined);
  }

  hasSecureSecretStorage(): boolean {
    return this.secretStore.isAvailable();
  }

  getSecretStorageDiagnostics(): SecretStorageDiagnostics {
    return this.secretStore.getDiagnostics(this.settings.provider?.secretRef);
  }

  getSessionCacheInfo() {
    return this.sessionCacheV2.getCacheInfo?.() ?? {
      cachePath: ".obsidian/plugins/obsidian-refined-layer/session-cache",
      filePath: ".obsidian/plugins/obsidian-refined-layer/session-cache/sessions.v2.json",
      legacyFilePath: ".obsidian/plugins/obsidian-refined-layer/session-cache/sessions.v1.json",
      compatibilityStrategy: "ignore-v1" as const,
      limit: this.settings.sessionCache.limit,
    };
  }

  getErrorSessionCacheInfo() {
    return {
      cachePath: ERROR_SESSION_CACHE_PATH,
      filePath: ERROR_SESSION_CACHE_FILE_PATH,
      limit: this.settings.errorSessionCache.limit,
      defaultLimit: DEFAULT_ERROR_SESSION_CACHE_LIMIT,
    };
  }

  getLatestPromptObservation() {
    return this.promptObservationStore.getLatest();
  }

  async updateSettings(partial: Partial<PluginSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...partial,
    };

    if (partial.historyLimit !== undefined) {
      this.sessionStore.setHistoryLimit(this.settings.historyLimit);
    }

    if (partial.sessionCache !== undefined) {
      await this.sessionCacheV2.setSessionCacheLimit?.(this.settings.sessionCache.limit);
    }

    await this.settingsStore.save(this.settings);
  }

  async updateSessionCacheSettings(partial: Partial<PluginSettings["sessionCache"]>): Promise<void> {
    const current = this.settings.sessionCache;
    const limit = normalizePositiveInteger(partial.limit, current.limit);
    await this.updateSettings({
      sessionCache: {
        ...current,
        ...partial,
        limit,
      },
    });
  }

  async updateErrorSessionCacheSettings(partial: Partial<ErrorSessionCacheSettings>): Promise<void> {
    const current = this.settings.errorSessionCache;
    const limit = normalizePositiveInteger(partial.limit, current.limit);
    await this.updateSettings({
      errorSessionCache: {
        ...current,
        ...partial,
        limit,
      },
    });
  }

  async updateRawRefinedSettings(
    partial: Partial<RefineProfile>,
  ): Promise<{ ok: true } | { ok: false; errors: BlockConfigValidationError[] }> {
    const currentProfile = this.getActiveRefineProfile();
    const nextProfile: RefineProfile = {
      ...currentProfile,
      ...partial,
      aBlocks: partial.aBlocks ?? currentProfile.aBlocks,
      bBlock: partial.bBlock ?? currentProfile.bBlock,
    };

    const validation = new BlockConfigValidator().validate(
      nextProfile.aBlocks as ABlockConfig[],
      nextProfile.bBlock as BBlockConfig,
      nextProfile.protectH1,
    );

    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }

    await this.updateSettings({
      rawRefined: {
        ...this.settings.rawRefined,
        profiles: this.settings.rawRefined.profiles.map((profile) =>
          profile.id === currentProfile.id ? nextProfile : profile
        ),
      },
    });

    return { ok: true };
  }

  private async refineCurrentNote(profile: RefineProfile): Promise<void> {
    const providerSelection = this.selectLlmProvider();
    if (providerSelection.kind === "error") {
      new Notice(providerSelection.message, 8000);
      return;
    }

    if (providerSelection.warning) {
      new Notice(providerSelection.warning, 6000);
    }

    const statusNotice = new RefineRunStatusNotice(this.settings.language, profile);
    statusNotice.start();
    const noteRepository = new ObsidianNoteRepository(this.app);
    const debugRunId = `refine-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createProposalUseCase = new CreateProposalUseCase(
      noteRepository,
      rawRefinedProfile,
      providerSelection.provider,
      this.sessionStore,
      profile,
      this.settings.promptOverrides?.["raw-refined"],
      this.settings.errorSessionCache.enabled
        ? new ObsidianErrorSessionCacheStore(this, this.settings.errorSessionCache.limit)
        : undefined,
      this.sessionCacheV2,
      this.promptObservationStore,
      (status) => statusNotice.updateStatus(status),
      ENABLE_REFINE_PERFORMANCE_LOGS
        ? new ObsidianRefineRunLogger(this, debugRunId)
        : undefined,
      debugRunId,
    );
    const result = await createProposalUseCase.executeV2();

    if (result.kind === "created-v2") {
      statusNotice.updateStatus({
        runId: result.session.id,
        stage: "opening-review",
        profileId: profile.id,
        profileName: profile.name,
      });
      for (const message of buildV2NoticeMessages(this.settings.language, result)) {
        new Notice(message, 6000);
      }
      statusNotice.finish();
      await this.openReviewForSessionV2(result.session.id);
      return;
    }

    if (result.kind === "exhausted") {
      for (const message of buildV2NoticeMessages(this.settings.language, result)) {
        new Notice(message, 8000);
      }
      statusNotice.updateStatus({
        runId: "exhausted",
        stage: "failed",
        profileId: profile.id,
        profileName: profile.name,
      });
      statusNotice.finish();
      return;
    }

    statusNotice.updateStatus({
      runId: "failed",
      stage: "failed",
      profileId: profile.id,
      profileName: profile.name,
    });
    statusNotice.finish();
    new Notice(formatCreateProposalMessage(this.settings.language, result), 8000);
  }

  async updateActiveProfileId(activeProfileId: string): Promise<void> {
    if (!this.settings.rawRefined.profiles.some((profile) => profile.id === activeProfileId)) return;
    await this.updateSettings({
      rawRefined: {
        ...this.settings.rawRefined,
        activeProfileId,
      },
    });
  }

  async addRefineProfile(): Promise<void> {
    const base = this.getActiveRefineProfile();
    const next = {
      ...cloneRefineProfile(base),
      id: createProfileId("profile"),
      name: `${base.name} Copy`,
      isDefault: false,
    };
    await this.updateSettings({
      rawRefined: {
        activeProfileId: next.id,
        profiles: [...this.settings.rawRefined.profiles, next],
      },
    });
  }

  async copyActiveRefineProfile(): Promise<void> {
    await this.addRefineProfile();
  }

  async deleteActiveRefineProfile(): Promise<void> {
    const current = this.getActiveRefineProfile();
    if (this.settings.rawRefined.profiles.length <= 1) return;
    const profiles = this.settings.rawRefined.profiles.filter((profile) => profile.id !== current.id);
    await this.updateSettings({
      rawRefined: {
        activeProfileId: profiles[0].id,
        profiles,
      },
    });
  }

  async testModelConnection(): Promise<void> {
    const providerConfig = this.settings.provider ?? DEFAULT_PLUGIN_SETTINGS.provider!;
    const providerPreset = getProviderPreset(providerConfig.type);
    const provider = providerConfig.type === "mock"
      ? new MockLlmProvider()
      : new OpenAICompatibleProvider({
        providerId: providerConfig.type,
        secretStore: this.secretStore,
        ...(providerConfig.secretRef?.trim() ? { secretRef: providerConfig.secretRef.trim() } : {}),
        model: providerConfig.model?.trim() ?? "",
        ...(providerConfig.baseUrl?.trim() ? { baseUrl: providerConfig.baseUrl.trim() } : {}),
        requiresApiKey: providerPreset.requiresSecret,
      });

    const result = await new TestModelConnectionUseCase(provider, this.secretStore).execute(
      providerConfig,
      providerPreset,
    );

    new Notice(t(this.settings.language, result.ok ? "notice.modelConnection.success" : "notice.modelConnection.failure", {
      code: result.code,
      message: result.message,
    }), result.ok ? 5000 : 8000);
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
      if (message.includes("Key ID")) {
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

  private async openReviewForSessionV2(sessionId: string): Promise<void> {
    const session = await this.findSessionV2(sessionId);
    if (!session) {
      new Notice(t(this.settings.language, "notice.cachedSession.notFound"), 6000);
      return;
    }

    session.status = "reviewing";
    session.updatedAt = new Date().toISOString();
    await this.sessionCacheV2.save(session);

    new ReviewModalV2(
      this.app,
      createReviewViewModelV2(session),
      this.settings.language,
      {
        onApply: async (decision) => {
          await this.applySelectedChangesV2(session.id, decision);
        },
        onSaveDraft: async (decision) => {
          await this.saveCachedDraft(session.id, decision);
        },
        onCloseWithoutDecision: () => {
          new Notice(t(this.settings.language, "review.placeholder.cancel"), 4000);
        },
      },
    ).open();
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

  async openCachedProposalSessionFlow(): Promise<void> {
    const useCase = new OpenCachedSessionUseCase(this.sessionCacheV2);
    const sessions = await useCase.list();

    if (sessions.length === 0) {
      new Notice(t(this.settings.language, "cachedSessionPicker.empty"), 6000);
      return;
    }

    new CachedSessionPickerModal(this.app, sessions, this.settings.language, {
      onOpenSession: async (sessionId) => {
        const session = await useCase.open(sessionId);
        if (!session) {
          new Notice(t(this.settings.language, "notice.cachedSession.notFound"), 6000);
          return;
        }

        const modal = new ReviewModalV2(
          this.app,
          createReviewViewModelV2(session),
          this.settings.language,
          {
            onApply: () => {
              new Notice(t(this.settings.language, "notice.cachedSession.applyDisabled"), 6000);
            },
            onSaveDraft: async (decision) => {
              await this.saveCachedDraft(session.id, decision);
            },
            onCloseWithoutDecision: () => {
              new Notice(t(this.settings.language, "review.placeholder.cancel"), 4000);
            },
          },
          { applyDisabled: true },
        );
        modal.open();
      },
      onCancel: () => {
        // Modal closed; nothing to do.
      },
    }).open();
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

  private async applySelectedChangesV2(sessionId: string, decision: UserDecisionV2): Promise<void> {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const buildApplyPlanUseCase = new BuildApplyPlanUseCase(
      rawRefinedProfile,
      this.sessionStore,
      noteRepository,
      this.sessionCacheV2,
    );
    const planResult = await buildApplyPlanUseCase.executeV2(sessionId, decision);

    if (!planResult.ok) {
      new Notice(`Refined Layer: apply plan failed (${planResult.code}) - ${planResult.message}`, 8000);
      return;
    }

    const applyDecisionUseCase = new ApplyDecisionUseCase(
      rawRefinedProfile,
      this.sessionStore,
      noteRepository,
      this.sessionCacheV2,
    );
    const applyResult = await applyDecisionUseCase.executeV2(planResult.plan);

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

  private async findSessionV2(sessionId: string) {
    return (await this.sessionCacheV2.loadAll()).find((session) => session.id === sessionId) ?? null;
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

  private async saveCachedDraft(sessionId: string, decision?: UserDecisionV2): Promise<void> {
    const noteRepository = new ObsidianNoteRepository(this.app);
    const saveDraftUseCase = new SaveDraftUseCase(this.sessionStore, noteRepository, this.settings, this.sessionCacheV2);
    const result = await saveDraftUseCase.executeV2(sessionId, decision);

    if (result.saved) {
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

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function formatCreateProposalMessage(
  language: PluginSettings["language"],
  result: Awaited<ReturnType<CreateProposalUseCase["execute"]>> | Awaited<ReturnType<CreateProposalUseCase["executeV2"]>>,
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

  if (result.kind === "exhausted") {
    return "Refined Layer: proposal generation exhausted all retry attempts.";
  }

  if (result.kind === "created-v2") {
    const tokenUsage = result.session.tokenUsage?.totalTokens ?? t(language, "review.token.unavailable");
    return `Refined Layer: proposal created for ${result.session.noteTitle}, session ${result.session.id}, tokens ${tokenUsage}.`;
  }

  const tokenUsage = result.session.tokenUsage?.totalTokens ?? t(language, "review.token.unavailable");
  return `Refined Layer: proposal created for ${result.session.noteTitle}, session ${result.session.id}, tokens ${tokenUsage}.`;
}
