export type ApplyOperationType =
  | "replace-refined-body"
  | "update-frontmatter"
  | "update-tags";

export interface ReplaceRefinedBodyOperation {
  type: "replace-refined-body";
  targetPath: string;
  body: string;
}

export interface UpdateFrontmatterOperation {
  type: "update-frontmatter";
  targetPath: string;
  changes: {
    status?: "refined";
    source?: Array<"self" | "external" | "practice">;
    context?: string[];
  };
}

export interface UpdateTagsOperation {
  type: "update-tags";
  targetPath: string;
  add: string[];
  remove: string[];
}

export type ApplyOperation =
  | ReplaceRefinedBodyOperation
  | UpdateFrontmatterOperation
  | UpdateTagsOperation;

export interface ApplyPlan {
  notePath: string;
  sessionId: string;
  operations: ApplyOperation[];
}
