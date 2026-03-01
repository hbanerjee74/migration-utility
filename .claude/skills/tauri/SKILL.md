---
name: tauri
description: Tauri framework for building cross-platform desktop and mobile apps. Use for desktop app development, native integrations, Rust backend, and web-based UIs.
---

# Tauri Skill

Use this skill for Tauri architecture, command wiring, sidecar integration, packaging, and debugging.

## Repo Alignment

For this repository, prioritize:

- `app/src-tauri/` for Rust commands and state
- `app/src/` for frontend invoke/listen usage
- `app/sidecar/` for agent runtime integration

Follow repo rules in:

- `../../rules/rust-backend.md`
- `../../rules/agent-sidecar.md`
- `../../rules/logging-policy.md`

## Standard Workflow

1. Identify affected boundary: frontend, Rust command, sidecar, or packaging.
2. Make minimal changes in the correct layer.
3. Add/update tests for changed behavior.
4. Run validation commands:

```bash
cd app && npx tsc --noEmit
cargo test --manifest-path app/src-tauri/Cargo.toml
```

- For sidecar changes:

```bash
cd app/sidecar && npx vitest run
npm run sidecar:build
```

## Command Pattern

Use typed command boundaries and explicit error mapping:

```rust
#[tauri::command]
pub fn example_command(state: tauri::State<DbState>) -> Result<(), CommandError> {
    log::info!("example_command: start");
    // command logic
    Ok(())
}
```

Frontend invoke pattern:

```ts
import { invoke } from "@tauri-apps/api/core";

await invoke("example_command", { /* args */ });
```

## Debugging Checklist

- Confirm command is registered in `src/lib.rs`.
- Confirm frontend uses the exact command name.
- Confirm payload is JSON-serializable.
- Confirm sidecar writes protocol messages only to stdout.
- Confirm logs do not include secrets.

## References

Use the local reference files for focused guidance:

- `references/getting-started.md`
- `references/core-concepts.md`
- `references/plugins.md`
- `references/security.md`
- `references/distribution.md`
- `references/reference.md`

Use official docs for deep API details: <https://tauri.app/>.
