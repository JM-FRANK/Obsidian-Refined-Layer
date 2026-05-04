@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run build        # Production build → main.js + styles.css
npm run dev          # Watch mode build with sourcemaps
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm test             # Run all vitest tests
npx vitest path/to/test.test.ts   # Run a single test file
```

The build bundles `src/main.ts` via esbuild into `main.js` (CommonJS, ES2018 target). Obsidian API (`obsidian`, `electron`, `@codemirror/*`) are externalized.

## Architecture

This is an Obsidian plugin following **Clean Architecture** with strict dependency direction:

```
UI → Application → Core
Adapters → Application/Core ports
Application → Runtime ports/types
Adapters → Application/Core ports
UI → Application → Core
```

### Layer responsibilities

| Layer | Directory | Must NOT contain |
|-------|-----------|-----------------|
| **Core** | `src/core/{profile,proposal,policy,apply,protected-region,review}` | Obsidian API, UI, concrete LLM providers, persistence |
| **Application** | `src/application/` | Obsidian API, UI rendering, file I/O (uses ports) |
| **Adapters** | `src/adapters/{obsidian,llm}` | Core business rules |
| **UI** | `src/ui/{review,settings,i18n}` | Validation, normalization, ApplyPlan generation, file writes |
| **Runtime** | `src/runtime/` | Core business rules |
| **Settings** | `src/settings/` | — (plain config types) |

`src/main.ts` is the **composition root only**: commands, DI wiring, lifecycle. It must not contain workflow logic, parsing, prompts, or apply rules.

### Flow

```
Active note → eligibility check → A/B block parsing → structured prompt → LLM → JSON extraction
→ Zod validation → normalization → policy validation → ProposalSession → Review UI → UserDecision
→ BuildApplyPlanUseCase → ApplyDecisionUseCase (freshness check → safe write or draft)
```

### Key invariants

- **LLM output is untrusted** — never writes files directly. All writes go through `ApplyPlan`.
- **Apply re-reads** the current file and runs freshness checks before writing.
- **Protected B block** content is extracted from the current file, never trusted from proposal/session/cache.
- **Secrets** (API keys) use Obsidian SecretStorage and must never enter `data.json`, logs, sessions, drafts, prompts, or error diagnostics.
- **UI is passive** — consumes `ReviewViewModel`, returns `UserDecision`, no business logic.
`ProposalValidator` / Zod validation handle proposal validation. `PolicyGuard` guards request-level policy boundaries and must not let requests override profile rules.

## Version scope

- **v0.1.0** (delivered): Fixed `raw-refined` single-note workflow with hardcoded sections.
- **v0.2.0** (current, starting D36): Configurable A/B blocks, Zod schema, tag normalization, retry (max 3), separate session-cache / error-session-cache, prompt observability.Successful ProposalSession records go to session-cache and must be directly recoverable by Review UI. Failed attempts go to error-session-cache as FailedAttemptRecord; they preserve redacted request/response/zod errors for debugging and are not directly recoverable as review sessions. If attempts 1-2 fail and attempt 3 succeeds, attempts 1-2 go to error-session-cache and the successful session goes to session-cache.

Tags in v0.2.0:
- `selectedTags` are whitelist tags shown as checkboxes in Review UI.
- Applying selected tags appends to YAML `tags`; never overwrite or remove existing tags.
- `newTagSuggestions` are displayed and copyable, but not editable and not directly applicable.
- Core normalizes tag delimiters and missing `#`, records only `tagNormalizationApplied: boolean`, and does not lowercase tags.
- v0.2.0 does not implement tag remove.

`AGENTS.md` is the authoritative specification for v0.2.0. Follow its phase plan, scope rules, and execution protocol.

## Development log protocol

Active dev log: `docs/dev-log.md` (read only latest 3 `## Dn` entries by default).
Archive: `docs/achieve/dev-log-achieve.md` (D1-D35, search by exact reference).

Every completed Dn must update `docs/dev-log.md` with a self-contained `Active summary` block (Date, Scope, Reason, Change, Verification, Next). Do not continue into the next Dn without explicit instruction.
