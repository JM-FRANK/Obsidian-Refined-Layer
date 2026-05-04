import type { ABlockConfig, BBlockConfig } from "../core/profile/BlockConfig";
import type { ErrorSessionCacheSettings, SessionCacheSettings } from "../runtime/ProposalSession";
import type { ProviderSettings } from "./ProviderConfig";

export interface RawRefinedWorkflowSettings {
  protectH1: boolean;
  aBlocks: ABlockConfig[];
  bBlock: BBlockConfig;
  tagWhitelist: string[];
  tagPrompt: string;
  promptObservationEnabled: boolean;
}

export interface PluginSettings {
  language: "zh-CN" | "en";
  historyLimit: number;
  draftFolder: string;
  provider?: ProviderSettings;
  promptOverrides?: Record<
    string,
    {
      enabled: boolean;
      systemPrompt?: string;
      userPrompt?: string;
    }
  >;

  // v0.2.0
  rawRefined: RawRefinedWorkflowSettings;
  sessionCache: SessionCacheSettings;
  errorSessionCache: ErrorSessionCacheSettings;
}

export const DEFAULT_TAG_WHITELIST = [
  "#ai/generated",
  "#ai/assisted",
  "#ai/reviewed",
  "#ai/suggested",
  "#todo/refine",
  "#todo/link",
  "#todo/review",
  "#flag/core",
  "#flag/sensitive",
];

export const DEFAULT_A_BLOCKS: ABlockConfig[] = [
  {
    id: "summary",
    name: "摘要",
    heading: "摘要",
    headingLevel: 2,
    prompt: "用中文生成一段简洁的摘要，概括笔记的核心内容。",
    order: 1,
    enabled: true,
  },
  {
    id: "coreQuestion",
    name: "核心问题",
    heading: "核心问题",
    headingLevel: 2,
    prompt: "提炼笔记要解决的核心问题或主要疑问。",
    order: 2,
    enabled: true,
  },
  {
    id: "currentConclusion",
    name: "当前结论",
    heading: "当前结论",
    headingLevel: 2,
    prompt: "总结当前笔记已经得出的结论或判断。",
    order: 3,
    enabled: true,
  },
  {
    id: "reasoning",
    name: "依据与推理",
    heading: "依据与推理",
    headingLevel: 2,
    prompt: "整理笔记中的推理过程、证据和逻辑链。",
    order: 4,
    enabled: true,
  },
  {
    id: "scope",
    name: "适用边界",
    heading: "适用边界",
    headingLevel: 2,
    prompt: "指出结论的适用范围、限制条件和边界情况。如无明确边界，可留空。",
    order: 5,
    enabled: true,
  },
  {
    id: "nextSteps",
    name: "后续处理",
    heading: "后续处理",
    headingLevel: 2,
    prompt: "列出需要进一步研究或处理的事项。如无后续事项，可留空。",
    order: 6,
    enabled: true,
  },
  {
    id: "refineNote",
    name: "整理说明",
    heading: "整理说明",
    headingLevel: 2,
    prompt: "说明本次整理做了什么改动、为何做这些改动。如无特别说明，可留空。",
    order: 7,
    enabled: true,
  },
];

export const DEFAULT_B_BLOCK: BBlockConfig = {
  id: "original-content",
  name: "原始内容",
  heading: "原始内容",
  headingLevel: 2,
  required: true,
};

export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
  language: "zh-CN",
  historyLimit: 5,
  draftFolder: "80_Runtime/refine-drafts",
  provider: {
    type: "mock",
  },
  promptOverrides: {},

  rawRefined: {
    protectH1: true,
    aBlocks: DEFAULT_A_BLOCKS,
    bBlock: DEFAULT_B_BLOCK,
    tagWhitelist: DEFAULT_TAG_WHITELIST,
    tagPrompt: "从 tagWhitelist 中选择合适的标签作为 selectedTags，如有必要建议新标签作为 newTagSuggestions。不要将非白名单标签放入 selectedTags。",
    promptObservationEnabled: false,
  },
  sessionCache: {
    limit: 5,
  },
  errorSessionCache: {
    enabled: true,
    limit: 30,
  },
};
