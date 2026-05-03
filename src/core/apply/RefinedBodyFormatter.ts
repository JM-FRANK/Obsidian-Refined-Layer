import type { RefinedSections } from "../proposal/Proposal";

export type RefinedSectionKey = keyof RefinedSections;

export const SECTION_HEADINGS: Record<RefinedSectionKey, string> = {
  summary: "## 摘要",
  coreQuestion: "## 核心问题",
  currentConclusion: "## 当前结论",
  reasoning: "## 依据与推理",
  scope: "## 适用边界",
  nextSteps: "## 后续处理",
  refineNote: "## 整理说明",
};

export function buildRefinedBodyPreview(refinedSections: RefinedSections): string {
  const lines: string[] = [];

  for (const key of Object.keys(refinedSections) as Array<RefinedSectionKey>) {
    const content = refinedSections[key];
    if (!content) {
      continue;
    }

    lines.push(SECTION_HEADINGS[key]);
    lines.push(content);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
