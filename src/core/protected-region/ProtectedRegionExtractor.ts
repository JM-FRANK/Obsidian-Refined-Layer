import type { ProtectedRegionDefinition } from "../profile/WorkflowProfile";
import type { ProtectedRegionExtractionResult } from "./ProtectedRegion";

export class ProtectedRegionExtractor {
  extract(markdown: string, definition: ProtectedRegionDefinition): ProtectedRegionExtractionResult {
    if (definition.mode !== "from-heading-to-end") {
      return {
        ok: false,
        error: {
          code: "unsupported-mode",
          message: `Protected region mode ${definition.mode} is not implemented in v0.1.0.`,
        },
      };
    }

    const headingPattern = new RegExp(`^${escapeRegExp(definition.heading)}\\s*\\r?$`, "gm");
    const matches = [...markdown.matchAll(headingPattern)];

    if (matches.length === 0) {
      return {
        ok: false,
        error: {
          code: "missing-heading",
          message: `Required heading ${definition.heading} was not found.`,
        },
      };
    }

    if (matches.length > 1) {
      return {
        ok: false,
        error: {
          code: "multiple-heading",
          message: `Protected heading ${definition.heading} appears multiple times.`,
        },
      };
    }

    const regionStart = matches[0].index ?? 0;
    const text = markdown.slice(regionStart);

    if (text.trim() === definition.heading) {
      return {
        ok: false,
        error: {
          code: "empty-protected-region",
          message: `Protected heading ${definition.heading} has no content after it.`,
        },
      };
    }

    return {
      ok: true,
      region: {
        id: definition.id,
        heading: definition.heading,
        mode: definition.mode,
        text,
      },
    };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
