# Tauri Core Concepts

## Process Model

- Core process (Rust) handles native capabilities and trusted operations.
- Webview process (frontend) handles UI.
- Communication happens via commands/events over IPC.

## Commands

Use commands for request/response operations from UI to Rust.

- Define with `#[tauri::command]`.
- Return `Result<T, CommandError>` for typed failures.
- Keep command handlers thin; delegate heavy logic to modules.

## Events

Use events for push-style updates from Rust to UI.

- Emit from Rust for progress/state changes.
- Listen in frontend where needed.
- Prefer explicit payload schemas.

## State

Manage shared state in Rust via `State<T>` with synchronization primitives.

## Safety

- Validate external inputs at boundaries.
- Keep IPC payloads serializable and minimal.
- Avoid exposing unnecessary commands.
