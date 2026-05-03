import { PluginSettingTab, SecretComponent, Setting, TextAreaComponent, type App } from "obsidian";

import type ObsidianRefinedLayerPlugin from "../../main";
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
      .setName(t(settings.language, "settings.title.historyLimit"))
      .setDesc(t(settings.language, "settings.desc.historyLimit"))
      .addText((text) => {
        text
          .setPlaceholder("5")
          .setValue(String(settings.historyLimit))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            await this.plugin.updateSettings({
              historyLimit: Number.isFinite(parsed) && parsed > 0 ? parsed : settings.historyLimit,
            });
          });
      });

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
        secretComponent.setValue("");
        secretComponent.onChange(async (value) => {
          const secretRef = this.plugin.getSettings().provider?.secretRef ?? "";
          await this.plugin.saveProviderApiKey(secretRef, value);
        });
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
    diagnosticsContainer.createEl("pre", {
      cls: "obsidian-refined-layer-settings-diagnostics",
      text: [
        `available: ${String(secretDiagnostics.available)}`,
        `hasSecretStorage: ${String(secretDiagnostics.hasSecretStorage)}`,
        `secretStorageType: ${secretDiagnostics.secretStorageType}`,
        `secretStorageConstructorName: ${secretDiagnostics.secretStorageConstructorName}`,
        `getSecretType: ${secretDiagnostics.getSecretType}`,
        `setSecretType: ${secretDiagnostics.setSecretType}`,
        `ownKeys: ${secretDiagnostics.ownKeys.length > 0 ? secretDiagnostics.ownKeys.join(", ") : "(none)"}`,
        `reason: ${secretDiagnostics.reason}`,
      ].join("\n"),
    });

    new Setting(containerEl)
      .setName(t(settings.language, "settings.title.promptProfile"))
      .setDesc(t(settings.language, "settings.desc.promptProfile"));

    this.addPromptOverrideField(
      containerEl,
      settings,
      "systemPrompt",
      t(settings.language, "settings.title.systemPrompt"),
      t(settings.language, "settings.desc.systemPrompt"),
    );

    this.addPromptOverrideField(
      containerEl,
      settings,
      "userPrompt",
      t(settings.language, "settings.title.userPrompt"),
      t(settings.language, "settings.desc.userPrompt"),
    );

    containerEl.createEl("p", {
      cls: "obsidian-refined-layer-settings-note",
      text: t(settings.language, "settings.desc.promptVariables"),
    });
  }

  private addPromptOverrideField(
    containerEl: HTMLElement,
    settings: PluginSettings,
    field: "systemPrompt" | "userPrompt",
    title: string,
    description: string,
  ): void {
    const setting = new Setting(containerEl)
      .setName(title)
      .setDesc(description);

    setting.controlEl.createDiv();
    const textArea = new TextAreaComponent(setting.controlEl);
    textArea.inputEl.rows = 5;
    textArea.inputEl.cols = 40;
    textArea.setValue(settings.promptOverrides?.["raw-refined"]?.[field] ?? "");
    textArea.onChange(async (value) => {
      await this.plugin.updatePromptOverride(field, value);
    });
  }
}
