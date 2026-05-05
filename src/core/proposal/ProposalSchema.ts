import { z } from "zod";

/**
 * Zod schema for RawRefinedProposalV2 (v0.2.0).
 * Validates structure only — no policy, no tag whitelist check, no normalization.
 * Zod errors are structured so they can be saved to FailedAttemptRecord.
 */

export const aBlockProposalSchema = z.object({
  id: z.string().min(1, "Block id must be a non-empty string"),
  content: z.string().min(1, "Block content must be a non-empty string"),
  warnings: z.array(z.string()).optional(),
});

export const frontmatterSuggestionSchema = z
  .object({
    status: z.literal("refined").optional(),
    source: z.array(z.enum(["self", "external", "practice"])).optional(),
    context: z.array(z.string()).optional(),
  })
  .optional();

export const tagSuggestionSchema = z
  .object({
    selectedTags: z.array(z.string()).optional(),
    newTagSuggestions: z.array(z.string()).optional(),
  })
  .optional();

export const rawRefinedProposalV2Schema = z.object({
  workflowProfileId: z.literal("raw-refined"),
  schemaVersion: z.literal("0.2"),
  blocks: z
    .array(aBlockProposalSchema)
    .min(1, "At least one block is required"),
  frontmatterSuggestion: frontmatterSuggestionSchema,
  tagSuggestion: tagSuggestionSchema,
  warnings: z.array(z.string()).optional(),
});

export type RawRefinedProposalV2Parsed = z.infer<typeof rawRefinedProposalV2Schema>;
