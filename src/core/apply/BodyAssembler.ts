import type { ProposalSession } from "../../runtime/ProposalSession";
import type { RefinedSections } from "../proposal/Proposal";
import type { ProtectedRegionDefinition } from "../profile/WorkflowProfile";
import type { ProtectedRegionExtractionError } from "../protected-region/ProtectedRegion";
import { ProtectedRegionExtractor } from "../protected-region/ProtectedRegionExtractor";
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

  assemble(
    session: ProposalSession,
    protectedRegionDef: ProtectedRegionDefinition,
    currentContent: string,
    refinedSections?: RefinedSections,
  ): BodyAssemblyResult {
    const protectedRegion = this.extractor.extract(currentContent, protectedRegionDef);

    if (!protectedRegion.ok) {
      return protectedRegion;
    }

    if (!protectedRegion.region.text) {
      return {
        ok: false,
        error: {
          code: "empty-protected-region",
          message: "Protected region text is empty; cannot assemble body.",
        },
      };
    }

    const refinedBody = buildRefinedBodyPreview(refinedSections ?? session.proposal.refinedSections);
    const body = `${refinedBody}\n\n${protectedRegion.region.text}`;

    return {
      ok: true,
      body,
      protectedRegionText: protectedRegion.region.text,
    };
  }
}
