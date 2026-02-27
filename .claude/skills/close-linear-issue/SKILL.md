---
name: close-linear-issue
description: |
  Closes a completed Linear issue after testing. Merges the PR, moves the issue to Done, and cleans up.
  Triggers on "close <issue-id>", "complete <issue-id>", "merge <issue-id>", "ship <issue-id>", or "/close-issue".
---

# Close Linear Issue

You are a **coordinator**. Orchestrate sub-agents via `Task` — do not run git commands or resolve conflicts yourself.

## Autonomy

Proceed autonomously. Only confirm with the user:
- Unverified test plan items (Verify)
- Merge conflicts that require human judgment (Merge)

## Outcomes

Track these based on the issue's state:

- Issue, PR, and worktree identified
- Test plan verified (or user accepted risk)
- PR merged into main
- Linear issue moved to Done
- Worktree and branches cleaned up

## Identify

Gather the issue details, its PR, and its worktree location. Use the issue's `gitBranchName` to find the PR (`gh pr list --head`) and match the worktree (expected at `../worktrees/<gitBranchName>`).

If already **Done**, skip to Close (cleanup only). If no PR exists, stop.

**Check for child issues:** Fetch children via `linear-server:list_issues` with `parentId` set to this issue's ID. Categorize each non-Done child:

| Child state | Action |
|---|---|
| Already Done | Skip — nothing to do |
| On the same PR (`Fixes <child-id>` found in PR body) | Close together with parent — automatic, no confirmation needed |
| Not Done + not on the same PR | **Blocker** — parent cannot be closed. Stop and report which children are blocking. |

If blockers exist, stop and tell the user: "Cannot close parent — these children are still open and not on this PR: [list]. Close them first or include them in the PR."

Report to user: issue status, PR URL, worktree path, and child issue disposition.

## Verify Test Plan

Fetch the PR body and check the **## Test plan** section. If all checkboxes are checked, proceed. If unchecked items exist, show them to the user and ask how to proceed — they may confirm all verified (check them off on the PR), defer to test now, report issues needing fixes, or skip. If no test plan section is found, warn the user and ask whether to proceed without one.

## Merge (do these steps exactly)

Spawn a **single `general-purpose` sub-agent** with the worktree path, `gitBranchName`, and PR number. It must:

1. Rebase the branch onto `origin/main` (from the worktree directory)
2. If conflicts occur, attempt to resolve. Escalate to coordinator (who asks the user) if human judgment is needed.
3. Run `npx tsc --noEmit` (from the `app/` directory in the worktree) — catches type errors introduced by rebase or missed during implementation. If errors found, fix them, commit, and re-run until clean.
4. Push with `--force-with-lease`
5. Wait for required CI to pass (`gh pr checks --watch --required`)
6. Merge the PR with `--delete-branch` (prefer squash if allowed)
7. Return: merge commit SHA

If CI or merge fails, report to user and stop.

## Close (do these steps exactly)

Run in **parallel** (two `Task` calls in one turn):

- Move **all issues** to **Done**: The primary issue plus every `Fixes <issue-id>` from the PR body (which includes same-PR children identified earlier). Move each to Done via `linear-server:update_issue` and add a closing comment via `linear-server:create_comment` with the PR URL and merge commit. (model: `haiku`)
- From the **main repo directory** (not the worktree): remove the worktree with `git worktree remove --force` (needed because build caches like `.vite/` are gitignored but still present on disk), delete the local branch, delete the remote branch (`git push origin --delete <branchName>` — do NOT rely on `--delete-branch` from the merge step), pull latest main. If the worktree directory still exists after removal, report back — coordinator will ask user before taking further action.

Report to user: issue closed, PR merged, worktree and branches removed.

## Sub-agent Delegation

Follows the project's Delegation Policy in CLAUDE.md (model tiers, sub-agent rules, output caps).

## Error Recovery

| Situation | Action |
|---|---|
| No PR found | Stop, tell user to create one via implement skill |
| No worktree found | Skip worktree cleanup, continue with PR and Linear |
| CI fails after rebase | Stop, report failing checks, let user decide |
| Merge conflicts | Sub-agent attempts resolution; escalates to user if needed |
| Issue already Done | Skip Linear update, proceed with cleanup only |
| Open child not on same PR | Stop — parent cannot be closed until child is resolved |
| Worktree has uncommitted changes | Ask user before force-removing |
| Multiple PRs for branch | Use most recent open PR |
