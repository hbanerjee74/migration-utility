# Tauri Security

## Principles

- Treat frontend input as untrusted.
- Validate at Rust command boundaries.
- Use least privilege for commands and plugin permissions.

## IPC Hygiene

- Expose only required commands.
- Keep command arguments explicit and typed.
- Return sanitized errors to frontend.

## Secrets and Logging

- Never log secrets, tokens, or raw credentials.
- Follow `.claude/rules/logging-policy.md`.

## Sidecar Boundary

- Sidecar stdout is protocol-only.
- Sidecar logs go to stderr.
- Sanitize user-controlled text before logging.
