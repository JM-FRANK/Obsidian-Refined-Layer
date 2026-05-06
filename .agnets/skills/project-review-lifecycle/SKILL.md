# Project Review Lifecycle Skill

## Purpose

Use this skill to perform a full lifecycle project review for a software project, from D1/Day1 through final acceptance. The primary user is a project owner who needs a practical delivery-oriented review that an agent can execute in one pass.

The review must examine the project process, technical plan, implementation, logs, troubleshooting history, tests, build/lint/typecheck results, and acceptance readiness. All findings, bugs, risks, evidence gaps, command results, and the final decision must be written to the project root file:

```text
PROJECT_REVIEW_RECORD.md
```

This skill uses a practical delivery style with agent-executable steps. Do not block acceptance for trivial issues unless they materially affect delivery, safety, correctness, maintainability, or evidence quality.

---

## When to Use

Use this skill when the user asks for a full project review, final acceptance review, delivery readiness review, D1-to-acceptance review, code review with logs, or review of a project that contains some combination of:

- Technical plan / architecture / design document
- Daily plan
- dev-log
- agent-troubleshooting-log
- Source code
- Tests or acceptance materials
- Git repository

---

## Non-Negotiable Outputs

The review must produce two outputs:

1. A complete project-root review record appended to:

```text
PROJECT_REVIEW_RECORD.md
```

2. A short final summary in the conversation, using this format:

```text
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
```

---

## Required Review Record Strategy

At the beginning of the review:

1. Create `PROJECT_REVIEW_RECORD.md` in the project root if it does not exist.
2. If it already exists, append a new `Review Run` section.
3. Write the current timestamp, review scope, assumptions, and initial discovery results before proceeding with deeper review.
4. If the review fails or is interrupted, the file must still contain all findings, commands, partial results, and failure reasons collected so far.

Use `templates/PROJECT_REVIEW_RECORD.template.md` as the structure for each appended run.

---

## Review Artifact Directory

If temporary files, reproduction scripts, test outputs, static-analysis outputs, notes, or other review artifacts are needed, create them only under a new root-level directory:

```text
.review-artifacts/
```

If `.review-artifacts/` already exists, create a timestamped alternative:

```text
.review-artifacts-run-YYYYMMDD-HHMMSS/
```

Rules:

- Do not modify original source code.
- Do not modify original tests.
- Do not modify original configuration.
- Do not alter or damage the existing environment.
- Do not write temporary review files into source directories.
- Record every created review artifact in `PROJECT_REVIEW_RECORD.md`.

---

## Safety Boundaries

Allowed:

- Reading project files.
- Listing files and directories.
- Running project-declared test, build, lint, typecheck, and check commands.
- Running read-only inspection commands.
- Creating `PROJECT_REVIEW_RECORD.md`.
- Creating `.review-artifacts*` directories for review-only outputs.
- Using Git only as auxiliary investigation when a concrete issue, risk, inconsistency, or test failure requires localization.

Forbidden unless the user explicitly overrides:

- Deleting files or directories.
- Modifying source code, existing tests, existing configs, lockfiles, or environment files.
- Installing, upgrading, or removing dependencies.
- Running migrations.
- Running deployment, release, publishing, or production commands.
- Calling production services or writing production data.
- Running destructive Git commands such as `git reset`, `git clean`, `git checkout` to overwrite work, `git rebase`, or `git push`.
- Running commands that obviously alter the project state beyond review records and review artifacts.

All commands run during review must be recorded with:

- Command
- Working directory
- Purpose
- Result
- Relevant output or summarized failure

---

## File Discovery Rules

Prefer file-name and path based discovery. Do not read every Markdown file in full merely to locate documents.

Discovery order:

1. Match standard file names.
2. Scan root, `docs`, `doc`, `planning`, `plans`, `logs`, `review`, and similar directories by file name.
3. Infer file type from path and file-name keywords.
4. Only if still ambiguous, read candidate file titles or the first few lines.
5. Avoid full-content scanning as a discovery mechanism.

### Technical Plan / Architecture Candidates

- `ARCHITECTURE.md`
- `architecture.md`
- `DESIGN.md`
- `design.md`
- `TECHNICAL_PLAN.md`
- `technical-plan.md`
- `技术方案.md`
- `架构书.md`
- `设计文档.md`

### Daily Plan Candidates

- `DAILY_PLAN.md`
- `daily-plan.md`
- `PLAN.md`
- `plan.md`
- `日计划.md`
- `每日计划.md`

### Dev Log Candidates

- `DEV_LOG.md`
- `dev-log.md`
- `DEVELOPMENT_LOG.md`
- `development-log.md`
- `开发日志.md`

### Agent Troubleshooting Log Candidates

- `AGENT_TROUBLESHOOTING_LOG.md`
- `agent-troubleshooting-log.md`
- `TROUBLESHOOTING.md`
- `troubleshooting.md`
- `问题排查日志.md`
- `Agent问题日志.md`

---

## Review Flow

Perform the review in this order.

### 1. Initialize Review Record

- Locate project root.
- Create or append to `PROJECT_REVIEW_RECORD.md`.
- Record timestamp, scope, detected files, assumptions, and any missing key files.

### 2. Discover Key Project Files

Identify:

- Technical plan / architecture / design document
- Daily plan
- dev-log
- agent-troubleshooting-log
- Test, build, lint, and typecheck configuration
- Acceptance evidence, if present

