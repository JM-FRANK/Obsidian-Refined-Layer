export interface ABlockConfig {
  id: string;
  name: string;
  heading: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  prompt: string;
  order: number;
  enabled: boolean;
}

export interface BBlockConfig {
  id: "original-content";
  name: string;
  heading: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  required: true;
}
