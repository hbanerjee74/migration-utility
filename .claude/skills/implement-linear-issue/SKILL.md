---
name: implement-linear-issue
description: |
  Implements a Linear issue end-to-end, from planning through PR creation.
  Triggers on "implement <issue-id>", "work on <issue-id>", "working on <issue-id>", "build <issue-id>", "fix <issue-id>", or "/implement-issue".
  Also triggers when the user simply mentions a Linear issue identifier (e.g. "VD-123").
---

# Implement Linear Issue

You are a **coordinator**. Delegate all work to sub-agents via `Task`.

## Autonomy

Do not ask permission for non-destructive work. Only confirm with the user:
- The implementation plan (before execution)
- Scope changes discovered during implementation
- Final status before moving to review

## Scope Changes

When the user expands or changes scope during the conversation, update the Linear issue immediately — add new ACs, update the description. If work streams are in flight, assess whether changes invalidate their work before continuing.

## Setup (do these steps exactly)

1. Fetch the issue via `linear-server:get_issue`. Get: ID, title, description, requirements, acceptance criteria, estimate, branchName, **status**.
2. **Check for child issues:** Fetch children via `linear-server:list_issues` with `parentId` set to this issue's ID. If children exist:
   - Present the child issues (ID, title, status, estimate) to the user.
   - Ask: implement all children together in a single worktree, or just the parent?
   - If the user chooses **all children together**:
     - Use the **parent issue's branchName** for the worktree.
     - Collect requirements and ACs from all child issues (fetch each via `linear-server:get_issue`).
     - Apply status guards (step 3) to the parent and each included child — assign to me, move to In Progress.
     - During planning, present a unified plan covering all children. Map each work stream to its source child issue.
     - During implementation, check off ACs on each child's Linear issue as they're completed.
     - During completion, create a **single PR** with `Fixes <child-id>` on separate lines for each child (see `git-and-pr.md`). Move all children to Review.
   - If the user chooses **parent only**, proceed normally with just the parent issue.
3. **Guard on status:**
   - **Done / Cancelled / Duplicate** → Stop and tell the user. Do not proceed.
   - **Todo** → Assign to me + move to In Progress via `linear-server:update_issue` (`assignee: "me"`, `state: "In Progress"`).
   - **In Progress** → Already active. Skip status change (assign to me if unassigned). Resume work.
   - **In Review** → Move back to In Progress via `linear-server:update_issue`. Resume work — likely addressing review feedback or continuing the pipeline.
