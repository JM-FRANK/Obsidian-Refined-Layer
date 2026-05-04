# AGENTS.md

## 1. Project

**Obsidian Refined Layer** is a review-first Obsidian plugin. It turns the current raw Markdown note into a refined proposal, shows the proposal for human review, and applies only explicitly confirmed changes.

It is **not** an autonomous Agent and must not become a general workflow platform in v0.2.0.

v0.2.0 upgrades the v0.1.0 fixed-section `raw-refined` flow into a configurable single-note workflow:

```text
raw note → configurable A/B blocks → structured prompt → LLM → JSON → Zod → normalization → review → ApplyPlan → safe write / draft
```

## 2. Source documents

Use these as the source of truth:

```text
docs/obsidian-refined-layer-architecture-v0.2.0-agent.md
docs/obsidian-refined-layer-v0.2.0-daily-plan.md
docs/dev-log.md                  # active v0.2.0 log
docs/achieve/dev-log-achieve.md  # archived D1-D35 log
```

If paths differ, locate by filename. Do not duplicate, fork, or rewrite source docs unless asked.

## 3. Sliding-window retrieval

Always use the smallest useful context window.

Before each task, read only:

```text
1. AGENTS.md
2. current Dn block
3. current Phase overview + acceptance checklist
4. architecture sections directly needed by this Dn
5. latest 3 Dn entries from docs/dev-log.md
```

Do **not** read full architecture, full day plan, or full dev-log by default.

### Dev-log rule

`docs/dev-log.md` is a sliding tail. Read only latest three entries unless an exact older item is needed.

Example:

```bash
python - <<'PY'
from pathlib import Path
text = Path('docs/dev-log.md').read_text(encoding='utf-8')
parts = text.split('\n## D')
entries = ['## D' + p for p in parts[1:]]
print('\n'.join(entries[-3:]))
PY
```

Search older context directly:

```bash
rg -n "^## D35|Bearer test|SecretStorage" docs/achieve/dev-log-achieve.md
rg -n "^## D42|tagNormalizationApplied|Zod" docs/dev-log.md
```

Never `cat docs/dev-log.md` or `cat docs/achieve/dev-log-achieve.md` unless the user requests a full-log audit.

### Phase rule

Within a Phase, keep only:

```text
current Phase overview
current Dn
Phase acceptance checklist
latest 3 dev-log entries
```

After completing a Dn, slide forward. After completing a Phase, drop that Phase from active context. Do not reread completed phases unless debugging a regression.

### Architecture/day-plan retrieval

Use targeted search:

```bash
rg -n "^## D43|^# Phase 11|^## Phase 11 验收" docs/obsidian-refined-layer-v0.2.0-daily-plan.md
rg -n "PromptBuilder|Zod|tagNormalizationApplied|ProposalNormalizer" docs/obsidian-refined-layer-architecture-v0.2.0-agent.md
```

Only read full documents for full-document review, cross-phase inconsistency analysis, or explicit full-scope verification.

## 4. Current execution status

v0.1.0 is delivered and archived. v0.2.0 starts from **D36**.

Current phases:

```text
Phase 9   migration baseline and type skeleton
Phase 10  Markdown heading and A/B block parsing
Phase 11  PromptBuilder, Zod schema, tag normalization
Phase 12  retry, session-cache, error-session-cache
Phase 13  Review UI and cached-session recovery
Phase 14  Settings UI and observability
Phase 15  end-to-end migration, test matrix, delivery check
```

Do not continue into the next Dn unless the user explicitly asks.

## 5. Scope

### In scope for v0.2.0

Single-note configurable `raw-refined` workflow:

```text
active Markdown note
→ eligibility / A-B block / protect-H1 checks
→ structured prompt from A block prompts + tag prompt
→ mock or real provider
→ JSON extraction
→ Zod validation
→ normalization and policy / partial validation
→ successful ProposalSession to session-cache
→ Review UI
→ UserDecision
→ ApplyPlan
→ freshness check
→ safe apply or Save as Draft
```

Allowed v0.2.0 additions:

```text
A/B block configuration UI
tag whitelist UI
tag prompt setting
prompt observability panel
model connection test
session-cache viewer command
error-session-cache switch and limit
copyable SecretStorage diagnostics
```

### Out of scope unless explicitly approved

