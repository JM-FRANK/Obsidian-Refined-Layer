export interface PluginSettings {
  language: "zh-CN" | "en";
  historyLimit: number;
  draftFolder: string;
  provider?: {
    type: "mock" | "openai-compatible";
    model?: string;
    secretRef?: string;
  };
  promptOverrides?: Record<
    string,
    {
      enabled: boolean;
      systemPrompt?: string;
      userPrompt?: string;
    }
  >;
}

export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
  language: "zh-CN",
  historyLimit: 5,
  draftFolder: "80_Runtime/refine-drafts",
  provider: {
    type: "mock",
  },
  promptOverrides: {},
};
