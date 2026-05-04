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

  const rawRefined = loaded.rawRefined ?? DEFAULT_PLUGIN_SETTINGS.rawRefined;

  // Migrate historyLimit → sessionCache.limit if old field present and sessionCache not explicitly set
  const sessionCache = loaded.sessionCache
    ?? (loaded.historyLimit !== undefined
      ? { limit: loaded.historyLimit }
      : DEFAULT_PLUGIN_SETTINGS.sessionCache);

  return {
    ...DEFAULT_PLUGIN_SETTINGS,
    ...loaded,
    provider: loaded.provider ?? DEFAULT_PLUGIN_SETTINGS.provider,
    promptOverrides: loaded.promptOverrides ?? DEFAULT_PLUGIN_SETTINGS.promptOverrides,
    rawRefined: {
      ...DEFAULT_PLUGIN_SETTINGS.rawRefined,
      ...rawRefined,
      aBlocks: rawRefined.aBlocks ?? DEFAULT_PLUGIN_SETTINGS.rawRefined.aBlocks,
      bBlock: rawRefined.bBlock ?? DEFAULT_PLUGIN_SETTINGS.rawRefined.bBlock,
      tagWhitelist: rawRefined.tagWhitelist ?? DEFAULT_PLUGIN_SETTINGS.rawRefined.tagWhitelist,
    },
    sessionCache,
    errorSessionCache: loaded.errorSessionCache ?? DEFAULT_PLUGIN_SETTINGS.errorSessionCache,
  };
}

function sanitizeSettings(settings: PluginSettings): PluginSettings {
  const sanitized: PluginSettings = {
    language: settings.language,
    historyLimit: settings.historyLimit,
    draftFolder: settings.draftFolder,
    provider: settings.provider
      ? sanitizeProvider(settings.provider)
      : undefined,
    promptOverrides: settings.promptOverrides ?? {},
    rawRefined: {
      protectH1: settings.rawRefined?.protectH1 ?? true,
      aBlocks: (settings.rawRefined?.aBlocks ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        heading: b.heading,
        headingLevel: b.headingLevel,
        prompt: b.prompt,
        order: b.order,
        enabled: b.enabled,
      })),
      bBlock: settings.rawRefined?.bBlock ?? DEFAULT_PLUGIN_SETTINGS.rawRefined.bBlock,
      tagWhitelist: settings.rawRefined?.tagWhitelist ?? [],
      tagPrompt: settings.rawRefined?.tagPrompt ?? "",
      promptObservationEnabled: settings.rawRefined?.promptObservationEnabled ?? false,
    },
    sessionCache: {
      limit: settings.sessionCache?.limit ?? 5,
    },
    errorSessionCache: {
      enabled: settings.errorSessionCache?.enabled ?? true,
      limit: settings.errorSessionCache?.limit ?? 30,
    },
  };

  // Whitelist-only: must not leak apiKey, token, Authorization, secret
  return sanitized;
}

function sanitizeProvider(provider: ProviderSettings): ProviderSettings {
  return {
    type: provider.type,
    ...(provider.model ? { model: provider.model } : {}),
    ...(provider.secretRef ? { secretRef: provider.secretRef } : {}),
    ...(provider.baseUrl ? { baseUrl: provider.baseUrl } : {}),
  };
}
