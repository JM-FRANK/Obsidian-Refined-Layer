# Acceptance Decision Rubric

Use this rubric to assign the final project review decision. Choose exactly one outcome:

- PASS
- CONDITIONAL_PASS
- FAIL
- INCONCLUSIVE

The decision must be based on evidence gathered during the review, not on optimism or assumptions.

---

## PASS

Use `PASS` when all of the following are true:

- No Blocker issues are open.
- No unresolved High severity issue materially threatens core delivery.
- Core functionality appears complete against the available plan and logs.
- Tests, build, lint, and typecheck results are passing or have acceptable, well-explained non-blocking exceptions.
- Acceptance evidence is sufficient for a project owner to make a confident decision.
- Daily plan, dev-log, troubleshooting log, and implementation are materially consistent.
- No severe security, data-loss, deployment, or maintainability risk is present.

Minor Low severity issues may exist if they do not affect acceptance.

---

## CONDITIONAL_PASS

Use `CONDITIONAL_PASS` when the project is broadly acceptable for delivery, but follow-up is needed.

Typical conditions:

- No open Blocker issue exists.
- Core functionality is usable.
- Remaining issues are Medium or Low, or High issues have a documented workaround and do not block delivery.
- Some test or documentation gaps exist, but they do not prevent a reasonable acceptance decision.
- Some daily-process evidence is incomplete, but code/test/acceptance evidence is strong enough.
- The project owner should track follow-up items after acceptance.

Use this when delivery can proceed with clearly stated conditions.

---

## FAIL

Use `FAIL` when any of the following is true:

- One or more Blocker issues are open.
- Core functionality fails or is missing.
- Build or test failure prevents confidence in the deliverable and no acceptable explanation or workaround exists.
- There is a serious security, data integrity, compatibility, or stability issue.
- Technical implementation significantly contradicts the plan in a way that threatens delivery or maintenance.
- Agent troubleshooting history reveals unresolved repeated failures that likely affect the delivered product.
- Acceptance evidence contradicts the claimed completion state.
- The project cannot be responsibly accepted without fixes.

---

## INCONCLUSIVE

Use `INCONCLUSIVE` when the review cannot reliably determine readiness.

Typical reasons:

- Key project files are missing and cannot be inferred.
- Technical plan, daily plan, dev-log, or troubleshooting evidence is too incomplete to establish delivery history.
- Tests/build/lint cannot be run and there is no substitute evidence.
- Code structure or entry points cannot be identified with reasonable effort.
- Acceptance evidence is absent or too weak.
- Environment limitations prevent meaningful review.

Do not use `INCONCLUSIVE` merely because minor files are missing. Use it only when evidence is insufficient for a reliable project-owner decision.

---

## Practical Decision Priority

When deciding between outcomes:

1. Any open Blocker normally means `FAIL`.
2. Severe evidence insufficiency normally means `INCONCLUSIVE`.
3. Non-blocking but real delivery issues normally mean `CONDITIONAL_PASS`.
4. Only use `PASS` when the evidence supports acceptance without material reservations.
