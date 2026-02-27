# Migration Utility

Tauri desktop app + headless GitHub Actions pipeline that migrates Microsoft Fabric Warehouse stored procedures to dbt models on Vibedata's platform. Targets silver and gold transformations only (bronze is out of scope).

## Architecture

| Component | What | Tech |
|-----------|------|------|
| Setup UI | Scope selection, candidacy review, table config (snapshot strategy, PII, incremental column). Persists state to SQLite; pushes finalized config to `plan.md` | Tauri + React/TypeScript + SQLite |
| Orchestrator | Reads `plan.md`, builds dependency graph, spawns sub-agents in parallel, handles BLOCKED/RESOLVED | Python + Claude Agent SDK |
| Sub-agents | Candidacy, Translation, Test Generator, Validation | Agent SDK `AgentDefinition` with scoped tools |
| dbt interaction | Lineage, compiled SQL, model execution, validation queries | dbt-core-mcp (MCP server) |
| Runtime | Headless execution, session resumption | GitHub Actions |
| State | Progress, dependencies, start/stop resumption | `plan.md` in migration repo (git-backed) |

**Source scope:** Fabric Warehouse (T-SQL stored procedures via ADF pipelines). Lakehouse/Spark is post-MVP.

## Dev Commands

```bash
# Tauri app (run from app/)
cd app && npm install
npm run dev                    # Dev mode (hot reload)
npm run build                  # Production build

# Rust tests
cd app/src-tauri && cargo test

# Frontend tests
cd app && npm run test:unit
cd app && npm run test:e2e

# Python orchestrator (run from orchestrator/)
cd orchestrator && uv sync
uv run pytest                  # All tests
uv run pytest tests/unit       # Unit tests only
```

## Testing

### When to write tests

**Tauri app:**

1. New state logic (store actions, derived state) → store unit tests
2. New Rust command with testable logic → `#[cfg(test)]` tests
3. New UI interaction → component test
4. New page or major flow → E2E test (happy path)
5. Bug fix → regression test

**Python orchestrator/agents:**

1. New agent tool or orchestration logic → pytest unit test
2. New `plan.md` parsing/state logic → pytest unit test
3. Bug fix → regression test

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
- All markdown files must pass `markdownlint` — run before committing any `.md` changes. Config at `.markdownlint.json`.

<!-- Full conventions (logging, naming, error handling) in .claude/rules/coding-conventions.md -->

## Delegation Policy

### Model tiers

| Tier | Model | When |
|---|---|---|
| Reasoning | sonnet | Planning, architecture, requirements drafting |
| Implementation | default | Coding, exploration, review, merge |
| Lightweight | haiku | Linear API calls, status updates, simple lookups |

### Sub-agent rules

- Scoped prompts with clear deliverables — prevent rabbit holes
- Commit + push before reporting completion
- Final response under 2000 characters — list outcomes, not process

### Skill lifecycle

Create → Implement → Close

- `/create-linear-issue` — research, estimate, create issue(s). Can decompose into children.
- `/implement-linear-issue` — plan, code, test, PR.
- `/close-linear-issue` — verify tests, merge PR, move to Done, clean up.

## Gotchas

<!-- List known footguns here as they emerge. -->

## Custom Skills

### /create-linear-issue

When the user runs /create-linear-issue or asks to create a Linear issue, log a bug, file a ticket,
track a feature idea, or decompose an issue into smaller ones,
read and follow the skill at `.claude/skills/create-linear-issue/SKILL.md`.

### /implement-linear-issue

When the user runs /implement-linear-issue, or mentions a Linear issue identifier (e.g. "MU-123"),
or asks to implement, build, fix, or work on a Linear issue,
read and follow the skill at `.claude/skills/implement-linear-issue/SKILL.md`.

### /close-linear-issue

When the user runs /close-linear-issue, or asks to close, complete, merge, or ship a Linear issue,
read and follow the skill at `.claude/skills/close-linear-issue/SKILL.md`.
