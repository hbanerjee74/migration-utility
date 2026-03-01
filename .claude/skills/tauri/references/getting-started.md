# Tauri Getting Started

## Setup

1. Create frontend project in `app/`.
2. Keep Rust backend under `app/src-tauri/`.
3. Register commands in `app/src-tauri/src/lib.rs`.
4. Call commands from frontend with `@tauri-apps/api/core`.

## Local Dev

```bash
cd app
npm run dev
```

## Validation

```bash
cd app
npx tsc --noEmit
cargo test --manifest-path src-tauri/Cargo.toml
```

## Sidecar

If changes touch sidecar runtime:

```bash
cd app/sidecar
npx vitest run
npm run sidecar:build
```
