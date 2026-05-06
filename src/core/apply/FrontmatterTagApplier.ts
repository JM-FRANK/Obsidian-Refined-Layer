import { parseFrontmatter } from "../profile/FrontmatterParser";
import type { WorkflowProfile } from "../profile/WorkflowProfile";

export function applyFrontmatterChanges(
  markdown: string,
  changes: {
    status?: "refined";
    source?: Array<"self" | "external" | "practice">;
    context?: string[];
  },
): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parsed = parseFrontmatter(normalized);
  const base = parsed.hasFrontmatter ? parsed.frontmatter : {};
  const nextFrontmatter: Record<string, string | string[]> = {
    ...base,
  };

  if (changes.status) {
    nextFrontmatter.status = changes.status;
  }
  if (changes.source) {
    nextFrontmatter.source = changes.source;
  }
  if (changes.context) {
    nextFrontmatter.context = changes.context;
  }

  const body = parsed.hasFrontmatter ? parsed.body : normalized;
  return `---\n${serializeFrontmatter(nextFrontmatter)}\n---\n${trimLeadingNewlines(body)}`;
}

export function applyTagChanges(
  markdown: string,
  add: string[],
  remove: string[],
  profile: WorkflowProfile,
): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parsed = parseFrontmatter(normalized);
  const base = parsed.hasFrontmatter ? parsed.frontmatter : {};
  const currentTags = Array.isArray(base.tags) ? base.tags : [];
  const nextTags = new Set(currentTags.filter((tag) => typeof tag === "string"));

  for (const tag of add) {
    if (isAllowedTag(tag, profile)) {
      nextTags.add(tag);
    }
  }

  for (const tag of remove) {
    nextTags.delete(tag);
  }

  const nextFrontmatter: Record<string, string | string[]> = {
    ...base,
    tags: [...nextTags],
  };

  const body = parsed.hasFrontmatter ? parsed.body : normalized;
  return `---\n${serializeFrontmatter(nextFrontmatter)}\n---\n${trimLeadingNewlines(body)}`;
}

export function appendTags(markdown: string, tags: string[]): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const parsed = parseFrontmatter(normalized);
  const base = parsed.hasFrontmatter ? parsed.frontmatter : {};
  const currentTags = Array.isArray(base.tags) ? base.tags : [];
  const nextTags = new Set(currentTags.filter((tag) => typeof tag === "string"));

  for (const tag of tags) {
    nextTags.add(tag);
  }

  const nextFrontmatter: Record<string, string | string[]> = {
    ...base,
    tags: [...nextTags],
  };

  const body = parsed.hasFrontmatter ? parsed.body : normalized;
  return `---\n${serializeFrontmatter(nextFrontmatter)}\n---\n${trimLeadingNewlines(body)}`;
}

function isAllowedTag(tag: string, profile: WorkflowProfile): boolean {
  return profile.tags.allowedTags.includes(tag)
    && !profile.tags.blockedTags.some((blocked) => blocked.endsWith("*")
      ? tag.startsWith(blocked.slice(0, -1))
      : tag === blocked);
}

function serializeFrontmatter(frontmatter: Record<string, string | string[]>): string {
  return Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return `${key}: []`;
        }

        return `${key}:\n${value.map((item) => `  - ${item}`).join("\n")}`;
      }

      return `${key}: ${value}`;
    })
    .join("\n");
}

function trimLeadingNewlines(value: string): string {
  return value.replace(/^\n+/, "");
}
