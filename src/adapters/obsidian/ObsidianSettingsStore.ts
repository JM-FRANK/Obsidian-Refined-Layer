import type { Plugin } from "obsidian";

import { cloneRefineProfile, type RawRefinedWorkflowSettings, type RefineProfile } from "../../core/profile/RefineProfile";
import { DEFAULT_PLUGIN_SETTINGS, DEFAULT_REFINE_PROFILE, type PluginSettings } from "../../settings/PluginSettings";
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

  const rawRefined = migrateRawRefinedSettings(loaded.rawRefined);

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
    rawRefined,
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
    rawRefined: sanitizeRawRefinedSettings(settings.rawRefined),
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

function migrateRawRefinedSettings(value: unknown): RawRefinedWorkflowSettings {
  const raw = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const maybeProfiles = Array.isArray(raw.profiles) ? raw.profiles : undefined;

  if (maybeProfiles && maybeProfiles.length > 0) {
    const profiles = maybeProfiles.map((profile) => normalizeRefineProfile(profile)).filter(Boolean) as RefineProfile[];
    const fallbackProfiles = profiles.length > 0 ? profiles : [cloneRefineProfile(DEFAULT_REFINE_PROFILE)];
    const activeProfileId = typeof raw.activeProfileId === "string"
      && fallbackProfiles.some((profile) => profile.id === raw.activeProfileId)
      ? raw.activeProfileId
      : fallbackProfiles[0].id;

    return { activeProfileId, profiles: fallbackProfiles };
  }

  return {
    activeProfileId: "default",
    profiles: [
      normalizeRefineProfile({
        ...DEFAULT_REFINE_PROFILE,
        ...raw,
        id: "default",
        name: typeof raw.name === "string" ? raw.name : DEFAULT_REFINE_PROFILE.name,
        isDefault: true,
      }) ?? cloneRefineProfile(DEFAULT_REFINE_PROFILE),
    ],
  };
}

function sanitizeRawRefinedSettings(settings: RawRefinedWorkflowSettings): RawRefinedWorkflowSettings {
  const profiles = (settings.profiles.length > 0 ? settings.profiles : [DEFAULT_REFINE_PROFILE])
    .map((profile) => normalizeRefineProfile(profile))
    .filter(Boolean) as RefineProfile[];
  const safeProfiles = profiles.length > 0 ? profiles : [cloneRefineProfile(DEFAULT_REFINE_PROFILE)];
  const activeProfileId = safeProfiles.some((profile) => profile.id === settings.activeProfileId)
    ? settings.activeProfileId
    : safeProfiles[0].id;

  return { activeProfileId, profiles: safeProfiles };
}

function normalizeRefineProfile(value: unknown): RefineProfile | null {
  const raw = (typeof value === "object" && value !== null ? value : {}) as Partial<RefineProfile>;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "default";
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : DEFAULT_REFINE_PROFILE.name;

  return {
    id,
    name,
    ...(typeof raw.description === "string" ? { description: raw.description } : {}),
    ...(raw.isDefault !== undefined ? { isDefault: Boolean(raw.isDefault) } : {}),
    protectH1: raw.protectH1 ?? DEFAULT_REFINE_PROFILE.protectH1,
    aBlocks: Array.isArray(raw.aBlocks)
      ? raw.aBlocks.map((b) => ({
          id: b.id,
          name: b.name,
          heading: b.heading,
          headingLevel: b.headingLevel,
          prompt: b.prompt,
          order: b.order,
          enabled: b.enabled,
        }))
      : DEFAULT_REFINE_PROFILE.aBlocks.map((b) => ({ ...b })),
    bBlock: raw.bBlock ? { ...raw.bBlock } : { ...DEFAULT_REFINE_PROFILE.bBlock },
    tagWhitelist: Array.isArray(raw.tagWhitelist) ? raw.tagWhitelist.filter((tag): tag is string => typeof tag === "string") : [...DEFAULT_REFINE_PROFILE.tagWhitelist],
    tagPrompt: typeof raw.tagPrompt === "string" ? raw.tagPrompt : DEFAULT_REFINE_PROFILE.tagPrompt,
    promptObservationEnabled: raw.promptObservationEnabled ?? DEFAULT_REFINE_PROFILE.promptObservationEnabled,
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
