import type { RawRefinedWorkflowSettings } from "../../settings/PluginSettings";
import type { RawRefinedProposalV2Parsed } from "./ProposalSchema";
import type { ABlockProposal } from "./Proposal";
import type { ProposalValidationResult } from "../../runtime/ProposalSession";
import { normalizeProposalTags } from "./TagNormalizer";

export interface ProposalNormalizationOutput {
  blocks: ABlockProposal[];
  tagSuggestion: {
    selectedTags: string[];
    newTagSuggestions: string[];
  };
  frontmatterSuggestion?: RawRefinedProposalV2Parsed["frontmatterSuggestion"];
  validation: ProposalValidationResult;
}

export class ProposalNormalizer {
  /**
   * Normalize a zod-parsed v0.2 proposal:
   *
   *  - Accept only blocks whose id matches an enabled A block config.
   *  - Reject unknown block ids (recorded in rejectedFields).
   *  - Warn about missing enabled A blocks.
   *  - Sort accepted blocks by config order.
   *  - Normalize tags (split, trim, #-prefix, dedupe, whitelist filtering).
   *
   * The returned validation result determines whether the proposal can proceed
   * to Review UI (valid / partial) or must be retried (invalid).
   */
  normalize(
    parsed: RawRefinedProposalV2Parsed,
    settings: RawRefinedWorkflowSettings,
  ): ProposalNormalizationOutput {
    const warnings: string[] = [];
    const rejectedFields: ProposalValidationResult["rejectedFields"] = [];

    // ── Build enabled A block config index ──
    const enabledConfigMap = new Map(
      settings.aBlocks.filter((c) => c.enabled).map((c) => [c.id, c]),
    );

    // ── Normalize A blocks ──
    const acceptedBlocks: ABlockProposal[] = [];
    const acceptedBlockIds: string[] = [];

    for (const block of parsed.blocks) {
      const config = enabledConfigMap.get(block.id);
      if (!config) {
        rejectedFields.push({
          field: `block:${block.id}`,
          reason: "unknown-block-id",
          value: block.id,
        });
        continue;
      }
      acceptedBlocks.push(block);
      acceptedBlockIds.push(block.id);
    }

    // ── Warn about missing enabled blocks ──
    for (const [id, config] of enabledConfigMap) {
      if (!acceptedBlockIds.includes(id)) {
        warnings.push(`Missing enabled A block: ${id} (${config.name})`);
      }
    }

    // ── Sort accepted blocks by config order ──
    acceptedBlocks.sort((a, b) => {
      const orderA = enabledConfigMap.get(a.id)?.order ?? 0;
      const orderB = enabledConfigMap.get(b.id)?.order ?? 0;
      return orderA - orderB;
    });

    // ── Determine block status ──
    const hasRejectedBlocks = rejectedFields.length > 0;
    const hasMissingEnabled = warnings.some((w) =>
      w.startsWith("Missing enabled A block"),
    );

    // ── Normalize tags ──
    const tagInput = {
      selectedTags: parsed.tagSuggestion?.selectedTags ?? [],
      newTagSuggestions: parsed.tagSuggestion?.newTagSuggestions ?? [],
    };
    const tagResult = normalizeProposalTags(tagInput, settings.tagWhitelist);
    if (tagResult.tagNormalizationApplied) {
      warnings.push("Tag normalization applied: some tags were split, trimmed, prefixed with #, deduplicated, or moved from selectedTags to newTagSuggestions.");
    }

    // ── Determine overall status ──
    let status: ProposalValidationResult["status"];
    if (acceptedBlocks.length === 0) {
      status = "invalid";
    } else if (hasRejectedBlocks || hasMissingEnabled) {
      status = "partial";
    } else {
      status = "valid";
    }

    // ── Normalize frontmatter (pass-through, no normalization needed yet) ──
    // frontmatter validation is a policy concern, not normalization.
    // Pass the original value through as-is.

    return {
      blocks: acceptedBlocks,
      tagSuggestion: {
        selectedTags: tagResult.selectedTags,
        newTagSuggestions: tagResult.newTagSuggestions,
      },
      frontmatterSuggestion: parsed.frontmatterSuggestion,
      validation: {
        status,
        acceptedFields: acceptedBlockIds,
        rejectedFields,
        warnings,
        tagNormalizationApplied: tagResult.tagNormalizationApplied,
      },
    };
  }
}
