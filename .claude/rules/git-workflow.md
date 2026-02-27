# Git Workflow

## Worktrees

Worktrees live at `../worktrees/<branchName>` relative to the repo root, preserving the full branch name including the `feature/` prefix.

Example:

- Branch: `feature/vu-354-scaffold-tauri-app-with-full-frontend-stack`
- Worktree path: `/Users/hbanerjee/src/worktrees/feature/vu-354-scaffold-tauri-app-with-full-frontend-stack`

Pre-create the parent directory before adding the worktree:

```bash
mkdir -p /Users/hbanerjee/src/worktrees/feature
git worktree add /Users/hbanerjee/src/worktrees/feature/<branch-name> <branch-name>
```

## PR Format

- Title: `MU-XXX: short description`
- Body: `Fixes MU-XXX` (one line per issue for multi-issue PRs)
