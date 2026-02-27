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

## Gotchas

<!-- List known footguns here as they emerge. -->
