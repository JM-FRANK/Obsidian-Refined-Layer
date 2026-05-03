export type ProviderType =
  | "mock"
  | "openai-compatible"
  | "deepseek"
  | "custom-openai-compatible"
  | "local-openai-compatible";

export interface ProviderSettings {
  type: ProviderType;
  model?: string;
  secretRef?: string;
  baseUrl?: string;
}

export interface ProviderPreset {
  type: ProviderType;
  defaultModel?: string;
  defaultSecretRef?: string;
  defaultBaseUrl?: string;
  requiresSecret: boolean;
  allowsBaseUrlEdit: boolean;
}

const PROVIDER_PRESETS: Record<ProviderType, ProviderPreset> = {
  mock: {
    type: "mock",
    requiresSecret: false,
    allowsBaseUrlEdit: false,
  },
  "openai-compatible": {
    type: "openai-compatible",
    defaultModel: "gpt-4.1-mini",
    defaultSecretRef: "obsidian-refined-layer-openai",
    defaultBaseUrl: "https://api.openai.com/v1",
    requiresSecret: true,
    allowsBaseUrlEdit: false,
  },
  deepseek: {
    type: "deepseek",
    defaultModel: "deepseek-v4-flash",
    defaultSecretRef: "obsidian-refined-layer-deepseek",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    requiresSecret: true,
    allowsBaseUrlEdit: false,
  },
  "custom-openai-compatible": {
    type: "custom-openai-compatible",
    defaultSecretRef: "obsidian-refined-layer-custom",
    defaultBaseUrl: "https://your-provider.example.com/v1",
    requiresSecret: true,
    allowsBaseUrlEdit: true,
  },
  "local-openai-compatible": {
    type: "local-openai-compatible",
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    requiresSecret: false,
    allowsBaseUrlEdit: true,
  },
};

export function getProviderPreset(type: ProviderType): ProviderPreset {
  return PROVIDER_PRESETS[type];
}

export function getDefaultProviderSettings(type: ProviderType): ProviderSettings {
  const preset = getProviderPreset(type);

  return {
    type,
    ...(preset.defaultModel ? { model: preset.defaultModel } : {}),
    ...(preset.defaultSecretRef ? { secretRef: preset.defaultSecretRef } : {}),
    ...(preset.defaultBaseUrl ? { baseUrl: preset.defaultBaseUrl } : {}),
  };
}
