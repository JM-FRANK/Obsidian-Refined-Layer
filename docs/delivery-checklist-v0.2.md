# v0.2.0 Delivery Checklist

Date: 2026-05-06

## Status

v0.2.0 implementation is ready for code delivery with one explicit manual-validation gap: a real DeepSeek/OpenAI-compatible provider proposal was not run in this Codex workspace because no real Obsidian SecretStorage/API key environment is available here.

## Completed

- [x] Configurable A/B block parsing and validation.
- [x] Protect H1 behavior enforced by core validation/parsing/apply paths.
- [x] PromptBuilder v2 with structured request and debug snapshot.
- [x] RawRefinedProposalV2 Zod schema with strict unknown-field rejection.
- [x] Tag normalization: split, trim, add `#`, dedupe, preserve case.
- [x] Unknown selectedTags move to newTagSuggestions without discarding valid body blocks.
- [x] Retry max 3 attempts.
- [x] Successful sessions saved to session-cache v2.
- [x] Failed attempts saved to separate error-session-cache.
- [x] Successful attempts are not saved to error-session-cache.
- [x] Review UI supports v2 A blocks, selectedTags, newTagSuggestions, validation warnings, token usage.
- [x] cached session viewer is review/draft only; Apply is disabled.
- [x] BuildApplyPlanUseCase v2 emits replace-refined-blocks / update-frontmatter / append-tags.
- [x] ApplyDecisionUseCase v2 re-reads current note, checks freshness, preserves B block byte-for-byte, appends tags only.
- [x] SaveDraftUseCase v2 exports independent redacted drafts.
- [x] Settings UI includes cache records, Key ID, SecretStorage diagnostics, A/B config, tag whitelist/prompt, model connection test, prompt observation.
- [x] README and v0.2 test matrix updated.

## Scope Freeze

Confirmed by source search and ApplyPlan inspection:

- [x] No v0.2 batch refine.
- [x] No external review channel.
- [x] No MCP / HTTP / File Inbox workflow integration.
- [x] No MOC/link write path in v0.2 apply.
- [x] No rename/move/archive/delete operations.
- [x] No `remove-tags` operation.

Compatibility note: v0.1 types still contain `replace-refined-body` and `update-tags` for legacy tests/session migration. The v2 apply path rejects v0.1-only operations and uses `append-tags` for tags.

## Security Checks

- [x] session-cache v2 uses recursive string redaction before persistence.
- [x] error-session-cache uses recursive string redaction before persistence.
- [x] session-cache and error-session-cache block serialized secret-shaped keys.
- [x] provider errors go through redaction.
- [x] draft exports are redacted.
- [x] prompt observation is in-memory and redacted.
- [x] D35 polluted Key ID defense remains covered.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Expected test-suite stderr: `ProposalSessionStore` persistence failure tests print `disk full`; this is intentional and does not indicate failure.

## Manual Validation Gap

Not run in this workspace:

- Real DeepSeek/OpenAI-compatible connection in an actual Obsidian vault.
- One real provider successful proposal generation.

Recommended release smoke in real Obsidian:

1. Configure provider model and Key ID.
2. Save real API key through SecretStorage.
3. Run **Test model connection**.
4. Run **Refine current note** on a valid note with one B block.
5. Confirm Review UI opens, Apply preserves B block, selectedTags append only, and caches contain no secrets.
