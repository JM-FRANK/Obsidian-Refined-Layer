# Delivery Checklist v0.2.1

## Completed

```text
[x] v0.2.0 architecture and daily plan copied to docs/achieve/.
[x] v0.2.1 architecture and daily plan are active project docs.
[x] User-facing wording uses generated block / protected block.
[x] RefineProfile type exists.
[x] rawRefined settings use activeProfileId + profiles.
[x] Old v0.2.0 rawRefined settings migrate into the default profile.
[x] Settings UI can select, add, copy, delete, and edit profiles.
[x] Default refine uses activeProfile.
[x] Refine current note with profile... chooses a one-off profile.
[x] ProposalSessionV2, Review UI, cached session picker, and draft output show profile information.
[x] RefineRunStatus shows a non-blocking persistent Notice with pipeline stages and N/3 model request attempts.
[x] Dismissing or replacing the run status display does not add a cancelled result type.
[x] v0.2.0 ApplyPlan/cache/security behavior remains in place.
```

## Verification

```text
npm run typecheck
npm test
npm run build
```

## Deferred

```text
Real provider smoke in a true Obsidian vault remains manual because this workspace has no SecretStorage-backed API key.

Required release smoke before publishing:
- Test model connection with the target provider.
- Run Refine current note with a real provider and confirm Review UI opens.
- Apply selected A blocks and confirm protected B block is preserved byte-for-byte.
- Apply selectedTags and confirm only whitelisted accepted tags are appended.
- Inspect session-cache, error-session-cache, logs, drafts, and data.json for secret redaction.
```
