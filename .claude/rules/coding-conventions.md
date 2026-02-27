# Coding Conventions

<!-- Project-wide coding standards. Auto-loaded by Claude Code. -->

## Logging

<!-- Uncomment and customize:

Every new feature must include logging. Use appropriate log levels:

| Level | When to use | Examples |
|---|---|---|
| **error** | Operation failed, user impact likely | DB write failed, API 5xx, file not found |
| **warn** | Unexpected but recoverable | Retrying after failure, missing config (using default) |
| **info** | Key lifecycle events | Command invoked, resource created/deleted, settings changed |
| **debug** | Internal details for troubleshooting | Intermediate state, cache hits/misses, SQL queries |

Rules:
- Log on entry (with key params) and on failure. Use `debug` for intermediate steps.
- Never log secrets (API keys, tokens).
- Include context — `info("importing {} items from {}", count, source)` not just `info("importing")`.
-->

## Error Handling

<!-- Define your error handling strategy. Example:

- Validate at system boundaries (user input, external APIs)
- Trust internal code and framework guarantees
- Use typed errors, not string messages
- Never swallow errors silently — log or propagate
-->

## Naming

<!-- Define naming conventions. Example:

- Files: kebab-case (`user-profile.ts`)
- Components: PascalCase (`UserProfile`)
- Functions/variables: camelCase (`getUserProfile`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
-->
