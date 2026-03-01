# Tauri Reference Notes

This file is a compact quick reference for common Tauri tasks in this repo.

## Common Touchpoints

- Rust commands: `app/src-tauri/src/commands/`
- Tauri setup: `app/src-tauri/src/lib.rs`
- DB/state: `app/src-tauri/src/db.rs`
- Frontend invoke/listen usage: `app/src/`
- Sidecar runtime: `app/sidecar/`

## Command Checklist

1. Add command function with `#[tauri::command]`.
2. Return `Result<_, CommandError>`.
3. Register command in `lib.rs` handler list.
4. Add frontend invoke call.
5. Add/update tests.

## Validation Commands

```bash
cd app
npx tsc --noEmit
cargo test --manifest-path src-tauri/Cargo.toml
```

```bash
cd app/sidecar
npx vitest run
npm run sidecar:build
```

## Official Docs

- <https://tauri.app/>
- <https://v2.tauri.app/>
