---
name: create-linear-issue
description: |
  Creates Linear issues from product thoughts, feature requests, or bug reports. Decomposes large issues into smaller ones.
  Triggers on "create issue", "log a bug", "file a ticket", "new feature", "break down <issue-id>", or "/create-issue".
---

# Create Linear Issue

Turn a short product thought into a clear, product-level Linear issue.

## Codex Execution Mode

See `../../rules/codex-execution-policy.md`.

## Tool Contract

Use these exact tools:

- `mcp__linear__list_issues`: dedupe search and child discovery
- `mcp__linear__get_issue`: fetch parent issue for decomposition
- `mcp__linear__list_projects`: project selection
- `mcp__linear__list_issue_labels`: label selection
- `mcp__linear__save_issue`: create/update issue(s)
- `mcp__linear__create_comment`: optional rationale notes on parent

Required fields:

- New issue via `save_issue`: `team`, `title`; include `description`, `project`, `labels`, `estimate`, `assignee: "me"` when available.
- Decomposition child issue: must include parent reference in description and AC mapping.

Fallback behavior:

- If required Linear tools are unavailable or failing after one retry, stop and report missing capability. Do not fabricate IDs, labels, or project names.

## Core Rules

1. Product-level only. No file names, component names, or architecture in issue body.
2. Confirm before creating. Always show final issue draft before `save_issue`.
3. Clarifications: ask at most 2 targeted questions. If critical requirements are ambiguous or missing, ask before creating. Do not default assumptions that can change scope or behavior.
4. Idempotency: re-runs must not duplicate equivalent issues/comments. Reuse discovered open issue when appropriate.
5. Read relevant existing code before framing requirements and ACs.
6. Acceptance criteria in Linear must use Markdown checkboxes (`- [ ] ...`).
7. Do not decompose by implementation layer (`frontend`/`backend`/`API`). Issues must represent integrated, user-visible outcomes that can be validated end-to-end.
8. Decomposition is allowed only by feature slices. Frontend-only splits are allowed only when each split is an independently testable feature outcome.
9. Every issue must contain feature requirements/spec detail, not only a goal and acceptance criteria.
10. Requirements must be precise and testable. Avoid ambiguous words like "better", "support", "handle", "improve", or "optimize" without explicit behavior.

## Outcomes

- Request understood (feature, bug, or decompose)
- Requirements drafted and estimate confirmed
- Issue created (or child issues created) with traceable ACs

## Understand the Request

- If user intent is decompose (e.g., `break down <issue-id>`), follow **Decompose Path**.
- Otherwise classify as `feature` or `bug`.

## Codebase First (required)

Before drafting requirements:

1. Read the relevant existing code paths for the requested area.
2. Identify current behavior, constraints, and likely integration points.
3. Frame requirements and ACs based on observed current behavior (not assumptions).

## Dedupe Check (required)

Before creating any issue:

1. Search open issues with `list_issues` using title/keyword query.
2. If a near-duplicate exists, present it and ask whether to reuse/update instead of creating a new one.

## Issue Schema (required)

Use this description template:

```md
## Problem
...

## Goal
...

## Requirements
- ...
- ...

## Non-goals
- ...

## Acceptance Criteria
- [ ] ...
- [ ] ...

## Risks
- ...

## Test Notes
- ...
```

## Estimate

See `references/linear-operations.md` for estimate table.

- `L` is the maximum single-issue size.
- If scope exceeds `L`, switch to decomposition.

## Create Path

1. Fetch projects and labels.
2. Read relevant existing code for the requested area.
3. Draft title, estimate, project, labels, description (schema above), including explicit requirements/spec and ensuring AC items are checkbox bullets (`- [ ] ...`).
4. Confirm draft with user.
5. Create with `mcp__linear__save_issue` (`assignee: "me"` when allowed).
6. Return issue ID + URL.

## Decompose Path

1. Fetch parent issue and available projects/labels.
2. Split into 2-4 child issues, each <= `L`.
3. Traceability rule: each child maps to exactly one AC group from parent.
4. Confirm child plan with user.
5. Create children with `save_issue` in parallel when safe.
6. Update parent description to list child IDs and AC-group mapping.

## Output Hygiene

- Never inline long command/test output into Linear issue fields.
- Keep Linear description concise and product-facing.
