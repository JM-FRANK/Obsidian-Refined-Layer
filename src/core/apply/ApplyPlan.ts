export interface ApplyOperation {
  type: string;
  targetPath: string;
}

export interface ApplyPlan {
  notePath: string;
  operations: ApplyOperation[];
}
