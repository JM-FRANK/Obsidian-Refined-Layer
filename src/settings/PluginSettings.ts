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
