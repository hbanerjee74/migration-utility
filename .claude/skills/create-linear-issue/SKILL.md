---
name: create-linear-issue
description: |
  Creates Linear issues from product thoughts, feature requests, or bug reports. Decomposes large issues into smaller ones.
  Triggers on "create issue", "log a bug", "file a ticket", "new feature", "break down <issue-id>", or "/create-issue".
---

# Create Linear Issue

You are a **coordinator**. Turn a short product thought into a clear, product-level Linear issue. Delegate all work to sub-agents via `Task`.

## Core Rules

1. **Product-level only.** No file names, component names, or architecture in the issue. Sub-agents review code for feasibility — their findings stay internal (the **INTERNAL / FOR THE ISSUE split**).

2. **Act autonomously.** Only confirm: decisions (approach, labels), destructive actions (creating labels/issues), and genuine ambiguity.

3. **Confirm before creating.** Always present the issue details (project, labels, estimate, title, description) for user approval before calling `create_issue`.

## Outcomes

Track these based on the request:

- Request understood (feature, bug, or decompose)
- Requirements drafted with user input
- Estimate confirmed
- Issue created on Linear (or child issues for decompose)

## Understand the Request

If the user provides an existing issue ID with decompose intent (e.g., "break down <issue-id>"), follow the **Decompose Path** below.

Otherwise, classify as `feature` or `bug`. Ask **at most 2** targeted clarifications. Don't ask what you can infer.

## Research and Draft

**Features:** See [feature-flow.md](references/feature-flow.md). Ask user whether to proceed directly or explore alternatives. Either way, codebase is reviewed for feasibility (internal only). If exploring, spawn parallel sub-agents for codebase + internet research, synthesize 2-3 options. User picks, requirements are written, max 2 refinement rounds.

**Bugs:** See [bug-flow.md](references/bug-flow.md). Investigate code + git history. Present user-visible symptoms, reproduction steps, and severity for confirmation.

## Estimate

See [linear-operations.md](references/linear-operations.md) for the estimate table.

**L is the maximum.** If scope exceeds L, switch to the **Decompose Path**. Present estimate to user; they can override.

## Create the Issue

Fetch projects and labels from Linear. Confirm details with user — project, labels, and estimate. Compose the issue with a clear title (short, action-oriented, under 80 chars), context, requirements, and testable acceptance criteria. Create via sub-agent using `linear-server:create_issue` (`assignee: "me"`). Return issue ID and URL.

## Decompose Path

Triggered when the user provides an existing issue ID with intent to break it down (e.g., "break down <issue-id>", "decompose <issue-id>", "split <issue-id>").

1. **Fetch**: Get the issue details and available projects/labels from Linear in parallel.
2. **Analyze & Propose**: Spawn a `feature-dev:code-explorer` sub-agent to map requirements to affected areas. Split into 2-4 child issues, each ≤ L estimate, with title, requirements subset, ACs, and estimate. Present to user for confirmation.
3. **Create**: Spawn parallel sub-agents to create each child issue (`assignee: "me"`). Reference the parent issue ID in each child's context. Update the parent issue description to list the child issues.

## Sub-agent Delegation

Follows the project's Delegation Policy in CLAUDE.md (model tiers, sub-agent rules, output caps).
