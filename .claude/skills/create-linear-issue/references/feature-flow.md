# Feature Flow

## Step 1: Proceed or Explore?

Ask the user: proceed with the stated approach, or explore alternatives first?

In both cases, the codebase is reviewed internally for feasibility. The difference is scope.

## Step 2a: Direct Path

Spawn a single `feature-dev:code-explorer` sub-agent to review the codebase and assess feasibility. It returns:

**INTERNAL (coordinator only):** feasibility, scope signal (XS/S/M/L), constraints.

**FOR THE ISSUE:** numbered requirements + checkbox ACs. Product-level only.

## Step 2b: Exploration Path

Spawn an **exploration team lead** that coordinates parallel sub-agents:

1. **Codebase analyst** (`feature-dev:code-explorer`) — feasibility, constraints, scope (internal only)
2. **External researcher** — how similar products handle this, UX patterns, backend patterns

The team lead synthesizes into 2-3 product-level options. Always include the user's original approach. No implementation details.

## Step 3: User Picks

Present options via `AskUserQuestion`.

## Step 4: Requirements Definition

Spawn a sub-agent to write requirements for the chosen approach. Same INTERNAL / FOR THE ISSUE split.

## Step 5: User Refinement

Present requirements. Max 2 rounds, then proceed.
