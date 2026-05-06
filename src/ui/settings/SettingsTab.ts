import { Notice, PluginSettingTab, SecretComponent, Setting, TextAreaComponent, type App } from "obsidian";

import type ObsidianRefinedLayerPlugin from "../../main";
import type { ABlockConfig, BBlockConfig } from "../../core/profile/BlockConfig";
import { normalizeTagList } from "../../core/proposal/TagNormalizer";
import { getProviderPreset, type ProviderType } from "../../settings/ProviderConfig";
import type { PluginSettings } from "../../settings/PluginSettings";
import { t } from "../i18n";

export class SettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: ObsidianRefinedLayerPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.getSettings();
    const provider = settings.provider;
    const providerType = provider?.type ?? "mock";
    const providerPreset = getProviderPreset(providerType);
    const secretAvailable = this.plugin.hasSecureSecretStorage();
    const secretDiagnostics = this.plugin.getSecretStorageDiagnostics();
    const sessionCacheInfo = this.plugin.getSessionCacheInfo();
    const errorSessionCacheInfo = this.plugin.getErrorSessionCacheInfo();
    containerEl.empty();

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.language"))
      .setDesc(t(settings.language, "settings.desc.language"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("zh-CN", t(settings.language, "settings.option.language.zh-CN"))
          .addOption("en", t(settings.language, "settings.option.language.en"))
          .setValue(settings.language)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ language: value as PluginSettings["language"] });
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.sessionCache"))
      .setDesc(t(settings.language, "settings.desc.sessionCache"));

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.sessionCacheLimit"))
      .setDesc(t(settings.language, "settings.desc.sessionCacheLimit"))
      .addText((text) => {
        text
          .setPlaceholder("5")
          .setValue(String(settings.sessionCache.limit))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            await this.plugin.updateSessionCacheSettings({ limit: parsed });
          });
      });

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.sessionCacheLocation"))
      .setDesc(sessionCacheInfo.cachePath);

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.openSessionCache"))
      .setDesc(t(settings.language, "settings.desc.openSessionCache"))
      .addButton((button) => {
        button
          .setButtonText(t(settings.language, "settings.button.openSessionCache"))
          .onClick(async () => {
            await this.plugin.openCachedProposalSessionFlow();
          });
      });

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.errorSessionCache"))
      .setDesc(t(settings.language, "settings.desc.errorSessionCache"))
      .addToggle((toggle) => {
        toggle
          .setValue(settings.errorSessionCache.enabled)
          .onChange(async (enabled) => {
            await this.plugin.updateErrorSessionCacheSettings({ enabled });
          });
      });

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.errorSessionCacheLimit"))
      .setDesc(t(settings.language, "settings.desc.errorSessionCacheLimit", {
        defaultLimit: errorSessionCacheInfo.defaultLimit,
      }))
      .addText((text) => {
        text
          .setPlaceholder(String(errorSessionCacheInfo.defaultLimit))
          .setValue(String(settings.errorSessionCache.limit))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            await this.plugin.updateErrorSessionCacheSettings({ limit: parsed });
          });
      });

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.errorSessionCacheLocation"))
      .setDesc(errorSessionCacheInfo.cachePath);

    containerEl.createEl("p", {
      cls: "obsidian-refined-layer-settings-note",
      text: t(settings.language, "settings.desc.cachePrivacy"),
    });

    const profileContainer = this.createSettingsGroup(
      containerEl,
      t(settings.language, "settings.title.profileTemplateSettings"),
      t(settings.language, "settings.desc.profileTemplateSettings"),
      true,
      "obsidian-refined-layer-settings-profile-root",
    );
    this.addProfileSettings(profileContainer, settings);
    this.addBlockConfigSettings(profileContainer, settings);
    this.addTagConfigSettings(profileContainer, settings);
    this.addPromptObservationSettings(profileContainer, settings);

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.draftFolder"))
      .setDesc(t(settings.language, "settings.desc.draftFolder"))
      .addText((text) => {
        text
          .setValue(settings.draftFolder)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ draftFolder: value.trim() || settings.draftFolder });
          });
      });

    const providerSetting = new Setting(containerEl)
      .setName(t(settings.language, "settings.title.providerType"))
      .setDesc(secretAvailable
        ? t(settings.language, "settings.desc.providerType")
        : t(settings.language, "settings.warning.secretUnavailable"));

    providerSetting
      .addDropdown((dropdown) => {
        dropdown
          .addOption("mock", t(settings.language, "settings.option.provider.mock"))
          .addOption("openai-compatible", t(settings.language, "settings.option.provider.openai"))
          .addOption("deepseek", t(settings.language, "settings.option.provider.deepseek"))
          .addOption("custom-openai-compatible", t(settings.language, "settings.option.provider.custom"))
          .addOption("local-openai-compatible", t(settings.language, "settings.option.provider.local"))
          .setValue(providerType)
          .onChange(async (value) => {
            await this.plugin.switchProviderType(value as ProviderType);
            this.display();
          });
      });

    containerEl.createEl("p", {
      cls: "obsidian-refined-layer-settings-note",
      text: t(settings.language, `settings.help.provider.${providerType}` as never),
    });

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.modelConnectionTest"))
      .setDesc(t(settings.language, "settings.desc.modelConnectionTest"))
      .addButton((button) => {
        button
          .setButtonText(t(settings.language, "settings.button.modelConnectionTest"))
          .onClick(async () => {
            await this.plugin.testModelConnection();
          });
      });

    if (providerType !== "mock") {
      const modelSetting = new Setting(containerEl)
        .setName(t(settings.language, "settings.title.providerModel"))
        .setDesc(t(settings.language, "settings.desc.providerModel"));

      modelSetting.addText((text) => {
        text
          .setValue(provider?.model ?? "")
          .setPlaceholder(t(settings.language, `settings.placeholder.model.${providerType}` as never))
          .onChange(async (value) => {
            await this.plugin.updateProviderSettings({ model: value.trim() });
          });
      });
    }

    if (providerPreset.allowsBaseUrlEdit) {
      const baseUrlSetting = new Setting(containerEl)
        .setName(t(settings.language, "settings.title.baseUrl"))
        .setDesc(t(settings.language, "settings.desc.baseUrl"));

      baseUrlSetting.addText((text) => {
        text
          .setValue(provider?.baseUrl ?? "")
          .setPlaceholder(t(settings.language, `settings.placeholder.baseUrl.${providerType}` as never))
          .onChange(async (value) => {
            await this.plugin.updateProviderSettings({ baseUrl: value.trim() });
          });
      });
    }

    if (providerPreset.requiresSecret) {
      const secretRefSetting = new Setting(containerEl)
        .setName(t(settings.language, "settings.title.secretRef"))
        .setDesc(t(settings.language, "settings.desc.secretRef"))
        .setDisabled(!secretAvailable);

      secretRefSetting.addText((text) => {
        text
          .setValue(provider?.secretRef ?? "")
          .setPlaceholder(t(settings.language, `settings.placeholder.secretRef.${providerType}` as never))
          .setDisabled(!secretAvailable)
          .onChange(async (value) => {
            await this.plugin.updateProviderSettings({ secretRef: value.trim() });
          });
      });

      const apiKeySetting = new Setting(containerEl)
        .setName(t(settings.language, "settings.title.apiKey"))
        .setDesc(t(settings.language, "settings.desc.apiKey"))
        .setDisabled(!secretAvailable);

      if (secretAvailable) {
        const secretComponent = new SecretComponent(this.app, apiKeySetting.controlEl);
        secretComponent.onChange(async (value) => {
          if (!value.trim()) return;
          const secretRef = this.plugin.getSettings().provider?.secretRef ?? "";
          await this.plugin.saveProviderApiKey(secretRef, value);
        });
        secretComponent.setValue("");
      } else {
        apiKeySetting.addText((text) => {
          text
            .setPlaceholder(t(settings.language, "settings.placeholder.apiKeyUnavailable"))
            .setDisabled(true);
        });
      }
    }

    const diagnosticsContainer = containerEl.createEl("details", {
      cls: "obsidian-refined-layer-settings-details",
    });
    diagnosticsContainer.createEl("summary", {
      text: t(settings.language, "settings.title.secretDiagnostics"),
    });
    diagnosticsContainer.createEl("p", {
      cls: "obsidian-refined-layer-settings-note",
      text: t(settings.language, "settings.desc.secretDiagnostics"),
    });
    const diagnosticsEl = diagnosticsContainer.createEl("textarea", {
      cls: "obsidian-refined-layer-settings-diagnostics",
    });
    diagnosticsEl.readOnly = true;
    diagnosticsEl.rows = 12;
    diagnosticsEl.value = [
      `available: ${String(secretDiagnostics.available)}`,
      `hasSecretStorage: ${String(secretDiagnostics.hasSecretStorage)}`,
      `secretStorageType: ${secretDiagnostics.secretStorageType}`,
      `secretStorageConstructorName: ${secretDiagnostics.secretStorageConstructorName}`,
      `getSecretType: ${secretDiagnostics.getSecretType}`,
      `setSecretType: ${secretDiagnostics.setSecretType}`,
      `ownKeys: ${secretDiagnostics.ownKeys.length > 0 ? secretDiagnostics.ownKeys.join(", ") : "(none)"}`,
      `configuredKeyIdPresent: ${String(secretDiagnostics.configuredKeyIdPresent)}`,
      `canReadConfiguredKey: ${String(secretDiagnostics.canReadConfiguredKey)}`,
      `readValueEqualsKeyId: ${String(secretDiagnostics.readValueEqualsKeyId)}`,
      `readValueLength: ${secretDiagnostics.readValueLength ?? "(unavailable)"}`,
      `readValuePrefix: ${secretDiagnostics.readValuePrefix}`,
      `readValueSuffix: ${secretDiagnostics.readValueSuffix}`,
      `reason: ${secretDiagnostics.reason}`,
    ].join("\n");

  }

  private addProfileSettings(containerEl: HTMLElement, settings: PluginSettings): void {
    const activeProfile = this.plugin.getActiveRefineProfile();
    const section = this.createSettingsGroup(
      containerEl,
      t(settings.language, "settings.title.profiles"),
      t(settings.language, "settings.desc.profiles"),
      true,
    );

    new Setting(section)
      .setName(t(settings.language, "settings.title.activeProfile"))
      .setDesc(t(settings.language, "settings.desc.activeProfile"))
      .addDropdown((dropdown) => {
        for (const profile of settings.rawRefined.profiles) {
          dropdown.addOption(profile.id, profile.name);
        }
        dropdown
          .setValue(settings.rawRefined.activeProfileId)
          .onChange(async (activeProfileId) => {
            await this.plugin.updateActiveProfileId(activeProfileId);
            this.display();
          });
      });

    new Setting(section)
      .setName(t(settings.language, "settings.title.profileName"))
      .addText((text) => {
        text
          .setValue(activeProfile.name)
          .onChange(async (value) => {
            const result = await this.plugin.updateRawRefinedSettings({
              name: value.trim() || activeProfile.name,
            });
            this.handleBlockConfigResult(result);
          });
      });

    new Setting(section)
      .setName(t(settings.language, "settings.title.profileDescription"))
      .addText((text) => {
        text
          .setValue(activeProfile.description ?? "")
          .onChange(async (value) => {
            const result = await this.plugin.updateRawRefinedSettings({
              description: value,
            });
            this.handleBlockConfigResult(result);
          });
      });

    const actions = section.createDiv({ cls: "obsidian-refined-layer-actions" });
    actions.createEl("button", { text: t(settings.language, "settings.button.addProfile") })
      .addEventListener("click", async () => {
        await this.plugin.addRefineProfile();
        this.display();
      });
    actions.createEl("button", { text: t(settings.language, "settings.button.copyProfile") })
      .addEventListener("click", async () => {
        await this.plugin.copyActiveRefineProfile();
        this.display();
      });
    const deleteButton = actions.createEl("button", { text: t(settings.language, "settings.button.deleteProfile") });
    deleteButton.disabled = settings.rawRefined.profiles.length <= 1;
    deleteButton.addEventListener("click", async () => {
      await this.plugin.deleteActiveRefineProfile();
      this.display();
    });
  }

  private addBlockConfigSettings(containerEl: HTMLElement, settings: PluginSettings): void {
    const profile = this.plugin.getActiveRefineProfile();
    const section = this.createSettingsGroup(
      containerEl,
      t(settings.language, "settings.title.blockConfig"),
      t(settings.language, "settings.desc.blockConfig"),
      false,
    );

    new Setting(section)
      .setName(t(settings.language, "settings.title.protectH1"))
      .setDesc(t(settings.language, "settings.desc.protectH1"))
      .addToggle((toggle) => {
        toggle
          .setValue(profile.protectH1)
          .onChange(async (protectH1) => {
            const result = await this.plugin.updateRawRefinedSettings({ protectH1 });
            this.handleBlockConfigResult(result);
          });
      });

    const aBlocksContainer = section.createDiv({ cls: "obsidian-refined-layer-settings-block-list" });
    aBlocksContainer.createEl("h3", {
      text: t(settings.language, "settings.title.aBlocks"),
    });

    for (const block of profile.aBlocks.slice().sort((a, b) => a.order - b.order)) {
      this.addABlockSettings(aBlocksContainer, settings, block);
    }

    new Setting(aBlocksContainer)
      .setName(t(settings.language, "settings.title.addABlock"))
      .setDesc(t(settings.language, "settings.desc.addABlock"))
      .addButton((button) => {
        button
          .setButtonText(t(settings.language, "settings.button.addABlock"))
          .onClick(async () => {
            const current = this.plugin.getActiveRefineProfile();
            const order = current.aBlocks.reduce((max, item) => Math.max(max, item.order), 0) + 1;
            const nextBlock: ABlockConfig = {
              id: `custom-${Date.now().toString(36)}`,
              name: t(settings.language, "settings.default.aBlockName"),
              heading: t(settings.language, "settings.default.aBlockName"),
              headingLevel: current.protectH1 ? 2 : 1,
              prompt: "",
              order,
              enabled: true,
            };
            const result = await this.plugin.updateRawRefinedSettings({
              aBlocks: [...current.aBlocks, nextBlock],
            });
            this.handleBlockConfigResult(result, true);
          });
      });

    const bBlockContainer = section.createDiv({ cls: "obsidian-refined-layer-settings-block-list" });
    bBlockContainer.createEl("h3", {
      text: t(settings.language, "settings.title.bBlock"),
    });
    this.addBBlockSettings(bBlockContainer, settings, profile.bBlock);
  }

  private addTagConfigSettings(containerEl: HTMLElement, settings: PluginSettings): void {
    const profile = this.plugin.getActiveRefineProfile();
    const tagContainer = this.createSettingsGroup(
      containerEl,
      t(settings.language, "settings.title.tagConfig"),
      t(settings.language, "settings.desc.tagConfig"),
      false,
    );

    let pendingTag = "";
    new Setting(tagContainer)
      .setName(t(settings.language, "settings.title.addTag"))
      .setDesc(t(settings.language, "settings.desc.addTag"))
      .addText((text) => {
        text
          .setPlaceholder("#ai/generated")
          .onChange((value) => {
            pendingTag = value;
          });
      })
      .addButton((button) => {
        button
          .setButtonText(t(settings.language, "settings.button.addTag"))
          .onClick(async () => {
            const normalized = normalizeTagList(pendingTag);
            if (normalized.length === 0) return;
            const current = this.plugin.getActiveRefineProfile();
            const result = await this.plugin.updateRawRefinedSettings({
              tagWhitelist: mergeTags(current.tagWhitelist, normalized),
            });
            this.handleBlockConfigResult(result, true);
          });
      });

    const whitelistSetting = new Setting(tagContainer)
      .setName(t(settings.language, "settings.title.tagWhitelistBulk"))
      .setDesc(t(settings.language, "settings.desc.tagWhitelistBulk"));
    whitelistSetting.controlEl.createDiv();
    const whitelistArea = new TextAreaComponent(whitelistSetting.controlEl);
    whitelistArea.inputEl.rows = 5;
    whitelistArea.inputEl.cols = 40;
    whitelistArea.setValue(profile.tagWhitelist.join("\n"));
    whitelistArea.onChange(async (value) => {
      const result = await this.plugin.updateRawRefinedSettings({
        tagWhitelist: normalizeTagList(value),
      });
      this.handleBlockConfigResult(result);
    });

    const tagPromptSetting = new Setting(tagContainer)
      .setName(t(settings.language, "settings.title.tagPrompt"))
      .setDesc(t(settings.language, "settings.desc.tagPrompt"));
    tagPromptSetting.controlEl.createDiv();
    const tagPromptArea = new TextAreaComponent(tagPromptSetting.controlEl);
    tagPromptArea.inputEl.rows = 4;
    tagPromptArea.inputEl.cols = 40;
    tagPromptArea.setValue(profile.tagPrompt);
    tagPromptArea.onChange(async (value) => {
      const result = await this.plugin.updateRawRefinedSettings({
        tagPrompt: value,
      });
      this.handleBlockConfigResult(result);
    });
  }

  private addPromptObservationSettings(containerEl: HTMLElement, settings: PluginSettings): void {
    const profile = this.plugin.getActiveRefineProfile();
    const section = this.createSettingsGroup(
      containerEl,
      t(settings.language, "settings.title.promptObservation"),
      t(settings.language, "settings.desc.promptObservation"),
      false,
    );

    new Setting(section)
      .setName(t(settings.language, "settings.title.promptObservation"))
      .addToggle((toggle) => {
        toggle
          .setValue(profile.promptObservationEnabled)
          .onChange(async (promptObservationEnabled) => {
            const result = await this.plugin.updateRawRefinedSettings({ promptObservationEnabled });
            this.handleBlockConfigResult(result);
          });
      });

    const snapshot = this.plugin.getLatestPromptObservation();
    const snapshotSetting = new Setting(section)
      .setName(t(settings.language, "settings.title.promptObservationSnapshot"))
      .setDesc(t(settings.language, "settings.desc.promptObservationSnapshot"));
    snapshotSetting.controlEl.createDiv();
    const snapshotArea = new TextAreaComponent(snapshotSetting.controlEl);
    snapshotArea.inputEl.rows = 12;
    snapshotArea.inputEl.cols = 60;
    snapshotArea.inputEl.readOnly = true;
    snapshotArea.inputEl.addClass("obsidian-refined-layer-settings-diagnostics");
    snapshotArea.setValue(snapshot
      ? JSON.stringify(snapshot, null, 2)
      : t(settings.language, "settings.placeholder.promptObservationEmpty"));
  }

  private createSettingsGroup(
    containerEl: HTMLElement,
    title: string,
    description: string,
    open: boolean,
    extraClass?: string,
  ): HTMLElement {
    const details = containerEl.createEl("details", {
      cls: ["obsidian-refined-layer-settings-group", extraClass].filter(Boolean).join(" "),
    });
    details.open = open;

    const summary = details.createEl("summary", {
      cls: "obsidian-refined-layer-settings-group-summary",
    });
    summary.createEl("span", {
      cls: "obsidian-refined-layer-settings-group-title",
      text: title,
    });
    summary.createEl("span", {
      cls: "obsidian-refined-layer-settings-group-desc",
      text: description,
    });

    return details.createDiv({ cls: "obsidian-refined-layer-settings-group-body" });
  }


  private addABlockSettings(containerEl: HTMLElement, settings: PluginSettings, block: ABlockConfig): void {
    const blockEl = containerEl.createDiv({ cls: "obsidian-refined-layer-settings-block" });
    blockEl.createEl("h4", {
      text: `${block.order}. ${block.name}`,
    });

    new Setting(blockEl)
      .setName(t(settings.language, "settings.title.aBlockEnabled"))
      .addToggle((toggle) => {
        toggle
          .setValue(block.enabled)
          .onChange(async (enabled) => {
            await this.updateABlock(block.id, { enabled });
          });
      });

    new Setting(blockEl)
      .setName(t(settings.language, "settings.title.aBlockName"))
      .addText((text) => {
        text
          .setValue(block.name)
          .onChange(async (value) => {
            const name = value.trim() || block.name;
            await this.updateABlock(block.id, { name, heading: name });
          });
      });

    new Setting(blockEl)
      .setName(t(settings.language, "settings.title.aBlockHeadingLevel"))
      .addText((text) => {
        text
          .setPlaceholder("2")
          .setValue(String(block.headingLevel))
          .onChange(async (value) => {
            await this.updateABlock(block.id, {
              headingLevel: parseHeadingLevel(value, block.headingLevel),
            });
          });
      });

    new Setting(blockEl)
      .setName(t(settings.language, "settings.title.aBlockOrder"))
      .addText((text) => {
        text
          .setPlaceholder(String(block.order))
          .setValue(String(block.order))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            await this.updateABlock(block.id, {
              order: Number.isFinite(parsed) ? parsed : block.order,
            });
          });
      });

    const promptSetting = new Setting(blockEl)
      .setName(t(settings.language, "settings.title.aBlockPrompt"));
    promptSetting.controlEl.createDiv();
    const promptArea = new TextAreaComponent(promptSetting.controlEl);
    promptArea.inputEl.rows = 4;
    promptArea.inputEl.cols = 40;
    promptArea.setValue(block.prompt);
    promptArea.onChange(async (value) => {
      await this.updateABlock(block.id, { prompt: value });
    });

    new Setting(blockEl)
      .setName(t(settings.language, "settings.title.deleteABlock"))
      .setDesc(t(settings.language, "settings.desc.deleteABlock"))
      .addButton((button) => {
        button
          .setButtonText(t(settings.language, "settings.button.deleteABlock"))
          .onClick(async () => {
            const current = this.plugin.getActiveRefineProfile();
            const result = await this.plugin.updateRawRefinedSettings({
              aBlocks: current.aBlocks.filter((item) => item.id !== block.id),
            });
            this.handleBlockConfigResult(result, true);
          });
      });
  }

  private addBBlockSettings(containerEl: HTMLElement, settings: PluginSettings, block: BBlockConfig): void {
    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.bBlockName"))
      .addText((text) => {
        text
          .setValue(block.name)
          .onChange(async (value) => {
            const name = value.trim() || block.name;
            await this.updateBBlock({ name, heading: name });
          });
      });

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.bBlockHeadingLevel"))
      .addText((text) => {
        text
          .setPlaceholder("2")
          .setValue(String(block.headingLevel))
          .onChange(async (value) => {
            await this.updateBBlock({
              headingLevel: parseHeadingLevel(value, block.headingLevel),
            });
          });
      });
  }

  private async updateABlock(id: string, partial: Partial<ABlockConfig>): Promise<void> {
    const current = this.plugin.getActiveRefineProfile();
    const result = await this.plugin.updateRawRefinedSettings({
      aBlocks: current.aBlocks.map((block) => block.id === id ? { ...block, ...partial } : block),
    });
    this.handleBlockConfigResult(result);
  }

  private async updateBBlock(partial: Partial<BBlockConfig>): Promise<void> {
    const current = this.plugin.getActiveRefineProfile();
    const result = await this.plugin.updateRawRefinedSettings({
      bBlock: {
        ...current.bBlock,
        ...partial,
      },
    });
    this.handleBlockConfigResult(result);
  }

  private handleBlockConfigResult(
    result: { ok: true } | { ok: false; errors: { message: string }[] },
    redisplay = false,
  ): void {
    if (!result.ok) {
      new Notice(result.errors.map((error) => error.message).join("\n"), 8000);
      return;
    }

    if (redisplay) {
      this.display();
    }
  }
}

function parseHeadingLevel(value: string, fallback: ABlockConfig["headingLevel"]): ABlockConfig["headingLevel"] {
  const parsed = Number.parseInt(value, 10);
  if (parsed >= 1 && parsed <= 6) {
    return parsed as ABlockConfig["headingLevel"];
  }
  return fallback;
}

function mergeTags(existing: string[], incoming: string[]): string[] {
  return [...existing, ...incoming].filter((tag, index, all) => all.indexOf(tag) === index);
}
