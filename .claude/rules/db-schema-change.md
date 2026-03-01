# DB Schema Change Protocol

Use this protocol for any task that changes SQLite schema, writes to new/existing tables, or modifies persistence behavior.

## Required Workflow

1. Identify the data owner table before coding.
2. Trace all read and write paths that touch the data.
3. Implement schema changes only via migrations.
4. Prove correctness with schema and behavior tests.
5. Document the decision and verification in the PR/issue.

If any step is skipped or unclear, stop and ask for clarification before implementation.

## 1) Data Ownership Decision (Mandatory)

Before changing code, state:

- Field/behavior being added or changed.
- Chosen table and why it owns this data.
- Alternative table(s) considered and why they were rejected.
- Workspace scope expectations (workspace-scoped, source-scoped, global).

Do not add columns/tables until this is explicit.

## 2) Query Path Trace (Mandatory)

List all call sites that read/write the affected data:

- Rust commands in `app/src-tauri/src/commands/**`
- DB helpers in `app/src-tauri/src/db.rs`
- Migrations in `app/src-tauri/migrations/**`

For each path, confirm whether it must change.

## 3) Migration Discipline (Mandatory)

- Never change schema ad hoc in command code.
- Add a new numbered migration in `app/src-tauri/migrations/`.
- Register the migration in `MIGRATIONS` in `app/src-tauri/src/db.rs`.
- Use parameterized SQL for writes (`?1`, `?2`, `params![...]`).
- Preserve FK and delete-policy intent:
  - App relational entities: `ON DELETE CASCADE` unless explicitly justified.
  - Usage/log snapshot records: no FK to mutable parent entities.

## 4) Test Gate (Mandatory)

At minimum, update/add:

- Schema contract coverage in `app/src-tauri/src/db.rs` tests:
  - table existence/index/FK expectations as applicable.
  - migration idempotency/version-count assertions.
- Command behavior regression tests for the changed persistence logic.
- Workspace isolation tests when data is workspace-scoped.

Run:

```bash
cargo test --manifest-path app/src-tauri/Cargo.toml db
```

Plus targeted command/module tests for modified behavior.

## 5) PR/Issue Checklist (Mandatory)

Include a short section with:

- Chosen table + rationale.
- Query paths updated.
- Migration file(s) added.
- Tests run and results.
- Any intentionally deferred schema hardening work.
