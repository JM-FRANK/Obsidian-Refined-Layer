# Daily Process Review Rubric

Use this rubric to review project progress from D1/Day1 through final acceptance.

The review should be based on recognizable chronological markers such as:

- D1, D2, D3
- Day1, Day 2, Day 3
- Dates such as 2026-05-06
- Markdown headings that imply chronological progress
- Ordered sections in daily plan or dev-log

Do not require perfect formatting. If the chronology is understandable, review it. If it is ambiguous enough to affect confidence, record a process risk or missing-evidence issue.

---

## 1. Identify the Timeline

Build a timeline from:

- Daily plan
- dev-log
- agent-troubleshooting-log
- Acceptance notes
- Code/test evidence when needed

Record:

- Recognized days/dates
- Missing days/dates
- Ambiguous sequence
- Any assumptions used

---

## 2. Compare Plan vs. Actual Progress

For each recognizable day/date:

- What was planned?
- What was actually logged?
- Was the planned work completed?
- Was the outcome supported by evidence?
- Was any scope change explained?
- Were blockers documented?

Classify each day/date as:

- Complete with evidence
- Complete with weak evidence
- Partially complete
- Inconsistent
- Missing evidence
- Not applicable

---

## 3. Detect Unsupported Completion Claims

Record an issue when the project claims completion but lacks supporting evidence.

Evidence may include:

- dev-log entry
- Test result
- Build result
- Code implementation
- Acceptance checklist
- Screenshot or demo evidence
- Troubleshooting resolution

Severity guidance:

- Blocker: Unsupported claim concerns core functionality required for acceptance.
- High: Unsupported claim concerns an important feature or risk area.
- Medium: Unsupported claim concerns secondary behavior or test coverage.
- Low: Unsupported claim concerns minor documentation or cleanup.

---

## 4. Detect Plan Drift and Scope Changes

Plan changes are acceptable when documented.

Record a risk when:

- Planned work disappears without explanation.
- Major unplanned work appears without rationale.
- Implementation direction changes but the logs do not explain why.
- Scope is reduced but acceptance criteria are not updated.
- Troubleshooting forced a workaround that is not documented in the plan or dev-log.

---

## 5. Link Troubleshooting to Daily Progress

When troubleshooting logs exist, connect them to the timeline.

Check:

- Which day/date did the issue occur?
- Was the root cause identified?
- Was the issue resolved?
- Did the fix create follow-up work?
- Did repeated failures indicate an unresolved design or implementation risk?

Record unresolved or repeated agent failures as Agent Issue, Bug, Risk, or Missing Evidence depending on impact.

---

## 6. Process Review Result Categories

Use these categories in the daily process table.

### Complete with evidence

The plan item is logged as complete and supported by code, tests, or acceptance evidence.

### Complete with weak evidence

The log says the item is complete, and the claim is plausible, but evidence is limited.

### Partially complete

Some planned work is complete, but important parts are missing or deferred.

### Inconsistent

Plan, dev-log, troubleshooting log, and implementation contradict each other.

### Missing evidence

The work may exist, but the review cannot verify it from available evidence.

### Not applicable

The day/date or item is not relevant to final acceptance.

---

## 7. Practical Delivery Guidance

Do not over-penalize imperfect daily logs when code, tests, and acceptance evidence are strong. However, record evidence gaps when they materially reduce confidence in delivery, explainability, or maintainability.
