# Project Name

<!-- Describe your project in one line. -->

<!-- Optional: import companion files for multi-component projects:
@import CLAUDE-APP.md
-->

## Dev Commands

```bash
# Add your dev, build, and test commands here
```

## Testing

### When to write tests

1. New logic → unit tests
2. New UI interaction → component tests
3. New page or major flow → E2E tests (happy path)
4. Bug fix → regression test

Purely cosmetic changes or simple wiring don't require tests. If unclear, ask the user.

### Test discipline

Before writing any test code, read existing tests for the files you changed:
1. Update tests that broke due to your changes
2. Remove tests that are now redundant
3. Add new tests only for genuinely new behavior
4. Never add tests just to increase count — every test must catch a real regression

## Code Style

- Granular commits: one concern per commit, run tests before each
- Stage specific files — use `git add <file>` not `git add .`

<!-- Coding conventions (logging, naming, error handling) live in .claude/rules/coding-conventions.md -->

## Delegation Policy

### Model tiers

| Tier | Model | When |
|---|---|---|
| Reasoning | sonnet | Planning, architecture, requirements drafting |
| Implementation | default | Coding, exploration, review, merge |
| Lightweight | haiku | API calls, status updates, simple lookups |

### Sub-agent rules

- Scoped prompts with clear deliverables — prevent rabbit holes
- Final response under 2000 characters — list outcomes, not process

## Gotchas

<!-- List known footguns and non-obvious behaviors here. -->

## Custom Skills

<!-- Register your skills here. Example:

### /my-skill
When the user runs /my-skill or asks to do X, read and follow the skill at `.claude/skills/my-skill/SKILL.md`.
-->
