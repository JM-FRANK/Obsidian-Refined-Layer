import type { ProposalSession } from "../../runtime/ProposalSession";
import type { RefinedSections } from "../proposal/Proposal";
import type { ProtectedRegionExtractionError } from "../protected-region/ProtectedRegion";
import { ProtectedRegionExtractor } from "../protected-region/ProtectedRegionExtractor";
import { rawRefinedProfile } from "../profile/rawRefinedProfile";
import { buildRefinedBodyPreview } from "./RefinedBodyFormatter";

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

  assemble(session: ProposalSession, currentContent: string, refinedSections?: RefinedSections): BodyAssemblyResult {
    const protectedRegion = this.extractor.extract(
      currentContent,
      rawRefinedProfile.protectedRegions.definitions[0],
    );

    if (!protectedRegion.ok) {
      return protectedRegion;
    }

    const refinedBody = buildRefinedBodyPreview(refinedSections ?? session.proposal.refinedSections);
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
}
