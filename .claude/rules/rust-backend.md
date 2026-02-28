---
paths:
  - "app/src-tauri/**"
---

# Rust Backend

Tauri v2 backend in `app/src-tauri/`. One module per concern in `src/commands/` (planned — not yet created).

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

Inline `#[cfg(test)]` tests in the same file as the command. Open an in-memory SQLite connection
directly and apply the schema:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        // apply schema so migrations run
        conn.execute_batch(include_str!("../migrations/001_initial_schema.sql"))
            .unwrap();
        conn
    }

    #[test]
    fn creates_workspace_and_retrieves_it() {
        let conn = setup();
        // ... exercise command logic directly against conn
    }
}
```

Run tests with:

```bash
cargo test --manifest-path app/src-tauri/Cargo.toml     # all Rust tests
cargo test --manifest-path app/src-tauri/Cargo.toml db  # module filter
```

## Key Files

| File | Purpose |
|---|---|
| `src/db.rs` | SQLite via rusqlite — `DbState`, `DbError`, schema in `migrations/001_initial_schema.sql` |
| `src/lib.rs` | Tauri setup, plugin registration, command handler registration |
| `src/commands/` | Planned: one file per command group (`workspace.rs`, `fabric.rs`, `migration.rs`, etc.) |
