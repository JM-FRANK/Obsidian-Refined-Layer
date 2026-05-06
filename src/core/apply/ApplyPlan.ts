export type ApplyOperationType =
  | "replace-refined-body"
  | "update-frontmatter"
  | "update-tags"
  | "replace-refined-blocks"
  | "append-tags";

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

export interface ReplaceRefinedBlocksOperation {
  type: "replace-refined-blocks";
  targetPath: string;
  blocks: Array<{
    id: string;
    heading: string;
    headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
    content: string;
  }>;
}

export interface AppendTagsOperation {
  type: "append-tags";
  targetPath: string;
  tags: string[];
}

export type ApplyOperation =
  | ReplaceRefinedBodyOperation
  | UpdateFrontmatterOperation
  | UpdateTagsOperation
  | ReplaceRefinedBlocksOperation
  | AppendTagsOperation;

export interface ApplyPlan {
  notePath: string;
  sessionId: string;
  operations: ApplyOperation[];
}
