import type { WorkflowProfile } from "../profile/WorkflowProfile";
import type { RawRefinedProposal, RefinedSections } from "./Proposal";

export type ProposalValidationLayer = "json" | "schema" | "policy" | "content";

export interface ProposalValidationError {
  layer: ProposalValidationLayer;
  code: string;
  message: string;
}

export type ProposalValidationResult =
  | {
      ok: true;
      proposal: RawRefinedProposal;
    }
  | {
      ok: false;
      errors: ProposalValidationError[];
    };

export interface ProposalValidationContext {
  protectedRegionText?: string;
}

export class ProposalValidator {
  constructor(private readonly profile: WorkflowProfile) {}

  validateModelOutput(output: string, context: ProposalValidationContext = {}): ProposalValidationResult {
    const parsed = this.parseJsonLikeOutput(output);
    if (!parsed.ok) {
      return parsed;
    }

    const schema = this.validateSchema(parsed.value);
    if (!schema.ok) {
      return schema;
    }

    const policyErrors = this.validatePolicy(schema.proposal, parsed.value);
    if (policyErrors.length > 0) {
      return { ok: false, errors: policyErrors };
    }

    const contentErrors = this.validateContent(schema.proposal, parsed.value, context);
    if (contentErrors.length > 0) {
      return { ok: false, errors: contentErrors };
    }

    return {
      ok: true,
      proposal: schema.proposal,
    };
  }

  validateEditedRefinedSections(
    refinedSections: RefinedSections,
    context: ProposalValidationContext = {},
  ): { ok: true; refinedSections: RefinedSections } | { ok: false; errors: ProposalValidationError[] } {
    const schemaErrors = this.validateRefinedSectionsSchema(refinedSections);
    if (schemaErrors.length > 0) {
      return {
        ok: false,
        errors: schemaErrors,
      };
    }

    const proposal: RawRefinedProposal = {
      workflowProfileId: "raw-refined",
      refinedSections,
    };
    const contentErrors = this.validateContent(proposal, { refinedSections }, context);
    if (contentErrors.length > 0) {
      return {
        ok: false,
        errors: contentErrors,
      };
    }

    return {
      ok: true,
      refinedSections,
    };
  }

  private parseJsonLikeOutput(output: string): { ok: true; value: unknown } | { ok: false; errors: ProposalValidationError[] } {
    const candidates = [output.trim(), extractJsonBlock(output)];

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      try {
        return {
          ok: true,
          value: JSON.parse(candidate),
        };
      } catch {
        continue;
      }
    }

