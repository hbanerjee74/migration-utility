# Logging Policy

This policy defines required logging behavior across frontend, Rust backend, sidecar, and Python orchestration code.

## Scope

Applies to:

- `app/src/**` (frontend)
- `app/src-tauri/**` (Rust backend)
- `app/sidecar/**` (Node/TypeScript sidecar)
- Python orchestration/agent code when present in this repo

## Level Usage

Use these levels consistently:

- `error`: operation failed, user impact likely
- `warn`/`warning`: unexpected but recoverable
- `info`: key lifecycle events and state transitions
- `debug`: intermediate troubleshooting details

## Sensitive Data Rules

Never log secrets or sensitive values, including:

- API keys, OAuth tokens, session tokens, passwords, private keys
- raw connection strings and credentials
- PII values and sensitive payload fields

If correlation is required, log redacted/masked forms only.

## Redaction Rules

When sensitive fields may appear in logs:

1. redact by key name before logging (`token`, `password`, `secret`, `authorization`, `api_key`)
2. mask long identifiers (`abcd...wxyz`) instead of full values
3. avoid logging full request/response bodies unless sanitized

## Structured Logging

Prefer structured/contextual log records over free-form messages.

Recommended fields:

- `event`
- `component`
- `operation`
- `request_id` or `run_id`
- `status` (`success`/`failure`)
- `error_code` (on failures)

Examples:

- Rust: `info!("event=workspace_apply operation=clone_repo run_id={} status=success", run_id)`
- Python: `logger.info("event=plan_update operation=serialize run_id=%s status=success", run_id)`
- Frontend: `console.log("event=navigate operation=open_monitor run_id=%s", runId)`

## Correlation IDs

Every multi-step operation must carry a correlation identifier and include it in logs:

- frontend: include `runId`/`requestId` in significant logs
- Rust commands: log request/run IDs where available
- sidecar: include request `id` on protocol events
- Python agents: include model/work item/run IDs

## Log Injection Prevention

Treat user-controlled strings as untrusted:

- avoid directly logging unbounded raw user input
- sanitize newline/control characters where practical
- prefer structured fields to concatenated strings

## CI and Review Enforcement

For changes that add or modify logging:

1. verify no secrets are logged
2. verify context fields/correlation IDs are present for critical operations
3. verify failures log actionable context (`operation`, `error`) without sensitive payloads
4. add/update tests where redaction logic exists

## Language-Specific Notes

- Rust: `info!` on command entry, `error!` on failure, `debug!` for intermediate steps
- Frontend: `console.log` for significant actions, `console.warn` for recoverable anomalies, `console.error` for failures
- Sidecar: log to `stderr` only; `stdout` is reserved for JSONL protocol
- Python: use module loggers via `logging.getLogger(__name__)`
