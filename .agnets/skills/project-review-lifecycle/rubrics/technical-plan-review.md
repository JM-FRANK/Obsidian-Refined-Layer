# Technical Plan Review Rubric

Use this rubric to evaluate the project's technical plan, architecture document, or design document.

Rate each dimension as one of:

- Good
- Acceptable
- Risky
- Poor
- Insufficient Evidence

For each dimension, record:

- Result
- Explanation
- Issues found
- Recommendation

---

## 1. Goal Alignment

Evaluate whether the technical plan directly supports the project objective.

Good:
- Goals are explicit.
- The design clearly supports those goals.
- Non-goals or constraints are documented.

Acceptable:
- Goals are mostly clear.
- Minor assumptions are needed, but the design is directionally aligned.

Risky:
- Goals are ambiguous or partially mismatched.
- Some design choices may not support the intended deliverable.

Poor:
- The plan appears disconnected from the project objective.
- Core requirements are missing or contradicted.

Insufficient Evidence:
- The plan lacks enough information to judge alignment.

---

## 2. Module Boundary Clarity

Evaluate whether components, responsibilities, and interfaces are clear.

Good:
- Modules have clear responsibilities.
- Interfaces and data flow are understandable.
- Coupling is controlled.

Acceptable:
- Boundaries are generally understandable with minor ambiguity.

Risky:
- Responsibilities overlap.
- Interfaces are vague.
- Coupling may cause maintenance or testing difficulty.

Poor:
- Module boundaries are unclear or contradictory.
- Implementation is likely to become tangled.

Insufficient Evidence:
- There is not enough structural information.

---

## 3. Technology Choice Rationality

Evaluate whether selected frameworks, libraries, languages, storage, and tools fit the project.

Good:
- Choices are justified by project needs.
- Dependencies are reasonable.
- Operational complexity is appropriate.

Acceptable:
- Choices are plausible even if not fully justified.

Risky:
- Choices introduce avoidable complexity, maturity risk, or mismatch.

Poor:
- Choices are unsuitable for the stated goals.
- Major dependency or ecosystem risk is ignored.

Insufficient Evidence:
- Technology choices are not described clearly enough.

---

## 4. Complexity Control

Evaluate whether the plan avoids unnecessary complexity.

Good:
- The design is as simple as the problem allows.
- Complexity is isolated where necessary.

Acceptable:
- Some complexity exists but is manageable.

Risky:
- The design may be over-engineered or under-specified.
- Too many moving parts for the project scope.

Poor:
- Complexity is uncontrolled and likely to slow delivery or create bugs.

Insufficient Evidence:
- Not enough detail to judge complexity.

---

## 5. Maintainability

Evaluate whether the design supports future changes and debugging.

Good:
- Clear structure.
- Testable components.
- Reasonable naming and separation of concerns.
- Observability/debuggability considered where relevant.

Acceptable:
- Maintainability is adequate for the current project.

Risky:
- Some design choices may make future changes expensive.

Poor:
- The plan is likely to produce fragile or difficult-to-maintain code.

Insufficient Evidence:
- Maintainability cannot be assessed from the plan.

---

## 6. Extensibility

Evaluate whether the design can handle foreseeable changes without major rewrites.

Good:
- Expected extension points are identified.
- Future growth is considered without over-engineering.

Acceptable:
- The design can support likely near-term changes.

Risky:
- Foreseeable changes may require large rework.

Poor:
- The design locks the project into a narrow path that conflicts with expected needs.

Insufficient Evidence:
- Future needs or extension points are not described.

---

## 7. Security

Evaluate whether the plan considers relevant security risks.

Good:
- Input validation, auth/authz, secrets, data handling, and dependency risks are addressed where relevant.

Acceptable:
- Security considerations are basic but likely sufficient for project scope.

Risky:
- Important security areas are lightly handled or implicit.

Poor:
- Security-sensitive project areas are ignored or mishandled.

Insufficient Evidence:
- Not enough information to judge security.

---

## 8. Test and Acceptance Feasibility

Evaluate whether the plan enables verification.

Good:
- Test strategy and acceptance criteria are clear.
- Core paths are testable.
- Evidence needed for acceptance is described.

Acceptable:
- Testing and acceptance are feasible with minor gaps.

Risky:
- Some important paths lack clear test or acceptance strategy.

Poor:
- The design is difficult to test or lacks meaningful acceptance criteria.

Insufficient Evidence:
- Testing or acceptance is not described.

---

## Practical Guidance

Only create issues for technical-plan findings that affect delivery, maintainability, safety, testability, or acceptance confidence. Minor omissions can be noted without becoming issues if they do not materially affect the project-owner decision.
