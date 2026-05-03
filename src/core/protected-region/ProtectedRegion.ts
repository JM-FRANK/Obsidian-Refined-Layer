import type { ProtectedRegionMode } from "../profile/WorkflowProfile";

export interface ProtectedRegion {
  id: string;
  heading: string;
  mode: ProtectedRegionMode;
  text: string;
}

export type ProtectedRegionExtractionErrorCode =
  | "missing-heading"
  | "multiple-heading"
  | "unsupported-mode"
  | "empty-protected-region";

export interface ProtectedRegionExtractionError {
  code: ProtectedRegionExtractionErrorCode;
  message: string;
}

export type ProtectedRegionExtractionResult =
  | {
      ok: true;
      region: ProtectedRegion;
    }
  | {
      ok: false;
      error: ProtectedRegionExtractionError;
    };
