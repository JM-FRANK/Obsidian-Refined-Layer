export type FrontmatterValue = string | string[];

export interface FrontmatterParseResult {
  hasFrontmatter: boolean;
  frontmatter: Record<string, FrontmatterValue>;
  body: string;
}

export function parseFrontmatter(markdown: string): FrontmatterParseResult {
  if (!markdown.startsWith("---\n") && !markdown.startsWith("---\r\n")) {
    return {
      hasFrontmatter: false,
      frontmatter: {},
      body: markdown,
    };
  }

  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines.length < 3 || lines[0] !== "---") {
    return {
      hasFrontmatter: false,
      frontmatter: {},
      body: markdown,
    };
  }

  const closingIndex = lines.indexOf("---", 1);

  if (closingIndex === -1) {
    return {
      hasFrontmatter: false,
      frontmatter: {},
      body: markdown,
    };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join("\n");
  const frontmatter: Record<string, FrontmatterValue> = {};
  let currentArrayKey: string | null = null;

  for (const line of frontmatterLines) {
    if (/^\s*-\s+/.test(line)) {
      if (!currentArrayKey) {
        continue;
      }

      const value = line.replace(/^\s*-\s+/, "").trim();
      const existing = frontmatter[currentArrayKey];
      if (Array.isArray(existing)) {
        existing.push(stripQuotes(value));
      }
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      currentArrayKey = null;
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if (value === "") {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }

    currentArrayKey = null;

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      frontmatter[key] = inner === ""
        ? []
        : inner.split(",").map((item) => stripQuotes(item.trim()));
      continue;
    }

    frontmatter[key] = stripQuotes(value);
  }

  return {
    hasFrontmatter: true,
    frontmatter,
    body,
  };
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}