    return {
      ok: false,
      errors: [
        {
          layer: "json",
          code: "invalid-json",
          message: "Model output is not valid JSON.",
        },
      ],
    };
  }

  private validateSchema(value: unknown): ProposalValidationResult {
    if (!isRecord(value)) {
      return schemaError("invalid-root", "Proposal root must be an object.");
    }

    if (value.workflowProfileId !== this.profile.proposalSchema.workflowProfileId) {
      return schemaError("invalid-workflow-profile-id", "workflowProfileId must be raw-refined.");
    }

    if (!isRecord(value.refinedSections)) {
      return schemaError("missing-refined-sections", "refinedSections is required.");
    }

    const refinedSectionErrors = this.validateRefinedSectionsSchema(value.refinedSections);
    if (refinedSectionErrors.length > 0) {
      return {
        ok: false,
        errors: [refinedSectionErrors[0]],
      };
    }

    if (value.frontmatterSuggestion !== undefined && !isRecord(value.frontmatterSuggestion)) {
      return schemaError("invalid-frontmatter-suggestion", "frontmatterSuggestion must be an object.");
    }

    if (value.tagSuggestion !== undefined && !isRecord(value.tagSuggestion)) {
      return schemaError("invalid-tag-suggestion", "tagSuggestion must be an object.");
    }

    if (isRecord(value.tagSuggestion) && !validateStringArray(value.tagSuggestion.add)) {
      return schemaError("invalid-tag-add", "tagSuggestion.add must be an array of strings.");
    }

    if (isRecord(value.tagSuggestion) && !validateStringArray(value.tagSuggestion.remove)) {
      return schemaError("invalid-tag-remove", "tagSuggestion.remove must be an array of strings.");
    }

    if (value.warnings !== undefined && !validateStringArray(value.warnings)) {
      return schemaError("invalid-warnings", "warnings must be an array of strings.");
    }

    return {
      ok: true,
      proposal: {
        workflowProfileId: "raw-refined",
        refinedSections: {
          summary: value.refinedSections.summary,
          coreQuestion: value.refinedSections.coreQuestion,
          currentConclusion: value.refinedSections.currentConclusion,
          reasoning: value.refinedSections.reasoning,
          ...(typeof value.refinedSections.scope === "string" ? { scope: value.refinedSections.scope } : {}),
          ...(typeof value.refinedSections.nextSteps === "string" ? { nextSteps: value.refinedSections.nextSteps } : {}),
          ...(typeof value.refinedSections.refineNote === "string" ? { refineNote: value.refinedSections.refineNote } : {}),
        },
        ...(isRecord(value.frontmatterSuggestion)
          ? { frontmatterSuggestion: value.frontmatterSuggestion as RawRefinedProposal["frontmatterSuggestion"] }
          : {}),
        ...(isRecord(value.tagSuggestion)
          ? { tagSuggestion: value.tagSuggestion as RawRefinedProposal["tagSuggestion"] }
          : {}),
        ...(Array.isArray(value.warnings) ? { warnings: value.warnings as string[] } : {}),
      },
    };
  }

  private validateRefinedSectionsSchema(value: unknown): ProposalValidationError[] {
    if (!isRecord(value)) {
      return [{
        layer: "schema",
        code: "missing-refined-sections",
        message: "refinedSections is required.",
      }];
    }

    for (const key of this.profile.outputSections.required) {
      if (typeof value[key] !== "string" || value[key].trim() === "") {
        return [{
          layer: "schema",
          code: `missing-required-section-${key}`,
          message: `refinedSections.${key} must be a non-empty string.`,
        }];
      }
    }

    for (const key of this.profile.outputSections.optional) {
      const sectionValue = value[key];
      if (sectionValue !== undefined && typeof sectionValue !== "string") {
        return [{
          layer: "schema",
          code: `invalid-section-type-${key}`,
          message: `refinedSections.${key} must be a string when present.`,
        }];
      }
    }

    return [];
  }

  private validatePolicy(proposal: RawRefinedProposal, rawValue: unknown): ProposalValidationError[] {
    const errors: ProposalValidationError[] = [];
    const raw = isRecord(rawValue) ? rawValue : {};

    if (proposal.frontmatterSuggestion) {
      for (const key of Object.keys(proposal.frontmatterSuggestion)) {
        if (!this.profile.frontmatter.allowedFields.includes(key as never)) {
          errors.push(policyError("unknown-frontmatter-field", `frontmatterSuggestion.${key} is not allowed.`));
          continue;
        }

        if (this.profile.frontmatter.readonlyFields.includes(key as never)) {
          errors.push(policyError("readonly-frontmatter-field", `frontmatterSuggestion.${key} is readonly.`));
        }
      }

      if (
        proposal.frontmatterSuggestion.status !== undefined
        && proposal.frontmatterSuggestion.status !== "refined"
      ) {
        errors.push(policyError("invalid-status-suggestion", "frontmatterSuggestion.status must be refined when present."));
      }

      if (proposal.frontmatterSuggestion.source !== undefined) {
        const valid = Array.isArray(proposal.frontmatterSuggestion.source)
          && proposal.frontmatterSuggestion.source.every((item) => item === "self" || item === "external" || item === "practice");
        if (!valid) {
          errors.push(policyError("invalid-source-suggestion", "frontmatterSuggestion.source contains unsupported values."));
        }
      }

      if (
        proposal.frontmatterSuggestion.context !== undefined
        && !validateStringArray(proposal.frontmatterSuggestion.context)
      ) {
        errors.push(policyError("invalid-context-suggestion", "frontmatterSuggestion.context must be an array of strings."));
      }
    }

    const tags = [...(proposal.tagSuggestion?.add ?? []), ...(proposal.tagSuggestion?.remove ?? [])];
    for (const tag of tags) {
      if (!this.profile.tags.allowedTags.includes(tag)) {
        errors.push(policyError("unknown-tag", `Tag ${tag} is not allowed by the active profile.`));
      }
      if (this.profile.tags.blockedTags.some((blockedTag) => blockedTag.endsWith("*")
        ? tag.startsWith(blockedTag.slice(0, -1))
        : tag === blockedTag)) {
        errors.push(policyError("blocked-tag", `Tag ${tag} is blocked by the active profile.`));
      }
    }

    const forbiddenFields: Array<[string, string]> = [
      ["linkOperations", "links"],
      ["mocOperations", "moc"],
      ["renameSuggestion", "rename"],
      ["moveSuggestion", "move"],
      ["archiveSuggestion", "archive"],
      ["deleteSuggestion", "delete"],
    ];

    for (const [fieldName, capability] of forbiddenFields) {
      if (raw[fieldName] !== undefined) {
        errors.push(policyError("forbidden-capability", `Proposal field ${fieldName} is forbidden because ${capability} capability is disabled.`));
      }
    }

    return errors;
  }

  private validateContent(
    proposal: RawRefinedProposal,
    rawValue: unknown,
    context: ProposalValidationContext,
  ): ProposalValidationError[] {
    const errors: ProposalValidationError[] = [];
    const protectedRegionText = context.protectedRegionText?.trim();

    if (protectedRegionText) {
      const allTextValues = collectStringValues(rawValue);
      if (allTextValues.some((value) => value.includes(protectedRegionText))) {
        errors.push(contentError("protected-region-leakage", "Proposal must not include protected region text."));
      }
    }

    const textValues = collectStringValues(proposal);

    if (textValues.some((value) => value.includes("## 原始内容"))) {
      errors.push(contentError("protected-heading-in-proposal", "Proposal must not include the protected heading ## 原始内容."));
    }

    if (textValues.some((value) => value.includes("#rel/"))) {
      errors.push(contentError("relationship-tag-in-content", "Proposal content must not include #rel/* tags."));
    }

    return errors;
  }
}

function extractJsonBlock(output: string): string | null {
  const fencedMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() ?? null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string"));
}

function schemaError(code: string, message: string): ProposalValidationResult {
  return {
    ok: false,
    errors: [
      {
        layer: "schema",
        code,
        message,
      },
    ],
  };
}

function policyError(code: string, message: string): ProposalValidationError {
  return {
    layer: "policy",
    code,
    message,
  };
}

function contentError(code: string, message: string): ProposalValidationError {
  return {
    layer: "content",
    code,
    message,
  };
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringValues(item));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => collectStringValues(item));
  }

  return [];
}
