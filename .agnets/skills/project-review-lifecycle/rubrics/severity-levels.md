# Severity Levels Rubric

Use these levels for all issues, bugs, risks, test gaps, documentation mismatches, and acceptance gaps.

---

## Blocker

A Blocker prevents acceptance.

Use Blocker when an issue:

- Makes core functionality unavailable or incorrect.
- Causes build, test, or runtime failure that invalidates acceptance confidence.
- Creates severe security, data-loss, privacy, or production-safety risk.
- Prevents the project from being used for its stated purpose.
- Shows that a required deliverable is absent.
- Makes the final acceptance decision impossible unless fixed.

Examples:

- Application cannot start.
- Required API endpoint or core workflow is missing.
- Tests reveal a core regression.
- Hardcoded production secret is committed.
- Data-destructive behavior is present in normal use.

---

## High

High severity indicates a major risk that may not completely block acceptance but requires project-owner attention.

Use High when an issue:

- Impacts an important feature or primary user path.
- Creates a serious maintainability, reliability, security, or compatibility risk.
- Has a workaround, but the workaround is fragile or undocumented.
- Indicates significant mismatch between plan, logs, and implementation.
- Shows repeated unresolved agent troubleshooting around an important area.

Examples:

- Error handling missing around a major external dependency.
- Important test suite fails, but manual evidence partially supports functionality.
- Major plan item is implemented differently without explanation.
- Critical edge case is not handled.

---

## Medium

Medium severity indicates a meaningful but non-blocking issue.

Use Medium when an issue:

- Affects a secondary path, edge case, or localized behavior.
- Reduces maintainability or clarity enough to create future cost.
- Reveals incomplete test coverage for important but non-core behavior.
- Creates moderate documentation/process mismatch.
- Should be fixed, but does not prevent delivery.

Examples:

- Missing tests for validation errors.
- Some dev-log entries are incomplete.
- Duplicate logic exists in a limited area.
- A non-core command fails while core test/build commands pass.

---

## Low

Low severity indicates a minor issue that should be tracked but does not materially affect acceptance.

Use Low when an issue:

- Is cosmetic or minor.
- Improves readability but does not affect behavior.
- Concerns small documentation drift.
- Concerns naming, comments, or cleanup.
- Has minimal delivery impact.

Examples:

- Minor typo in a log.
- Non-critical comment is stale.
- Small naming inconsistency.
- Low-risk cleanup item.

---

## Escalation Guidance

Escalate severity when:

- The issue affects core functionality.
- The issue affects security, privacy, data integrity, or production safety.
- The issue is repeated across multiple modules.
- The issue contradicts acceptance claims.
- The issue is associated with failed tests or unresolved troubleshooting.

De-escalate severity when:

- The issue is isolated.
- There is strong evidence of working behavior.
- The issue is cosmetic or process-only.
- A documented workaround exists and is acceptable for delivery.
