# Linear Issue Updates During Implementation

## Core Rules

1. **Rewrite, don't append.** The implementation updates section is a living snapshot — not an audit log.
2. **Never remove acceptance criteria.** Check them off or add new ones.
3. **Preserve the original issue description.** Append the Implementation Updates section below it.
4. **Pass real newlines**, never `\n` escape sequences.

## What to Include

- **Status** (In Progress / Blocked / Ready for Review)
- **Branch** and **PR** (once created)
- **What was done** — brief list of completed work
- **Tests** — what was tested

Keep it concise. A fast-path S issue needs 5-10 lines, not a full report.

## Who Writes What

- **Coding agents** check off their ACs on Linear after tests pass
- **Coordinator** owns the Implementation Updates section (prevents race conditions)
- Update at meaningful checkpoints and at completion
