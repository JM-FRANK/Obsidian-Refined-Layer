# Project Review Record

> Append a new `Review Run` section for each execution. Do not overwrite previous review runs unless the user explicitly asks.

---

## Review Run: {{timestamp}}

### 1. Review Scope

- Reviewer:
- Project root:
- Review objective:
- Review mode: Full lifecycle review from D1/Day1 through final acceptance
- Included areas:
  - Technical plan / architecture / design
  - Daily plan
  - dev-log
  - agent-troubleshooting-log
  - Code implementation
  - Tests / build / lint / typecheck
  - Acceptance evidence
  - Git-assisted investigation only when needed
- Excluded areas:
- Assumptions:

---

### 2. Project File Discovery

#### 2.1 Key Files Found

| Category | File(s) | Notes |
|---|---|---|
| Technical plan / architecture |  |  |
| Daily plan |  |  |
| dev-log |  |  |
| Agent troubleshooting log |  |  |
| Test config |  |  |
| Build config |  |  |
| Lint / typecheck config |  |  |
| Acceptance evidence |  |  |

#### 2.2 Missing or Ambiguous Files

| Expected Item | Status | Impact |
|---|---|---|
|  |  |  |

#### 2.3 Discovery Method

- Standard file-name matches:
- File-name/path scanning:
- Candidate title/first-line reads, if any:
- Full-content discovery avoided: Yes / No

---

### 3. Technical Plan Review

| Dimension | Result | Notes | Issue Reference |
|---|---|---|---|
| Goal alignment | Good / Acceptable / Risky / Poor / Insufficient Evidence |  |  |
| Module boundary clarity | Good / Acceptable / Risky / Poor / Insufficient Evidence |  |  |
| Technology choice rationality | Good / Acceptable / Risky / Poor / Insufficient Evidence |  |  |
| Complexity control | Good / Acceptable / Risky / Poor / Insufficient Evidence |  |  |
| Maintainability | Good / Acceptable / Risky / Poor / Insufficient Evidence |  |  |
| Extensibility | Good / Acceptable / Risky / Poor / Insufficient Evidence |  |  |
| Security | Good / Acceptable / Risky / Poor / Insufficient Evidence |  |  |
| Test and acceptance feasibility | Good / Acceptable / Risky / Poor / Insufficient Evidence |  |  |

#### Technical Plan Summary

- Strengths:
- Risks:
- Delivery impact:

---

### 4. Daily Process Review

| Day / Date | Planned Work | Logged Progress | Evidence | Gaps / Risks | Issue Reference |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

#### Daily Process Summary

- Clear progress evidence:
- Missing or ambiguous days:
- Claimed completion without evidence:
- Scope changes:
- Delivery impact:

---

### 5. Dev Log Review

- Supports daily plan: Yes / Partial / No / Insufficient Evidence
- Records important implementation changes: Yes / Partial / No / Insufficient Evidence
- Records blockers and decisions: Yes / Partial / No / Insufficient Evidence
- Consistent with code and tests: Yes / Partial / No / Insufficient Evidence

#### Findings

| Finding | Evidence | Issue Reference |
|---|---|---|
|  |  |  |

---

### 6. Agent Troubleshooting Review

- Troubleshooting issues recorded: Yes / Partial / No / Not Applicable
- Failed attempts explained: Yes / Partial / No / Not Applicable
- Root causes identified: Yes / Partial / No / Not Applicable
- Unresolved agent-related issues: Yes / No / Insufficient Evidence

#### Findings

| Finding | Evidence | Issue Reference |
|---|---|---|
|  |  |  |

---

### 7. Code Review

#### 7.1 Areas Reviewed

| Area / Module | Files | Review Focus | Result | Issue Reference |
|---|---|---|---|---|
|  |  |  |  |  |

#### 7.2 Code Review Summary

- Core functionality readiness:
- Architecture alignment:
- Error handling and edge cases:
- Security-sensitive findings:
- Maintainability findings:
- Debug / temporary code findings:

---

### 8. Test / Build / Lint / Typecheck Results

| Command | Working Directory | Purpose | Result | Notes / Output Summary | Issue Reference |
|---|---|---|---|---|---|
|  |  |  | Pass / Fail / Skipped / Inconclusive |  |  |

#### Command Detection Notes

- Detected from:
- Commands intentionally skipped:
- Reason for skipped commands:

---

### 9. Git-Assisted Investigation

> Git is used only when needed to localize concrete issues, risks, inconsistencies, or failures.

| Reason Git Was Used | Command | Result Summary | Related Issue |
|---|---|---|---|
|  |  |  |  |

If Git was not used, state why:

- Git-assisted investigation used: Yes / No
- Reason:

---

### 10. Issues Found

<!-- Insert structured issues using templates/ISSUE.template.md -->

---

### 11. Acceptance Decision

- Final decision: PASS / CONDITIONAL_PASS / FAIL / INCONCLUSIVE
- Blocker issues: 0
- High severity issues: 0
- Medium severity issues: 0
- Low severity issues: 0
- Evidence gaps: 0

#### Decision Rationale


#### Required Follow-up Before Acceptance, if any


#### Recommended Follow-up After Acceptance, if any


---

### 12. Review Artifacts

| Artifact | Purpose | Notes |
|---|---|---|
|  |  |  |

- Review artifact directory used: `.review-artifacts/` / `.review-artifacts-run-YYYYMMDD-HHMMSS/` / None

---

### 13. Final Short Summary

审查结论：PASS / CONDITIONAL_PASS / FAIL / INCONCLUSIVE

阻塞问题：N 个
高风险问题：N 个
中低风险问题：N 个
证据不足项：N 个

关键发现：
1. ...
2. ...
3. ...

审查记录已写入：
PROJECT_REVIEW_RECORD.md
