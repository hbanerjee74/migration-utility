---
paths:
  - "app/sidecar/**"
---

# Bun Sidecar

Bun sidecar process that runs Claude agents via `@anthropic-ai/claude-agent-sdk`. No hot-reload —
rebuild after edits: `npm run sidecar:build`.

## JSONL Protocol

Communicates with the Rust backend via stdin/stdout, one JSON object per line:

| Message | Direction | Purpose |
|---|---|---|
| `{"type":"sidecar_ready"}` | sidecar → Rust | Process started and ready |
| `{"type":"ping","id":"…"}` | Rust → sidecar | Heartbeat |
| `{"type":"pong","id":"…"}` | sidecar → Rust | Heartbeat response |
| `{"type":"agent_request","id":"…",…}` | Rust → sidecar | Run an agent |
| `{"type":"agent_response","id":"…",…}` | sidecar → Rust | Streaming agent output |
| `{"type":"agent_error","id":"…","error":"…"}` | sidecar → Rust | Agent failure |

## Key Files

| File | Purpose |
|---|---|
| `app/sidecar/index.ts` | Entry point — emits `sidecar_ready`, reads stdin line-by-line, dispatches requests |
| `app/sidecar/protocol.ts` | JSONL message type definitions and encode/decode helpers |
| `app/sidecar/agent-runner.ts` | Executes agent requests via Claude Agent SDK, streams responses |
| `app/src-tauri/src/commands/sidecar.rs` | Rust: spawns sidecar, heartbeat loop, restart on crash |

## Build

```bash
npm run sidecar:build   # Compile TypeScript → standalone Bun binaries for all platforms
```

Binaries output to `app/src-tauri/binaries/` with Tauri target-triple suffixes:

- `sidecar-aarch64-apple-darwin`
- `sidecar-x86_64-apple-darwin`
- `sidecar-x86_64-unknown-linux-gnu`
- `sidecar-x86_64-pc-windows-msvc.exe`

Registered under `bundle.externalBin` in `tauri.conf.json`.

## Testing

Sidecar unit tests use Vitest with `environment: node` and `pool: forks`:

```bash
cd app/sidecar && npx vitest run   # all sidecar tests
```

Tests mock the Claude Agent SDK — no real API calls.

## Logging

Write structured log lines to stderr (not stdout — stdout is the JSONL protocol channel):

```typescript
console.error("[sidecar] agent_request: starting id=%s", id);  // significant events
```

Never write to stdout except via the JSONL protocol.
