---
paths:
  - "app/sidecar/**"
---

# Node Sidecar

Node.js + TypeScript sidecar process that runs Claude agents via
`@anthropic-ai/claude-agent-sdk`. No hot-reload — rebuild after edits:
`npm run sidecar:build`.

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

## Build

```bash
npm run sidecar:build   # Compile TypeScript sidecar into `app/sidecar/dist/`
```

Build output is bundled as a Tauri resource from `app/sidecar/dist/**/*`.

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

Canonical logging requirements (levels, redaction, correlation IDs) are in `.claude/rules/logging-policy.md`.
