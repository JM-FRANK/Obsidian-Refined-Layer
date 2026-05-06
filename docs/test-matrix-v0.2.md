# v0.2.0 Test Matrix

## Automated

| Area | Coverage | Command / Test |
| --- | --- | --- |
| A/B block parsing | heading levels, protect H1, B block boundaries | `tests/core/markdown/BlockExtractor.test.ts`, `tests/core/profile/BlockConfigValidator.test.ts` |
| Prompt building | structured v2 prompts, schema instruction, debug snapshot | `tests/core/prompt/PromptBuilder.test.ts` |
| Zod schema | RawRefinedProposalV2 blocks, tags, frontmatter, strict unknown fields | `tests/core/proposal/ProposalSchema.test.ts`, `tests/core/proposal/ProposalValidator.test.ts` |
| Tag normalization | split, trim, add `#`, dedupe, preserve case, move unknown selectedTags | `tests/core/proposal/TagNormalizer.test.ts`, `tests/core/proposal/ProposalNormalizer.test.ts` |
| Retry and cache separation | attempt 1 success, attempt 2/3 success, exhausted failure | `tests/application/CreateProposalUseCase.retry.test.ts` |
| session-cache v2 | persistence, limit, legacy v1 ignored, secret scan | `tests/adapters/obsidian/ObsidianSessionCacheV2Store.test.ts` |
| error-session-cache | failed attempt persistence, limit, redaction, secret scan | `tests/adapters/obsidian/ObsidianErrorSessionCacheStore.test.ts` |
| Review ViewModel | A block mapping, selectedTags unchecked, newTagSuggestions read-only data | `tests/ui/review/ReviewViewModel.test.ts` |
| ApplyPlan v2 | replace-refined-blocks, append-tags, no remove-tags, no newTagSuggestions write | `tests/application/BuildApplyPlanUseCase.test.ts` |
| Safe apply v2 | freshness, B block hash, append-only YAML tags | `tests/application/ApplyDecisionUseCase.test.ts` |
| Draft export | v2 draft content, cached session draft, redaction | `tests/application/SaveDraftUseCase.test.ts` |
| Cached sessions | list/open cache records, Apply disabled through UI options | `tests/application/OpenCachedSessionUseCase.test.ts`, `tests/application/V2MockHappyPath.test.ts` |
| Model connection test | mock success, SecretStorage unavailable, missing Key ID, polluted Key ID, redacted provider failure | `tests/application/TestModelConnectionUseCase.test.ts` |
| SecretStorage diagnostics | configured Key ID readability and redacted diagnostics | `tests/adapters/obsidian/ObsidianSecretStore.test.ts` |
| Prompt observation | in-memory latest snapshot, recursive redaction | `tests/runtime/PromptObservationStore.test.ts` |
| v0.2 mock E2E | raw note -> proposal -> review decision -> ApplyPlan -> safe apply -> draft/cache | `tests/application/V2MockHappyPath.test.ts` |

Full automated verification:

```bash
npm run typecheck
npm test
npm run build
```

## Manual

| Scenario | Status | Notes |
| --- | --- | --- |
| Mock provider happy path in Obsidian | Covered by automated E2E; manual smoke recommended | Run `Refine current note` on a note with configured B block. |
| DeepSeek/OpenAI-compatible connection test | Not run in current Codex workspace | Requires real Obsidian SecretStorage and API key. |
| Real provider proposal success | Not run in current Codex workspace | Run once in real vault before release if credentials are available. |
| Malformed JSON / Zod failure from provider | Automated with fake providers | Real provider/manual fault injection optional. |
| Cache record viewer | Covered by command wiring and use-case tests; manual smoke recommended | Cached session Apply must remain disabled. |

## Release Checks

- `ApplyOperation` must not include rename, move, archive, delete, or remove-tags.
- `newTagSuggestions` must never be written to YAML tags.
- `error-session-cache` must not contain API key, Authorization header, bearer token, or provider secret.
- Cached sessions must be review/draft only.
- Prompt observation must remain opt-in and in-memory for successful requests by default.
