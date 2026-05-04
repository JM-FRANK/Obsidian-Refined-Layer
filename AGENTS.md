# AGENTS.md

## Project

This repository implements **Obsidian Refined Layer**, an Obsidian plugin for turning the currently opened raw Markdown note into a refined proposal, showing it to the user for review, and applying only the explicitly confirmed changes.

The plugin is a **review-first Obsidian tool layer**, not an Agent.

It must not implement global memory, search, tool routing, autonomous planning, MOC writing, relationship-link writing, batch vault maintenance, or external tool adapters in v0.1.0.

## Source documents

Use these project documents as the implementation source of truth:

```text
docs/Obsidian Refined Layer 插件架构书 v0.1.0 Codex执行版.md
docs/Obsidian Refined Layer 插件开发日计划 v0.1.0.md
docs/fix-feature-tasks.md
docs/dev-log.md
```

If the repository stores these files elsewhere, locate them by filename. Do not duplicate or fork them without instruction.

## Context-window discipline

This project must be developed with **windowed retrieval**. Do not repeatedly load the entire architecture document or the entire day plan when only one task window is needed.

Before starting a task:

1. Read this `AGENTS.md`.
2. Read only the current `Dn` block in the day plan.
3. Read the enclosing Phase overview and that Phase's acceptance checklist.
4. Read only the relevant architecture sections needed for the current `Dn`.
5. Read the latest `Current status` and the most recent relevant `Active summary` from `docs/dev-log.md`.

After a Phase is completed, do not reread that completed Phase unless debugging a regression or checking a decision already recorded there.

Prefer targeted searches and bounded reads, for example:

```bash
rg -n "^## D7|^# Phase 3|^## Phase 3 验收" docs/Obsidian\ Refined\ Layer\ 插件开发日计划\ v0.1.0.md
sed -n '120,220p' docs/Obsidian\ Refined\ Layer\ 插件开发日计划\ v0.1.0.md
rg -n "ApplyPlan|ProtectedRegion|PolicyGuard" docs/Obsidian\ Refined\ Layer\ 插件架构书\ v0.1.0\ Codex执行版.md
```

Avoid broad commands like `cat` over the full day plan or full architecture document unless the user explicitly asks for a full-document review.

## Test directory

Keep automated tests under `tests/`.
Use file names like `*.test.ts`.
Prefer mirroring the `src/` area being validated; do not create ad hoc test roots.

## v0.1.0 scope

Implement only the single-note `raw-refined` MVP:

```text
current active Markdown note
→ check raw-refined eligibility
→ generate JSON proposal using mock-llm or plugin-llm
→ validate proposal
→ create ProposalSession
→ show Obsidian review UI
→ collect UserDecision
→ build ApplyPlan
→ freshness check
→ safe write or Save as Draft
```

v0.1.0 implements only one built-in workflow profile:

```text
raw-refined
```

## Explicitly out of scope for v0.1.0

Do not implement the following unless the user explicitly revises the plan:

```text
multi-profile editor
profile visual configuration UI
external Tool API adapter
MCP server
HTTP server
File Inbox adapter
external proposal import
external review channel
batch refine
MOC write
relationship-link write
rename apply
move apply
move suggestion
automatic archive or delete
tokenizer selection UI
price estimate
full prompt editor
full workflow platform
```

## Architecture rules

### Dependency direction

Follow this direction:

```text
UI → Application → Core
Adapters → Application/Core ports
Runtime → Application/Core ports
```

Core modules must not import:

```text
Obsidian API
UI components
concrete LLM providers
settings persistence
transport adapters
```

`main.ts` should register commands and wire dependencies only. It must not contain workflow rules.

### Suggested module boundaries

Keep implementation close to this structure:

```text
src/
  core/
    profile/
    policy/
    proposal/
    apply/
    protected-region/
  application/
  adapters/
    obsidian/
    llm/
  runtime/
  ui/
    review/
    settings/
    i18n/
  settings/
```

`PluginSettings.ts` may define settings types, but Obsidian-specific persistence belongs in:

```text
src/adapters/obsidian/ObsidianSettingsStore.ts
```

## Profile authority

The `WorkflowProfile` is the only source of workflow rules.

External tools, LLM output, UI state, prompt text, and one-off requests must not override profile policy.

All requests entering the internal tool port must pass through `PolicyGuard`.

`PolicyGuard` must read rules from the active profile and reject or ignore any request field that attempts to override:

```text
YAML/frontmatter whitelist
tag whitelist
output section structure
protected regions
review policy
apply capabilities
link/MOC permissions
rename/move permissions
```

## raw-refined profile constraints

The default `raw-refined` profile must enforce:

```text
Markdown file only
frontmatter required
status must be raw
required protected heading: ## 原始内容
```

Protected region behavior:

```text
## 原始内容 is protected.
The protected region must be extracted from the current file during apply.
Do not trust any protected-region text returned by the LLM.
```

YAML/frontmatter rules:

```text
created is readonly.
status/source/context are confirm-required.
Unknown fields are preserve-only and not modifiable.
No YAML field may be added unless declared in the profile.
```

Tag rules:

```text
Tags use allow-list mode.
A proposal must not add tags outside allowedTags.
Unspecified tags are forbidden even if they are not explicitly blocked.
#rel/* is not allowed in raw-refined.
```

Apply capabilities for v0.1.0:

```text
body: true
frontmatter: true
tags: true
rename: false
move: false
links: false
moc: false
archive/delete: false
```

Partial apply should be allowed: the user may apply only part of a proposal.