4. **Create a git worktree** at `../worktrees/<branchName>` using the `branchName` from the issue (or parent's branchName if implementing children together). Reuse if it already exists. All subsequent sub-agents work in this worktree path, NOT the main repo.

## Objectives

Given the issue (or set of child issues), deliver a working implementation that satisfies all acceptance criteria, passes tests, and is ready for human review. How you get there depends on the issue's complexity and constraints. Track these outcomes:

- Issue(s) assigned and worktree ready
- Plan approved by user (if full flow)
- All ACs implemented and checked off on Linear (each child issue separately if multi-child)
- Tests passing
- Code simplified and clean
- Code review passed
- Documentation updated
- PR created and linked

**Deciding your approach:**
- XS/S estimate + isolated changes → single agent implements directly. See [fast-path.md](references/fast-path.md). Skip team orchestration.
- M or larger, or multi-component → plan first, then execute in parallel. See [planning-flow.md](references/planning-flow.md) and [agent-team-guidelines.md](references/agent-team-guidelines.md).
- User can override in either direction.

**Plan approval checkpoint:**
1. Present the plan to the user. Iterate through feedback until the user says to proceed.
2. When the user approves, **post the approved plan to Linear** as a comment on the issue (via `linear-server:create_comment`) — then start coding. Linear always gets the final agreed plan, never a draft.

**During implementation:**
- Each coding agent checks off its ACs on Linear after tests pass via `linear-server:update_issue`.
- When the user changes scope or rejects an approach mid-implementation, update the Linear issue description/ACs immediately.

**After every code-changing turn** (during implementation only — formal testing happens in the quality gates):
- Flag any gaps between implemented changes and the issue's requirements/ACs. If the user agrees to adjustments, update the Linear issue.

## Post-Implementation Quality Gates

After all ACs are implemented, achieve every gate below. Plan your execution — parallelize independent gates, sequence dependent ones per the dependency graph.

### Dependency Graph

```
tests written ──→ tests passing ──→ code simplified ──→ code reviewed ──┐
                                                                        ├──→ final validation
logging compliant (independent) ────────────────────────────────────────┘
brand compliant (independent) ──────────────────────────────────────────┘
docs updated (after implementation) ────────────────────────────────────┘
```

Copy this checklist and check off gates as they pass:

```
Quality Gates:
- [ ] Tests written
- [ ] Tests passing
- [ ] Logging compliant
- [ ] Brand compliant
- [ ] Code simplified
- [ ] Code reviewed
- [ ] Docs updated
- [ ] Final validation
```

### Tests written

Ensure unit, integration, and E2E tests cover all changed behavior. Follow the project's test discipline in CLAUDE.md — update broken tests, remove redundant ones, add tests only for new behavior. Assess whether changes affect user-facing flows that warrant new Playwright E2E specs. Update `app/tests/TEST_MANIFEST.md` if new Rust commands, E2E spec files, or plugin source patterns were added.

### Tests passing

Run `npx tsc --noEmit` (from the `app/` directory) first — this catches type errors in files you didn't touch but that reference changed interfaces. Then run tests per the project's test strategy (see CLAUDE.md "Choosing which tests to run"). Max 3 attempts per failure, then escalate to user.

### Logging compliant

Verify all changed code follows the project logging guidelines (CLAUDE-APP.md § Logging):
- **Rust**: Every new `#[tauri::command]` has `info!` on entry (with key params) and `error!` on failure. Intermediate steps use `debug!`. No secrets logged.
- **Frontend**: Caught errors use `console.error()`, unexpected states use `console.warn()`, significant user actions use `console.log()`. No render-cycle or state-read logging.
- **Format**: Log messages include context — e.g. `info!("import_skills: importing {} from {}", count, repo)` not just `info!("importing")`.

If any gaps, fix them and re-run affected tests. No dependency on other gates — can run in parallel with test writing.

### Brand compliant

Verify no off-brand Tailwind color classes exist in changed frontend files. Run from the `app/` directory:

```bash
grep -rn "text-green-\|text-blue-\|text-yellow-\|text-purple-\|text-indigo-\|bg-green-\|bg-blue-\|bg-yellow-\|bg-purple-\|bg-indigo-" \
  src/components/ src/pages/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "__tests__" \
  | grep -v "text-amber"
```

If any matches found, replace with AD brand CSS variables per CLAUDE.md § Frontend Design System. The only allowed Tailwind color classes are `text-amber-*` (AD warning color) and `text-destructive` / `bg-destructive` (themed via CSS variable). All other colors must use `var(--color-pacific)`, `var(--color-seafoam)`, `var(--color-ocean)`, etc.

No dependency on other gates — can run in parallel.

### Code simplified

Spawn `code-simplifier:code-simplifier` targeting the worktree. It reviews recently changed files and simplifies for clarity, consistency, and maintainability while preserving all functionality. Fix any issues it surfaces, then re-run affected tests to confirm nothing broke.

### Code reviewed

Spawn `feature-dev:code-reviewer`. See [review-flow.md](references/review-flow.md). Max 2 review-fix cycles — fix high/medium issues, note low-severity if not straightforward.

### Docs updated

Keep project docs in sync with changes. Check `CLAUDE.md` (and its `@import` files) and any `README.md` in changed directories. Update if the changes affect documented architecture, commands, conventions, or usage. Commit doc updates separately. No dependency on simplification or review — can run in parallel.

### Final validation

Run E2E tests tagged for the changed areas. This is the last gate — it catches regressions from review fixes, simplification, and doc updates. All other gates must pass first. Fix failures. Max 3 attempts, then escalate to user.

## Completion

Enter when all pipeline phases pass.

1. Verify all ACs are checked on Linear — for every issue being implemented (parent + children if multi-child). If any missed, spawn a fix agent and re-verify.
2. Create PR and link to issue(s). See [git-and-pr.md](references/git-and-pr.md). For multi-child: single PR with `Fixes <child-id>` on separate lines for each child issue.
3. **Generate implementation notes** from the code (primary) and conversation context (supplemental):
   - Run `git log --oneline main..HEAD` and `git diff main --stat` to get what actually shipped.
   - Synthesize into a structured comment: what was implemented, files changed, key decisions made during implementation.
   - Show the notes to the user for review/edits.
   - When the user approves, post to Linear as a comment on each issue (via `linear-server:create_comment`).
4. Move issue(s) to Review via `linear-server:update_issue`. For multi-child: move all children to Review.
5. Report to user with: PR link, worktree path, recommended test mode (see [test-mode.md](references/test-mode.md)) with launch command, manual test steps from the PR test plan, and relevant E2E tags.
6. **Do NOT remove the worktree** — user tests manually on it.

## Sub-agent Delegation

Follows the project's Delegation Policy in CLAUDE.md (model tiers, sub-agent rules, output caps).

Skill-specific rules:
- Always provide the **worktree path** (not main repo path)
- Sub-agents can spawn their own sub-agents for parallelism

## Error Recovery

| Situation | Action |
|---|---|
| Sub-agent fails | Max 2 retries, then escalate to user |
| Worktree exists on wrong branch | Remove and recreate |
| Linear API fails | Retry once, then continue and note for user |
| Scope changes mid-execution | Reassess in-flight work, re-plan if needed |
| Tests fail after 3 attempts | Escalate to user with failure details |
| ACs remain unmet after fixes | Keep In Progress, report to user |
