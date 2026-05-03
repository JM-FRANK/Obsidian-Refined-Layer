import type { Plugin } from "obsidian";

import { DEFAULT_PLUGIN_SETTINGS, type PluginSettings } from "../../settings/PluginSettings";

export class ObsidianSettingsStore {
  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<PluginSettings> {
    const loaded = await this.plugin.loadData();
    return mergeSettings(loaded);
  }

  async save(settings: PluginSettings): Promise<void> {
    await this.plugin.saveData(sanitizeSettings(settings));
  }
}

function mergeSettings(value: unknown): PluginSettings {
  const loaded = (typeof value === "object" && value !== null ? value : {}) as Partial<PluginSettings>;

  return {
    ...DEFAULT_PLUGIN_SETTINGS,
    ...loaded,
    provider: loaded.provider ?? DEFAULT_PLUGIN_SETTINGS.provider,
    promptOverrides: loaded.promptOverrides ?? DEFAULT_PLUGIN_SETTINGS.promptOverrides,
  };
}

function sanitizeSettings(settings: PluginSettings): PluginSettings {
  return {
    language: settings.language,
    historyLimit: settings.historyLimit,
    draftFolder: settings.draftFolder,
    provider: settings.provider
      ? {
          type: settings.provider.type,
          ...(settings.provider.model ? { model: settings.provider.model } : {}),
          ...(settings.provider.secretRef ? { secretRef: settings.provider.secretRef } : {}),
        }
      : undefined,
    promptOverrides: settings.promptOverrides ?? {},
  };
}