## LLM and proposal validation

LLM output is untrusted.

Do not let LLM output directly replace a note.

Proposal validation must be layered:

```text
1. JSON parsing
2. Schema validation
3. Profile policy validation
4. Content boundary validation
```

If parsing or validation fails:

```text
Do not create a ProposalSession.
Do not show the review UI as if the proposal were valid.
Show a clear error.
Record only a redacted failure summary if needed.
```

The validator must reject:

```text
unknown YAML modifications
blocked or unlisted tags
missing required refined sections
relationship-link operations
MOC operations
rename/move apply operations
protected-region leakage or attempted modification
```

## ApplyPlan and safe write

All writes must go through `ApplyPlan`.

`replace-refined-body` must follow this logic:

```text
1. Re-read the current file.
2. Extract the protected region from the current file.
3. Build new body = refined content + current protected region.
4. Verify byte-for-byte that the protected region in the new body matches the current file's protected region.
5. Write only through the approved ApplyPlan operation.
```

Apply must run a freshness check before writing.

If the target file changed after proposal generation:

```text
Do not apply automatically.
Enter conflict flow.
Offer Save as Draft, regenerate, manual copy review, or discard.
```

## Secret management

API keys and provider secrets require strict privacy protection.

Never store or write these in plugin data, logs, dev logs, proposal history, draft exports, errors, or Obsidian notes:

```text
API key
token
Authorization header
Bearer token
provider secret
raw secret value
```

Use Obsidian SecretStorage / SecretComponent when available.

Settings may store only a secret reference, never the secret value.

If secure secret storage is unavailable:

```text
Disable plugin-llm provider configuration.
Show a warning in SettingsTab.
Allow Refine current note to run only with mock-llm.
Block all attempts to save an API key.
Ensure data.json contains no key/apiKey/token/secret/authorization fields.
```

All errors and debug output must be redacted.

## Token usage

Every successful proposal generation must produce a `TokenUsageReport` or explicitly mark token usage as unavailable.

Use this strategy:

```text
provider usage returned → actual
provider usage unavailable → mature tokenizer estimate
estimator unavailable → unavailable
```

Do not implement tokenizer selection UI in v0.1.0.

Do not implement price/cost estimation in v0.1.0.

The review UI should display token usage or `unavailable`.

## ProposalSession and draft files

`ProposalSession` is internal runtime state.

It is not the same as a user-visible draft file saved to the vault.

ProposalSessionStore must:

```text
store notePath
support querying latest session by notePath
support listing sessions by notePath
respect historyLimit, default 5
auto-save unapplied proposal sessions
not store secrets or unredacted provider errors
```

`Save as Draft` creates a user-visible Markdown draft file. It must not alter the source note.

## UI rules

The review UI must consume `ReviewViewModel` and return `UserDecision`.

The UI must not:

```text
perform policy validation
assemble protected regions
generate ApplyPlan
write files
hardcode workflow rules
```

`requestReview` must call `ReviewGate`. v0.1.0 may implement `ObsidianReviewGate` using Modal, but the internal tool port must not be directly coupled to Modal.

UI text must use i18n keys. Prepare at least:

```text
zh-CN
en
```

Use Obsidian CSS variables and native UI patterns. Do not hardcode primary colors.

## Prompt override

Prompt templates belong to the active `WorkflowProfile`.

Global settings may store only a profile-specific prompt override:

```ts
promptOverrides?: Record<string, {
  enabled: boolean;
  systemPrompt?: string;
  userPrompt?: string;
}>;
```

v0.1.0 must not implement a full prompt editor.

Allowed minimal UI:

```text
textarea for overriding the current profile prompt
static list of available variables
clear label showing which profile is being overridden
```

Do not implement syntax highlighting, autocomplete, advanced validation, prompt marketplace, or profile editor.

## Development log

All development progress must be recorded in:

```text
docs/dev-log.md
```

Do not scatter day logs across separate files unless the user explicitly requests it.

Every completed `Dn` must append or update a log entry with exactly these sections:

```md
## Dn 开发日志

### Current status

### Active summary
- Date:
- Scope:
- Reason:
- Change:
- Verification:
- Next:
```

`Current status` should describe the repository state after the task.

`Active summary` should be short and task-scoped:

```text
Date: actual date
Scope: current Dn / files touched
Reason: why this work was done
Change: what changed
Verification: what was run or checked
Next: next concrete task or known blocker
```

Before starting a new `Dn`, read the latest `Current status` and most recent relevant `Active summary` from `docs/dev-log.md` instead of rereading old completed day-plan blocks.

## Daily execution protocol

When working on a `Dn`:

1. Identify the current `Dn` from the user's request or `docs/dev-log.md`.
2. Read only the relevant `Dn` and enclosing Phase acceptance checklist.
3. Read only relevant architecture sections.
4. Implement only the day's scope.
5. Build or run the smallest available verification.
6. Update `docs/dev-log.md`.
7. Stop and report what changed, what was verified, and what remains.

Do not continue into the next `Dn` unless the user explicitly asks.

## Completion standard

A `Dn` is complete only when:

```text
code builds or has no obvious TypeScript errors introduced
the day's behavior has a minimal verification path
no out-of-scope long-term feature was implemented
docs/dev-log.md contains the day's entry
Next is clear
```

A Phase is complete only when:

```text
all Dn tasks in the Phase are complete
Phase acceptance checklist is satisfied
relevant dev-log entries exist
no future-scope adapter or platform feature leaked into implementation
```
