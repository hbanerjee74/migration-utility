---
inclusion: always
---

# Git Workflow

## Branching Strategy

- `main` — production-ready code
- Feature branches — one feature/fix per branch, branched from `main`

## Commits

**Make granular commits.** Each commit should be a single logical change that compiles and passes tests.

- One concern per commit — don't mix changes
- Descriptive messages — explain what and why, not how
- Run tests before each commit
- Stage specific files — use `git add <file>` not `git add .`

## Pull Requests

- Keep PRs focused on a single concern
- Include a clear description of changes and testing done
- Request review before merging
