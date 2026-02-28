# Sidecar Design

## Scope

Defines how the desktop app runs the Claude Agent SDK sidecar, sends requests, and records transcripts.

## Runtime Model

- Sidecar process runs under `node` only.
- Sidecar runs in persistent mode and stays alive across multiple requests.
- Rust command layer reuses the same process and only respawns when the process exits.

## Protocol

Inbound messages (Rust -> sidecar):

- `ping`
- `shutdown`
- `cancel` (`request_id`)
- `agent_request` (`request_id`, `config`)
- `stream_start` (`request_id`, `session_id`, `config`)
- `stream_message` (`request_id`, `session_id`, `user_message`)
- `stream_end` (`session_id`)

Outbound messages (sidecar -> Rust):

- `sidecar_ready`
- `pong`
- `system` (request-scoped lifecycle markers)
- `agent_event` (raw SDK events)
- `agent_response` (assistant text chunks, `done`)
- `error`
- `request_complete`

## SDK Integration

- Uses Agent SDK V2 session APIs in sidecar runtime.
- Session options keep project-context behavior:
  - `settingSources: ['project']`
  - `systemPrompt: { type: 'preset', preset: 'claude_code' }`
  - `cwd`
  - API key in `options.env.ANTHROPIC_API_KEY`

## Transcript Strategy

- Transcript file location: `{workspace-dir}/logs/agent-{request_id}.jsonl`.
- First JSONL line is `type: "config"` with API key redacted.
- Following JSONL lines are only request-scoped sidecar messages (`request_id` match).
- Sidecar `stdout` / `stderr` diagnostics are written to standard app logs.

## Build and Packaging

- Sidecar TypeScript compiles to `app/sidecar/dist/` using `npm run sidecar:build`.
- Tauri bundle includes `app/sidecar/dist/**/*` in resources.
- Rust sidecar launcher resolves `app/sidecar/dist/index.js`.
