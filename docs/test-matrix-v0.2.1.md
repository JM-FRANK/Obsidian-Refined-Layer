# Test Matrix v0.2.1

## Scope

v0.2.1 verifies the v0.2.0 raw-refined pipeline plus RefineProfile templates and RefineRunStatus visibility.

## Automated

```text
npm run typecheck
npm test
npm run build
```

Focused coverage:

```text
settings migration: old v0.2.0 rawRefined -> default RefineProfile
create proposal: active/profile snapshot -> ProposalSessionV2
retry: status-safe retry and failed attempt cache behavior
review view model: profileName display data
cached session: profileName summary and Apply disabled path
save draft: profile id/name in draft output
i18n: zh-CN/en key parity
mock happy path: refine -> review decision -> ApplyPlan -> safe write / draft
```

## Manual

```text
1. Open Settings and confirm Profile list is visible.
2. Copy Default profile, rename it, change one generated block prompt.
3. Confirm deleting the last remaining profile is disabled.
4. Run Refine current note and confirm it uses activeProfile.
5. Run Refine current note with profile... and confirm the chosen profile does not change activeProfile.
6. Confirm run status appears immediately and model request shows N/3.
7. Confirm Review UI and cached session picker show profile name.
8. Save as Draft and confirm profile id/name appear in the draft.
9. Confirm cached session Apply remains disabled.
```

## Known Manual Gap

Real OpenAI-compatible provider smoke still requires a real Obsidian vault, SecretStorage, and API key. Automated tests cover provider redaction and v2 request/response behavior, but not a live external call from this workspace.
