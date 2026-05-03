import type { ProposalSession } from "../../runtime/ProposalSession";
import type { ProtectedRegionExtractionError } from "../protected-region/ProtectedRegion";
import { ProtectedRegionExtractor } from "../protected-region/ProtectedRegionExtractor";
import { rawRefinedProfile } from "../profile/rawRefinedProfile";

const SECTION_HEADINGS: Record<keyof ProposalSession["proposal"]["refinedSections"], string> = {
  summary: "## 摘要",
  coreQuestion: "## 核心问题",
  currentConclusion: "## 当前结论",
  reasoning: "## 依据与推理",
  scope: "## 适用边界",
  nextSteps: "## 后续处理",
  refineNote: "## 整理说明",
};

export type BodyAssemblyResult =
  | {
      ok: true;
      body: string;
      protectedRegionText: string;
    }
  | {
      ok: false;
      error: ProtectedRegionExtractionError;
    };

export class BodyAssembler {
  private readonly extractor = new ProtectedRegionExtractor();

  assemble(session: ProposalSession, currentContent: string): BodyAssemblyResult {
    const protectedRegion = this.extractor.extract(
      currentContent,
      rawRefinedProfile.protectedRegions.definitions[0],
    );

    if (!protectedRegion.ok) {
      return protectedRegion;
    }

    const refinedBody = this.buildRefinedBody(session);
    const body = `${refinedBody}\n\n${protectedRegion.region.text}`;

    if (!body.endsWith(protectedRegion.region.text)) {
      return {
        ok: false,
        error: {
          code: "empty-protected-region",
          message: "Protected region text was not preserved during body assembly.",
        },
      };
    }

    return {
      ok: true,
      body,
      protectedRegionText: protectedRegion.region.text,
    };
  }

  private buildRefinedBody(session: ProposalSession): string {
    const lines: string[] = [];
    for (const key of Object.keys(session.proposal.refinedSections) as Array<keyof ProposalSession["proposal"]["refinedSections"]>) {
      const content = session.proposal.refinedSections[key];
      if (!content) {
        continue;
      }

      lines.push(SECTION_HEADINGS[key]);
      lines.push(content);
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  }
}
