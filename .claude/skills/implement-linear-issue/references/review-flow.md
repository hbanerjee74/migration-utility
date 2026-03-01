# Review Flow

## Code Review

Run a focused code review directly. Use a sub-agent only for heavyweight or parallel review.

## Fix Cycle

- **High/medium severity** → must fix
- **Low severity** → fix if straightforward, otherwise note

Spawn fix agents (parallel if touching different areas). **Max 2 review cycles** — then proceed with remaining low-severity notes.
Run fixes directly by default. Parallel fix sub-agents are optional when areas are independent.

## Completion Criteria

Before moving to Review on Linear, all of these must be true:

- Relevant tests pass
- No outstanding high-severity issues
- PR created and linked
- Linear issue updated with final notes
