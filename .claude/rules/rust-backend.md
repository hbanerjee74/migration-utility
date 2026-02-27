---
paths:
  - "app/src-tauri/**"
---

# Rust Backend

Tauri v2 backend in `app/src-tauri/`. One module per concern in `src/commands/`.

## Command Conventions

Every `#[tauri::command]` function must:

- Log `info!` on entry with key params: `info!("workspace_create: name={}", name)`
- Log `error!` on failure: `error!("workspace_create: failed: {}", e)`
- Use `debug!` for intermediate steps
- Never log secrets (API keys, tokens) or PII column values

## Error Types

Use `thiserror` for all error types. Commands return `Result<T, CommandError>` where `CommandError`
derives `serde::Serialize` so Tauri serialises it to the frontend as a typed error, not a raw string.

## Testing

Inline `#[cfg(test)]` tests in the same file as the command. Use an in-memory SQLite connection via
a `pub(crate) fn open_in_memory()` helper in `db.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    #[test]
    fn creates_workspace_and_retrieves_it() {
        let conn = db::open_in_memory().unwrap();
        // ... exercise command logic directly against conn
    }
}
```

Run tests with:

```bash
cargo test --manifest-path app/src-tauri/Cargo.toml          # all Rust tests
cargo test --manifest-path app/src-tauri/Cargo.toml commands::workspace  # module filter
```

See `app/tests/TEST_MANIFEST.md` for the Rust module → E2E tag mapping.

## Tauri Mock Infrastructure

**Unit/component tests (frontend):** `app/src/test/setup.ts` (global) + `mockInvoke` from
`app/src/test/mocks/tauri.ts`.

**E2E tests:** Set `TAURI_E2E=true`. Mocks in `app/src/test/mocks/tauri-e2e.ts`. Override
per-test via `window.__TAURI_MOCK_OVERRIDES__`.

## Key Files

| File | Purpose |
|---|---|
| `src/commands/` | One file per command group (`workspace.rs`, `fabric.rs`, `migration.rs`, `plan.rs`, `seed.rs`) |
| `src/db.rs` | SQLite via rusqlite — schema in `migrations/001_initial_schema.sql` |
| `src/lib.rs` | Tauri setup, plugin registration, command handler registration |
| `src/types.rs` | Shared Rust types (`CommandError`, serialisable structs) |
