# Agent Team Guidelines

Use this only for large or parallelizable work. Default execution mode is direct implementation by the coordinator.

## Team Leads

Each work stream gets a lead with: worktree path, issue ID, ACs owned, task list, and dependencies.

Leads may execute work directly and optionally use sub-agents for parallel tasks.

### Rules

- **Test deliberately, not blindly.** Before writing any test code:
  1. Read existing tests for files you changed — understand what's already covered
  2. Update tests that broke due to your changes
  3. Remove tests that are now redundant
  4. Add new tests only for genuinely new behavior
  5. Never add tests just to increase count — every test must catch a real regression
- Commit + push before reporting (conventional commit format)
- Check off your ACs on Linear after tests pass
- Report back: what completed, tests updated/added/removed, ACs addressed, blockers
- Do NOT write to the Implementation Updates section (coordinator-only)

## Failure Handling

Max 2 retries per team before escalating to user. Pause dependent streams if a blocking failure occurs.