```text
multi-workflow platform
multi-profile editor
general workflow visual editor
external Tool API adapter / MCP / HTTP / File Inbox
external proposal import / external review channel
batch refine
MOC write / relationship-link write
rename / move / archive / delete
tag remove
tag case normalization
tokenizer selection UI
price estimate
prompt marketplace
complex prompt syntax highlighting or autocomplete
```

## 6. Architecture invariants

### Dependency direction

```text
UI → Application → Core
Adapters → Application/Core ports
Runtime → Application/Core ports
```

Core must not import:

```text
Obsidian API, UI components, concrete LLM providers, settings persistence, transport adapters
```

`main.ts` is composition root only: commands, dependency wiring, lifecycle. It must not contain workflow, block parsing, prompt, tag, apply, or UI decision rules.

Suggested module areas:

```text
src/core/{profile,block,markdown,prompt,proposal,policy,apply,tag,validation}
src/application/
src/adapters/{obsidian,llm}/
src/runtime/{session-cache,error-session-cache}/
src/ui/{review,settings,i18n}/
src/settings/
```

Obsidian persistence belongs in adapters, for example:

```text
src/adapters/obsidian/ObsidianSettingsStore.ts
src/adapters/obsidian/ObsidianSessionStore.ts
src/adapters/obsidian/ObsidianErrorSessionCache.ts
```

### Non-negotiable rules

```text
LLM output is untrusted.
LLM output never writes files directly.
All writes go through ApplyPlan.
Apply re-reads current file and runs freshness checks.
B block / protected content is extracted from the current file, never trusted from proposal/session/cache.
UI does not validate, normalize, extract blocks, generate ApplyPlan, or write files.
Secrets never enter data.json, logs, dev logs, sessions, drafts, attempts, diagnostics, prompts, responses, or errors.
```

## 7. A/B block model

### A blocks

A blocks are configurable refined output blocks generated/refined by LLM.

Each A block supports:

```text
id, heading text/name, heading level, prompt, order, enabled
```

Rules:

```text
count is user-configurable
flat ordered list only
no nesting
content may be reviewed and applied independently
prepare for future selected-region refine, but do not implement selected-region refine unless planned
```

### B block

B block is the single protected original-content block.

Rules:

```text
exactly one B block
configurable heading text and level
no prompt
mechanically preserved
may contain nested subheadings
nested content preserved byte-for-byte
not an LLM output target
```

Extraction:

```text
from configured B heading until next sibling-or-higher heading
```

### Protect H1

Setting name:

```text
保护一级标题
```

Enabled:

```text
first H1 is protected as note title / filename-level heading
A/B minimum heading level = 2
A/B blocks must not overwrite H1
```

Disabled:

```text
A/B minimum heading level can be 1
H1 may be part of A/B block structure
```

This is a core parsing/apply rule, not a UI-only option.

## 8. Prompt, Zod, retry, and tool boundary

PromptBuilder belongs in Core/Application, not UI.

It builds structured requests from:

```text
workflow settings
A block list and prompts
B block metadata / boundary info
tag prompt
tag whitelist
input note metadata
schema instructions
```

Observable debug snapshots must be available for:

```text
provider/model
system/user or structured prompt
tag prompt
A block prompts
allowed tags
input note metadata
raw LLM response
parsed JSON
Zod result
normalization result
policy / partial validation report
```

All snapshots must be redacted.

Pipeline:

```text
Build request → provider/future tool → raw response → JSON extraction → Zod parse → normalization → policy/partial validation → ProposalSession or failed attempt
```

Max attempts:

```text
3
```

Future tools sit **before** Zod: the plugin sends request + schema contract, receives formatted response, then locally reruns JSON extraction, Zod, normalization, policy validation, and ApplyPlan. No external tool may bypass local validation or Core/Application boundaries.

## 9. Tag model

### Whitelist

Tags are governed by a user-managed whitelist. Default includes:

```text
#ai/generated #ai/assisted #ai/reviewed #ai/suggested
#todo/refine #todo/link #todo/review
#flag/core #flag/sensitive
```

### LLM output shape

```ts
selectedTags: string[];
newTagSuggestions: string[];
tagNormalizationApplied: boolean;
```

`selectedTags`:

```text
from whitelist
shown as checkable items in Review UI
on apply, append to YAML tags
never overwrite or delete existing tags
```

`newTagSuggestions`:

```text
not in whitelist
displayed in UI
selectable/copyable
not editable in Review UI
never directly applied to YAML tags
```

