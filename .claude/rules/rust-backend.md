---
paths:
  - "app/src-tauri/**"
---

# Rust Backend

Tauri v2 backend in `app/src-tauri/`. Keep command modules grouped by concern under `src/commands/`.

## Command Conventions

Every `#[tauri::command]` function must:

- Log `info!` on entry with key params: `info!("workspace_create: name={}", name)`
- Log `error!` on failure: `error!("workspace_create: failed: {}", e)`
- Use `debug!` for intermediate steps
- Never log secrets (API keys, tokens) or PII column values

Canonical logging requirements (levels, redaction, correlation IDs) are in `.claude/rules/logging-policy.md`.

## Error Types

Use `thiserror` for all error types. Commands return `Result<T, CommandError>` where `CommandError`
derives `serde::Serialize` so Tauri serialises it to the frontend as a typed error, not a raw string.
Map external errors at boundaries with `map_err(CommandError::from)` where possible; use custom
message mapping only when adding user-facing context.

## Testing

Inline `#[cfg(test)]` tests in the same file as the command where practical. Use
`crate::db::open_in_memory()` to create a migrated in-memory SQLite connection:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    #[test]
    fn creates_workspace_and_retrieves_it() {
        let conn = db::open_in_memory().expect("in-memory db");
        // ... exercise command logic directly against conn
    }
}
```

Run tests with:

```bash
cargo test --manifest-path app/src-tauri/Cargo.toml     # all Rust tests
cargo test --manifest-path app/src-tauri/Cargo.toml db  # module filter
```
