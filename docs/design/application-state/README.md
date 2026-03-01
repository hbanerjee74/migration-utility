# Application State Design

Canonical app state machine for surface routing and edit locks.

## Source of Truth

State is persisted in SQLite `settings` keys and workspace presence checks.

- `app_phase` (`setup_required` | `scope_editable` | `plan_editable` | `ready_to_run` | `running_locked`)
- `scope_finalized` (bool)
- `plan_finalized` (bool)
- `app_settings` (`github_oauth_token`, `anthropic_api_key`)
- `workspaces` existence (`is_source_applied`)

Implementation references:

- [db.rs](/Users/hbanerjee/src/migration-utility/app/src-tauri/src/db.rs)
- [types.rs](/Users/hbanerjee/src/migration-utility/app/src-tauri/src/types.rs)
- [settings.rs](/Users/hbanerjee/src/migration-utility/app/src-tauri/src/commands/settings.rs)

## Phase Definitions

- `setup_required`: Missing at least one prerequisite (`github auth`, `anthropic key`, or applied source/workspace).
- `scope_editable`: Prerequisites complete and scope is not finalized.
- `plan_editable`: Scope finalized, plan not finalized.
- `ready_to_run`: Scope and plan finalized.
- `running_locked`: Migration running; Scope and Plan are read-only.

## Reconciliation Logic

`reconcile_and_persist_app_phase` computes phase from persisted facts with this precedence:

1. If any prerequisite is missing: `setup_required`
2. Else if persisted phase is `running_locked`: `running_locked`
3. Else if `scope_finalized` is false: `scope_editable`
4. Else if `plan_finalized` is false: `plan_editable`
5. Else: `ready_to_run`

This reconciliation both returns and persists the computed phase.

## Transition Entry Points

Commands that call reconciliation:

- `app_hydrate_phase`
- `app_set_phase_flags`
- `save_anthropic_api_key`
- `github_poll_for_token`
- `github_logout`
- `workspace_apply_and_clone` (sets `scope_finalized=false`, `plan_finalized=false` first)
- `workspace_reset_state` (sets `scope_finalized=false`, `plan_finalized=false` first)

Direct phase setter:

- `app_set_phase` writes the requested phase and returns current facts without reconciliation.

## Frontend Routing and Locks

Default route by phase:

- `setup_required` -> `/settings`
- `scope_editable` -> `/scope`
- `plan_editable` -> `/plan`
- `ready_to_run` -> `/monitor`
- `running_locked` -> `/monitor`

Surface availability:

- `settings`: always enabled
- `home`: enabled for all non-setup phases
- `scope`: enabled for all non-setup phases
- `plan`: enabled in `plan_editable`, `ready_to_run`, `running_locked`
- `monitor`: enabled in `ready_to_run`, `running_locked`

Read-only behavior:

- In `running_locked`, Scope and Plan are read-only
- In all other phases, Scope and Plan are editable

Implementation references:

- [workflow-store.ts](/Users/hbanerjee/src/migration-utility/app/src/stores/workflow-store.ts)
- [App.tsx](/Users/hbanerjee/src/migration-utility/app/src/App.tsx)
- [icon-nav.tsx](/Users/hbanerjee/src/migration-utility/app/src/components/icon-nav.tsx)
- [scope-step-nav.tsx](/Users/hbanerjee/src/migration-utility/app/src/components/scope-step-nav.tsx)

## Operational Invariants

- Losing prerequisites always forces `setup_required`, even if `app_phase` was `running_locked`.
- `running_locked` persists across hydration/reconciliation while prerequisites remain satisfied.
- Workspace apply and reset both clear scope/plan finalized flags before reconciliation.