If LLM puts non-whitelisted tags in `selectedTags`, silently move them to `newTagSuggestions`, record locally, and do not fail the whole proposal if body blocks are valid.

### Normalization

Core normalizes tag fields using separators:

```text
, ， space newline 、
```

Normalization:

```text
split, trim, remove empty items, add # if missing, dedupe
```

Do not normalize case. v0.2.0 records only:

```ts
tagNormalizationApplied: boolean
```

This is local-only and must not be sent back to the LLM. v0.2.0 does not implement tag remove.

## 10. Proposal validation and partial result

Distinguish fatal structural errors from recoverable field issues.

Fatal:

```text
cannot parse JSON
Zod fails after retries
missing required proposal shape
invalid block output that prevents review
```

Recoverable/partial:

```text
selectedTags includes non-whitelisted tags
tag fields required normalization
newTagSuggestions exists
field-level warnings that do not block review
```

Unknown selected tags must not discard valid body blocks. Apply remains strict: only user-checked whitelisted selectedTags may be appended; `newTagSuggestions` and `#rel/*` are never written.

## 11. Cache model

`session-cache` and `error-session-cache` are separate.

### session-cache

Stores successful `ProposalSession` records.

```text
loadable directly into Review UI
usable for Save as Draft
not a user-visible vault note
no secrets or unredacted provider errors
default limit = 5
```

### error-session-cache

Stores failed attempts for debugging.

```text
not a ProposalSession
not loadable as normal Review UI session
not applicable
preserve useful debugging data except sensitive information
default enabled = true
default limit = 30
oldest records deleted first
```

Redacted failed attempt should preserve:

```text
attempt index, provider, model, timestamp, structured request/final prompt, raw response,
JSON extraction result, Zod errors, normalization result if reached,
policy report if reached, error summary, token usage if available
```

Must never preserve secrets, Authorization, bearer token, raw secret value, or unredacted provider error.

### Attempt save rules

```text
attempt 1 success:
  success → session-cache; no error-cache; no request-count notice

attempt 1 fail, attempt 2 success:
  failed attempt 1 → error-session-cache
  success attempt 2 → session-cache
  show request-count notice + error-cache-location notice

attempt 1/2 fail, attempt 3 success:
  failed attempts 1/2 → error-session-cache
  success attempt 3 → session-cache
  show request-count notice + error-cache-location notice

all 3 fail:
  failed attempts 1/2/3 → error-session-cache
  no ProposalSession
  show failure-count notice + error-cache-location notice
```

Never store successful attempts in error-session-cache. Never store failed attempts in session-cache.

Notices must be two separate notices. If error-session-cache is disabled, the second notice must say failed sessions were not saved.

## 12. Cached session review

Add command:

```text
Open cached proposal session / 查看缓存记录
```

Behavior:

```text
open selection flow first
show up to session-cache limit records, default 5
open selected ProposalSession in the same Review UI shape
allow viewing/checking content
Apply selected changes disabled
aSave as Draft enabled
```

Cached recovery is for review and draft export only. Do not apply cached sessions in v0.2.0.

## 13. ApplyPlan and safe write

Allowed v0.2.0 operations:

```text
replace-refined-blocks
update-frontmatter
append-tags
```

Do not implement rename/move/link/MOC/archive/delete/remove-tags.

`replace-refined-blocks` must:

```text
re-read current file
extract current B block from current file
preserve B block byte-for-byte
respect protect-H1 setting
assemble A blocks from accepted proposal / edited review content
verify B block preservation before writing
write only through ApplyPlan
```

`append-tags` must:

```text
append only user-checked selectedTags
write only whitelisted tags
preserve existing tags
dedupe
never write newTagSuggestions
never remove tags
```

Freshness check is required before writing. If file changed, block apply and offer Save as Draft, Regenerate, Manual copy review, or Discard. No force apply.

## 14. Settings UI

Settings UI must include:

```text
A/B block configuration
tag whitelist management
tag prompt setting
prompt observability
model connection test
session-cache settings and viewer entry
error-session-cache toggle and limit
copyable SecretStorage diagnostics
```

### Model connection test

Must:

```text
check provider config
check SecretStorage/key readability if required
send minimal request without real note content
not create ProposalSession
not write session-cache or notes
redact errors
```

Distinguish SecretStorage unavailable, Key ID missing, key read failed, provider failed, invalid model response, and success.

