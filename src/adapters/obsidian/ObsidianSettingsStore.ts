import type { Plugin } from "obsidian";

import { DEFAULT_PLUGIN_SETTINGS, type PluginSettings } from "../../settings/PluginSettings";
import type { ProviderSettings } from "../../settings/ProviderConfig";

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
      ? sanitizeProvider(settings.provider)
      : undefined,
    promptOverrides: settings.promptOverrides ?? {},
  };
}

function sanitizeProvider(provider: ProviderSettings): ProviderSettings {
  return {
    type: provider.type,
    ...(provider.model ? { model: provider.model } : {}),
    ...(provider.secretRef ? { secretRef: provider.secretRef } : {}),
    ...(provider.baseUrl ? { baseUrl: provider.baseUrl } : {}),
  };
}
