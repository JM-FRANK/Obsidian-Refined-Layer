# Obsidian Refined Layer Test Vault

Use this vault to manually verify the plugin.

## Suggested Order

1. Open `10_Raw/valid-raw-note.md`.
2. Run `Refine current note`.
3. In the review modal, test partial selection, `Apply selected changes`, and `Save as Draft`.
4. Reopen `10_Raw/valid-raw-note.md` and run `Reopen last proposal for current note`.
5. Open the invalid examples below and verify the rejection messages.

## Test Notes

- `10_Raw/valid-raw-note.md`
- `10_Raw/invalid-missing-frontmatter.md`
- `10_Raw/invalid-status-not-raw.md`
- `10_Raw/invalid-missing-original-content.md`

## Draft Output

Drafts are written to `80_Runtime/refine-drafts/`.