### Key ID wording

User-facing label must be:

```text
Key ID / 密钥 ID
```

Do not show mixed labels such as Secret Reference, secretRef, key name, or 密钥引用. Internal code may still use `secretRef`.

Explain: Key ID is saved in plugin settings and used to read the real API key from Obsidian SecretStorage. Real API key must never be written to `data.json`.

### SecretStorage diagnostics

Diagnostics must be copyable, non-editable, and redacted.

Allowed fields:

```text
available, hasSecretStorage, getSecretType, setSecretType, reason,
configured Key ID present/absent, can read configured key yes/no,
read value equals Key ID yes/no, read value length, redacted prefix/suffix if needed
```

### Cache wording

Use:

```text
缓存记录
```

not “历史记录”. Explain cache location and that cache is not long-term history, not a user-visible note, and contains no secrets.

## 15. Secret management and redaction

Never store or write:

```text
API key, token, Authorization header, Bearer token, provider secret, raw secret value
```

Forbidden locations include plugin data, logs, dev logs, session-cache, error-session-cache, draft exports, errors, diagnostics, prompts, responses, and Obsidian notes.

Use Obsidian SecretStorage / SecretComponent when available. Settings may store only Key ID / secret reference.

If secure storage is unavailable:

```text
disable real provider API key saving
show clear warning
allow mock/local providers that do not require API key
block API-key saving attempts
ensure data.json contains no key/apiKey/token/secret/authorization fields
```

D35 defense must remain:

```text
if getSecret(keyId) returns exactly keyId, treat as configuration error
never send Authorization: Bearer <keyId>
```

All errors, diagnostics, cached attempts, provider responses, and logs must be redacted.

## 16. Token usage

Every successful proposal should produce token usage or explicitly mark it unavailable.

```text
provider usage → actual
provider unavailable → estimate
estimator unavailable → unavailable
```

No tokenizer selection UI. No price/cost estimation. Review UI shows token usage or unavailable.

## 17. UI rules

Review UI consumes `ReviewViewModel` and returns `UserDecision`.

UI must not:

```text
validate policy or Zod
normalize tags
extract B block
generate ApplyPlan
write files
hardcode workflow rules
call provider directly
write caches directly
```

UI may:

```text
display/edit planned A block proposal content
show selectedTags as checkable
show newTagSuggestions as copyable non-editable text
show tagNormalizationApplied warning
show prompt/response/validation debug snapshots
trigger model connection test through Application
return UserDecision
```

Use `ReviewGate`, i18n (`zh-CN`, `en`), Obsidian CSS variables, and native UI patterns.

## 18. Development log

Active v0.2.0 work goes to:

```text
docs/dev-log.md
```

D1-D35 archive stays in:

```text
docs/achieve/dev-log-achieve.md
```

Do not append new Dn entries to the archive unless repairing history.

Every completed Dn entry must use:

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

`Active summary` must be self-contained enough for the next task to continue with only the latest three log entries.

## 19. Daily execution protocol

For each Dn:

```text
1. Identify current Dn from user request or latest three dev-log entries.
2. Read current Dn + enclosing Phase overview/checklist.
3. Read only relevant architecture sections.
4. Read latest three active dev-log entries.
5. Search older context only by exact Dn/file/topic/error.
6. Implement only the day's scope.
7. Run minimal verification; broaden to tests/build when appropriate.
8. Update docs/dev-log.md with self-contained Active summary.
9. Stop and report changes, verification, and remaining work.
```

Do not continue into the next Dn without explicit instruction.

Completion standard:

```text
no obvious TypeScript/build breakage
minimal verification path exists
no out-of-scope platform feature added
docs/dev-log.md updated
Next is clear
```

Phase completion requires all Dn tasks, acceptance checklist, relevant logs, and no future-scope leakage.

## 20. Regression anchors

Preserve these unless v0.2.0 day plan explicitly replaces them:

```text
active note read
eligibility failure reporting
mock provider happy path
real provider redaction
SecretStorage no-secret leak rule
D35 Bearer test pollution defense
session-cache persistence
ReviewGate abstraction
ApplyPlan-only write path
freshness conflict flow
Save as Draft
protected B/original region byte-for-byte preservation
```

If v0.2.0 replaces old fixed-section behavior, migrate or delete old tests intentionally. Do not keep contradictory v0.1 fixed-section and v0.2 configurable-block requirements as active tests.
