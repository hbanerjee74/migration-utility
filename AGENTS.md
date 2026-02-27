# Migration Utility

Tauri desktop app + headless GitHub Actions pipeline that migrates Microsoft Fabric Warehouse stored procedures to dbt models on Vibedata's platform. Targets silver and gold transformations only (bronze is out of scope).

**Maintenance rule:** This file contains architecture, conventions, and guidelines — not product details. Do not add counts, feature descriptions, or any fact that can be discovered by reading code. If it will go stale when the code changes, it doesn't belong here — point to the source file instead.

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
cd app && npm install && npm run sidecar:build
npm run dev                    # Dev mode (hot reload)
npm run build                  # Production build

# Verify before committing
cd app && npx tsc --noEmit                                        # TypeScript check
cargo check --manifest-path app/src-tauri/Cargo.toml             # Rust check

# Frontend tests (run from app/)
npm run test                   # All Vitest tests
npm run test:unit              # Stores + lib tests only
npm run test:integration       # Component + page tests
npm run test:e2e               # All Playwright E2E tests
npm run test:e2e:workspace     # E2E filtered to @workspace tag
npm run test:changed           # Changed files only (vitest --changed)
npm run test:all               # Full suite (Vitest + Playwright)

# Rust tests
cargo test --manifest-path app/src-tauri/Cargo.toml              # all Rust tests
cargo test --manifest-path app/src-tauri/Cargo.toml commands::workspace  # module filter

# Sidecar tests (run from app/sidecar/)
npx vitest run

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

### Choosing which tests to run

Determine what you changed, then pick the right runner:

| What changed | Tests to run |
|---|---|
| Frontend store / hook | `npm run test:unit` |
| Frontend component / page | `npm run test:integration` + E2E tag from `app/tests/TEST_MANIFEST.md` |
| Rust command | `cargo test <module>` + E2E tag from `app/tests/TEST_MANIFEST.md` |
| Bun sidecar (`app/sidecar/`) | `cd app/sidecar && npx vitest run` |
| Shared infrastructure (test mocks, setup, tauri.ts) | `npm run test:all` |
| Unsure | `npm run test:all` |

Run `npx tsc --noEmit` from `app/` first — catches type errors in files you didn't directly touch.

### Updating the test manifest

Update `app/tests/TEST_MANIFEST.md` when adding new Rust commands (add cargo filter + E2E tag),
new E2E spec files, or changing shared infrastructure. Frontend test mappings are handled
automatically by `vitest --changed` and naming conventions.

## Code Style

- Granular commits: one concern per commit, run tests before each
- Stage specific files — use `git add <file>` not `git add .`
- TypeScript strict mode, no `any`
- Zustand stores: one file per store in `app/src/stores/`
- Rust commands: one module per concern in `app/src-tauri/src/commands/`
- **Error colors:** Always use `text-destructive` for error text — never hardcoded `text-red-*`

## Issue Management

- **PR title format:** `VU-XXX: short description`
- **PR body link:** `Fixes VU-XXX`

## Gotchas

- **Agent SDK has no team tools:** The Claude Agent SDK (Python) does NOT support TeamCreate, TaskCreate, or SendMessage. Use the `Task` tool for sub-agents. Multiple `Task` calls in the same turn run in parallel.