Record found and missing files.

### 3. Review Technical Plan

Use `rubrics/technical-plan-review.md`.

Assess:

1. Goal alignment
2. Module boundary clarity
3. Technology choice rationality
4. Complexity control
5. Maintainability
6. Extensibility
7. Security
8. Test and acceptance feasibility

For each dimension, classify as:

- Good
- Acceptable
- Risky
- Poor
- Insufficient Evidence

Record technical risks as structured issues if they can affect delivery, maintainability, safety, or acceptance.

### 4. Review Daily Process from D1/Day1

Use `rubrics/daily-process-review.md`.

Review by recognizable date, Dn marker, Day marker, or chronological section. Do not require perfectly strict D1/D2 formatting, but record missing or ambiguous evidence when it affects confidence.

Check:

- Planned work
- Actual logged progress
- Scope changes
- Blockers
- Troubleshooting links
- Evidence of completion
- Gaps between claimed progress and observable implementation/tests

### 5. Review dev-log

Check whether the dev-log:

- Supports the daily plan
- Explains important implementation changes
- Records scope changes and blockers
- Notes unresolved issues
- Is consistent with code, tests, and troubleshooting history

Record mismatches or unsupported completion claims.

### 6. Review agent-troubleshooting-log

Check whether the troubleshooting log records:

- Agent mistakes or repeated failed attempts
- Root cause analysis
- Fix attempts and outcomes
- Unresolved issues
- Workarounds or risky changes
- Context loss, mistaken assumptions, or suspicious loops

Record unresolved or high-risk troubleshooting items as issues.

### 7. Review Code and Implementation

Review code for delivery readiness, focusing on material risk rather than style-only concerns.

Check:

- Core functionality completeness
- Alignment with the technical plan
- Error handling
- Edge cases
- Input validation
- Security-sensitive behavior
- Data handling
- Maintainability
- Duplicate or dead code
- Debug code, hardcoded secrets, test-only logic, or temporary workarounds
- Compatibility with documented acceptance expectations

Record only actionable issues.

### 8. Detect and Run Project-Declared Commands

Automatically detect project-declared commands from files such as:

- `package.json`
- `pyproject.toml`
- `pytest.ini`
- `requirements.txt`
- `setup.py`
- `go.mod`
- `Cargo.toml`
- `pom.xml`
- `build.gradle`
- `Makefile`
- `justfile`
- `taskfile.yml`

Prefer explicitly declared commands over guessed commands.

For Node.js, prefer scripts named:

- `test`
- `lint`
- `typecheck`
- `build`
- `check`

Allowed command categories:

- test
- build
- lint
- typecheck
- check
- static analysis that does not modify source files

Record every command and result in the review record.

If commands fail, determine whether the failure is:

- A real product issue
- A test/environment issue
- Missing dependency or setup evidence
- Inconclusive

Do not install dependencies or modify the environment to make commands pass unless explicitly authorized.

### 9. Use Git Only for Auxiliary Investigation

Do not perform full Git review by default.

Use Git only when a concrete issue, bug, inconsistency, missing evidence item, or failed command requires localization.

Allowed Git commands include:

```bash
git status --short
git diff --stat
git diff
git log --oneline --decorate --max-count=50
git blame <file>
git show <commit>
```

Use Git to answer specific questions such as:

- What changed around this bug?
- Is there uncommitted work relevant to this failure?
- Was a risky change made without log support?
- Which commit introduced a suspicious file change?

Record why Git was used and what it showed.

### 10. Record All Issues

Use `templates/ISSUE.template.md`.

Every issue, bug, risk, evidence gap, mismatch, or test failure must be recorded with:

- Issue number
- Severity
- Type
- Location
- Found In
- Description
- Impact
- Evidence
- Recommendation
- Blocks Acceptance
- Status

Use `rubrics/severity-levels.md` for severity classification.

### 11. Make Final Acceptance Decision

Use `rubrics/acceptance-decision.md`.

Choose exactly one:

- `PASS`
- `CONDITIONAL_PASS`
- `FAIL`
- `INCONCLUSIVE`

The final decision must be supported by the recorded evidence and issue severities.

### 12. Final Conversation Summary

After writing the full review record, output the required short summary to the user.

---

## Issue Types

Use one of these issue types when possible:

- Bug
- Risk
- Missing Evidence
- Test Gap
- Code Quality
- Git Hygiene
- Documentation Mismatch
- Agent Issue
- Architecture Issue
- Security
- Build Failure
- Acceptance Gap

---

## Severity Levels

Use:

- Blocker
- High
- Medium
- Low

See `rubrics/severity-levels.md`.

---

## Acceptance Outcomes

Use:

- `PASS`: Ready for acceptance. No blocker issues. Evidence is sufficient.
- `CONDITIONAL_PASS`: Acceptable for delivery with non-blocking follow-up items.
- `FAIL`: Not acceptable. Blocking issue, core failure, severe risk, or unacceptable missing evidence exists.
- `INCONCLUSIVE`: Cannot reliably judge due to insufficient evidence, missing files, or inability to run necessary checks.

See `rubrics/acceptance-decision.md`.

---

## Practical Judgment Rule

This skill is delivery-oriented. Do not inflate minor formatting, naming, or cosmetic issues into acceptance blockers. Escalate only when the issue affects correctness, reliability, safety, maintainability, acceptance evidence, or the project owner’s ability to make a confident decision.
