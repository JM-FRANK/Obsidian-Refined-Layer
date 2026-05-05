/**
 * TagNormalizer — v0.2.0 tag normalization.
 *
 * Splits tag strings by separators, trims, removes empty items, adds `#` if
 * missing, and deduplicates. Does NOT normalize case.
 *
 * Also moves non-whitelisted tags from selectedTags to newTagSuggestions.
 * This is pure structure normalization — no policy, no validation, no I/O.
 *
 * tagNormalizationApplied is a local-only flag: it lives in ProposalSession /
 * validation report, never in LLM output or note content.
 */

// Separators: English comma, Chinese comma, space, newline, Chinese dunhao
const TAG_SEPARATORS = /[，、,\s]+/;

/**
 * Split a single tag string by separators, normalize each tag.
 *
 * Steps:
 *  1. Split by `,` `，` ` ` `\n` `、`
 *  2. Trim each item
 *  3. Remove empty items
 *  4. Prepend `#` if missing
 *  5. Deduplicate (preserving first-occurrence order)
 *
 * Does NOT normalize case.
 */
export function normalizeTagList(raw: string): string[] {
  return raw
    .split(TAG_SEPARATORS)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => (t.startsWith("#") ? t : "#" + t))
    .filter((t, i, arr) => arr.indexOf(t) === i);
}

export interface TagNormalizationInput {
  selectedTags: string[];
  newTagSuggestions: string[];
}

export interface TagNormalizationResult {
  selectedTags: string[];
  newTagSuggestions: string[];
  tagNormalizationApplied: boolean;
}

function dedupe(arr: string[]): string[] {
  return arr.filter((t, i) => arr.indexOf(t) === i);
}

/**
 * Normalize proposal tag fields according to v0.2.0 rules:
 *
 *  - Each string in selectedTags / newTagSuggestions is run through
 *    normalizeTagList (split by separators, trim, add #, dedupe).
 *  - Non-whitelisted tags in selectedTags are moved to newTagSuggestions.
 *  - tagNormalizationApplied is true if any processing occurred.
 *
 * This function is called AFTER zod validation, as part of ProposalNormalizer.
 */
export function normalizeProposalTags(
  input: TagNormalizationInput,
  whitelist: string[],
): TagNormalizationResult {
  let applied = false;

  // ── Helper: normalize a single raw string and track if anything changed ──
  const normalizeAndTrack = (raw: string): string[] => {
    const tags = normalizeTagList(raw);
    if (tags.length !== 1 || tags[0] !== raw) {
      applied = true;
    }
    return tags;
  };

  // ── Normalize all selected tags (deduped after flatMap) ──
  const allSelected = dedupe(input.selectedTags.flatMap(normalizeAndTrack));

  // ── Normalize all new tag suggestions (deduped after flatMap) ──
  const allNew = dedupe(input.newTagSuggestions.flatMap(normalizeAndTrack));

  // ── Separate whitelisted from non-whitelisted in selected ──
  const whitelistedSelected: string[] = [];
  const movedToNew: string[] = [];

  for (const tag of allSelected) {
    if (whitelist.includes(tag)) {
      whitelistedSelected.push(tag);
    } else {
      movedToNew.push(tag);
      applied = true;
    }
  }

  // ── Combine existing new suggestions with moved non-whitelisted tags ──
  const combinedNew = [...allNew, ...movedToNew];

  return {
    selectedTags: whitelistedSelected,
    newTagSuggestions: combinedNew,
    tagNormalizationApplied: applied,
  };
}
