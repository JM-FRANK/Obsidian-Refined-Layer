import type { ABlockConfig, BBlockConfig } from "./BlockConfig";

export interface RefineProfile {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  protectH1: boolean;
  aBlocks: ABlockConfig[];
  bBlock: BBlockConfig;
  tagWhitelist: string[];
  tagPrompt: string;
  promptObservationEnabled: boolean;
}

export interface RawRefinedWorkflowSettings {
  activeProfileId: string;
  profiles: RefineProfile[];
}

export function cloneRefineProfile(profile: RefineProfile): RefineProfile {
  return {
    id: profile.id,
    name: profile.name,
    ...(profile.description !== undefined ? { description: profile.description } : {}),
    ...(profile.isDefault !== undefined ? { isDefault: profile.isDefault } : {}),
    protectH1: profile.protectH1,
    aBlocks: profile.aBlocks.map((block) => ({ ...block })),
    bBlock: { ...profile.bBlock },
    tagWhitelist: [...profile.tagWhitelist],
    tagPrompt: profile.tagPrompt,
    promptObservationEnabled: profile.promptObservationEnabled,
  };
}

export function resolveRefineProfile(
  settings: RawRefinedWorkflowSettings,
  profileId = settings.activeProfileId,
): RefineProfile {
  return settings.profiles.find((profile) => profile.id === profileId)
    ?? settings.profiles[0];
}

export function createProfileId(seed = "profile"): string {
  return `${seed}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
