# API Docs

Design decisions for runtime API contracts between frontend, Rust commands, and sidecar.

---

## Execution Model

- Agent execution is streaming-first.
- Cross-session resume is not supported.
- Navigating away from an active surface closes the stream session and cleans up sidecar state.
- Returning to the surface starts a fresh session.

Reason: avoids stale context and dead-session recovery logic while preserving live UX.

---

## Permission Mode

- All SDK runs use `permissionMode: bypassPermissions`.
- `allowDangerouslySkipPermissions: true` is always set with bypass mode.

Reason: deterministic non-interactive execution for migration automation.

---

## Sidecar Stream Contract

Rust sends newline-delimited JSON requests to sidecar stdin. Sidecar writes newline-delimited
JSON responses to stdout.

### Inbound (Rust → sidecar)

- `stream_start` — starts a fresh streaming session for a request.
- `stream_message` — sends a follow-up user message in the same stream session.
- `stream_end` — closes the stream session.
- `cancel` — aborts the in-flight request.
- `shutdown` — terminates sidecar process.

### Outbound (sidecar → Rust)

- `sidecar_ready` — startup ready signal.
- `agent_response` — streamed assistant text chunk (`done=false`) and terminal frame (`done=true`).
- `agent_event` — raw SDK event envelope for transcript/debug.
- `request_complete` — request fully completed.
- `error` — request-scoped failure.

---

## Usage Telemetry

Usage/cost values are sourced from SDK events, not reconstructed in UI.

Primary source fields:

- Result-level: `total_cost_usd`, `usage`, `modelUsage`, `duration_ms`, `duration_api_ms`, `num_turns`, `subtype`, `stop_reason`
- Progress-level: tool/task/hook/system events for detailed drill-down

Persistence strategy:

- Store structured usage for aggregates shown in Settings → Usage.
- Keep raw JSONL transcript for forensics/debug.

---

## Tauri Command Surface

### Agent runtime

- `monitor_launch_agent` (stream orchestration entrypoint)

### Usage reads

- `get_usage_summary`
- `get_usage_by_table`
- `get_usage_by_phase`
- `get_usage_by_day`
- `get_recent_migration_runs`
- `get_migration_run_details`

### Usage reset (optional)

- `reset_usage`

All commands log entry/failure and return typed command errors.
