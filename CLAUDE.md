# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Obsidian Refined Layer — an Obsidian plugin (v0.1.0) implementing a review-first workflow: open raw Markdown note → LLM generates refined proposal → user reviews and confirms changes → only confirmed changes are applied.

Single built-in profile: `raw-refined`. The plugin is a review tool, not an autonomous agent.

## Commands

```bash
npm run build          # Production build (esbuild, output: main.js)
npm run dev            # Dev build with watch mode (esbuild context.watch)
npm run typecheck      # TypeScript strict-mode type checking (tsc --noEmit)
npm test               # Run all tests (vitest run)
npm run test:watch     # Run tests in watch mode (vitest)
```

There is no ESLint/Prettier — code quality relies on `tsc --noEmit` (strict mode). To install: `npm install`.

## Architecture: Clean Architecture / Ports-and-Adapters

Dependency direction is enforced — violations will break the design:

```
UI → Application → Core
Adapters → Application/Core ports
Runtime → Application/Core ports
```

**Core** (`src/core/`) must never import Obsidian API, UI components, concrete LLM providers, settings persistence, or transport adapters. Pure business logic only: types, validators, extractors, planners, and the single `WorkflowProfile`.

**Application** (`src/application/`) contains use case classes wired through port interfaces. Each use case has constructor-injected dependencies and an `execute()` method returning a discriminated union.

**Adapters** (`src/adapters/`) implement port interfaces to bridge Obsidian APIs, LLM providers, and file storage. This is the only layer allowed to import `obsidian`.

**Runtime** (`src/runtime/`) manages `ProposalSession` lifecycle, in-memory store with persistence, and token usage reporting.

**UI** (`src/ui/`) is Obsidian-specific — Modals, SettingsTab, i18n dictionaries. UI consumes ViewModels and returns decisions; it must not perform policy validation or file writes.

**`src/main.ts`** is the composition root: loads settings, creates stores, wires dependencies via manual constructor injection, and registers Obsidian commands. It must not contain workflow rules.

## Key patterns (cross-file understanding)

**Discriminated union results.** Every operation that can fail returns a tagged union with a `kind` field — never throws. Pattern: `{ kind: "success"; data } | { kind: "error-code"; message }`. Used in all use cases, validators, and extractors.

**4-layer proposal validation.** `ProposalValidator` applies: (1) JSON parsing including fenced-code-block extraction, (2) schema validation, (3) profile policy validation (allowed YAML fields, tags, capabilities), (4) content boundary validation (protected region leakage). If any layer fails, no `ProposalSession` is created and no review UI is shown. LLM output is never trusted.

**Protected region.** The `## 原始内容` heading through end-of-file is protected. During apply, the protected region is re-extracted from the current file (never from the LLM response), hash-verified byte-for-byte, then re-attached by `BodyAssembler` to form the new body.

**Freshness check.** Before applying, `ApplyDecisionUseCase` re-reads the file and compares hashes of both the full content and the protected region against hashes stored in the session. Mismatch triggers conflict flow (Save as Draft, Regenerate, Manual copy, or Discard).

**Profile authority.** `WorkflowProfile` is the single source of truth for all workflow rules (eligibility, frontmatter policy, tag policy, protected regions, prompt templates, apply capabilities). External tools, LLM output, or UI state must not override profile policy. `PolicyGuard` enforces this at the port boundary.

**Secret security.** API keys go through Obsidian `SecretStorage` (encrypted), never `data.json`. Settings store only a secret reference (`/^[a-z0-9-]+$/`). If SecretStorage is unavailable, plugin-llm is blocked and only mock-llm works. `redaction.ts` strips keys/tokens/Authorization headers from logs and errors. `ObsidianSessionStore` scans serialized data for secret-like keys before writing.

**i18n.** Two flat dictionaries: `src/ui/i18n/zh-CN.ts` and `src/ui/i18n/en.ts`. The `t(language, key, variables)` function replaces `{varName}` tokens. Language is stored in `PluginSettings.language`.

**Manual DI.** No framework — `src/main.ts` constructs all dependencies and passes them through constructors. Each `Dn` task wires only what it needs.

## Scope boundaries (v0.1.0)

In scope: single-note raw→refined with body, frontmatter, and tag apply. One profile (`raw-refined`). Partial apply allowed.

Out of scope: batch refine, MOC writing, link/rename/move operations, multi-profile editor, prompt editor with advanced features, tokenizer selection UI, price estimation, MCP/HTTP servers, File Inbox.

## Agent protocol

`AGENTS.md` contains the detailed development protocol: windowed retrieval discipline, daily execution protocol (`Dn` tasks), dev-log format, Phase acceptance checklists, and completion standards. Read it before starting any implementation task. Source-of-truth documents are in `docs/` — load only the relevant sections for the current task, not the entire documents.
