# Tauri Distribution

## Build Artifacts

Tauri can package desktop targets for macOS, Windows, and Linux.

## Release Guidance

- Keep app versioning consistent across config and release tags.
- Ensure signing/notarization steps are configured per platform as needed.
- Verify CI release workflow includes build + validation + artifact publish.

## Pre-Release Checks

```bash
cd app
npx tsc --noEmit
cargo test --manifest-path src-tauri/Cargo.toml
```

Run sidecar build/tests when relevant:

```bash
cd app/sidecar
npx vitest run
npm run sidecar:build
```
