---
paths:
  - "app/src/**"
---

# UI Flow Constraints

Rules for the Migration Utility's surface transitions and interaction model.
See `docs/design/ui-patterns/` for full screen mockups and flow diagrams.

## Scope surface — locks after launch

All three Scope steps (Select, Candidacy, Table Config) become read-only once a migration run is
launched. Show an amber banner; disable all form fields. The surface remains navigable but cannot
be edited until the run completes or is cancelled.

## Settings tabs — partial lock after launch

- **Connections tab** (GitHub, API key): always editable.
- **Workspace tab** (Fabric URL, migration repo, working directory): fields are `disabled` once a
  run is active.

## Scope forward navigation

Blocked only when required state is missing (e.g. zero tables selected). Validate inline — never
block navigation with a modal dialog. Backward navigation is always free.

## Candidacy override

Override reason field is required — the Sheet save button is disabled until it is non-empty. Call
`candidacy_override` command on explicit save, not debounced.

## Table Config confirmation

"Confirm table" writes `confirmed_at` and is an explicit user action. Auto-populated fields from
the candidacy agent do not count as confirmed. Launch is blocked until all included tables are
confirmed.
