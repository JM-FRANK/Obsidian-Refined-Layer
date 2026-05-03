import { PluginSettingTab, Setting, TextAreaComponent, type App } from "obsidian";

import type ObsidianRefinedLayerPlugin from "../../main";
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
