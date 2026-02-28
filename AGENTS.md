# Migration Utility

Tauri desktop app + headless GitHub Actions pipeline that migrates Microsoft Fabric Warehouse stored procedures to dbt models on Vibedata's platform. Targets silver and gold transformations only (bronze is out of scope).

**Maintenance rule:** This file contains architecture, conventions, and guidelines — not product details. Do not add counts, feature descriptions, or any fact that can be discovered by reading code. If it will go stale when the code changes, it doesn't belong here — point to the source file instead.

## Architecture

| Layer | Technology |
|---|---|
| Desktop framework | Tauri v2 |
| Frontend | React 19, TypeScript strict, Vite |
| Styling | Tailwind CSS 4, shadcn/ui |
| State | Zustand |
| Icons | Lucide React |
| Agent sidecar | Bun + `@anthropic-ai/claude-agent-sdk` |
| Database | SQLite (`rusqlite` bundled) |
| Rust errors | `thiserror` |
| Orchestrator | Python + Claude Agent SDK (`uv` for deps) |
| dbt integration | dbt-core-mcp (MCP server) |
| Runtime | GitHub Actions (headless execution, session resumption) |
| Execution state | `plan.md` in migration repo (git-backed) |

**Source scope:** Fabric Warehouse (T-SQL stored procedures via ADF pipelines). Lakehouse/Spark is post-MVP.

## Dev Commands

```bash
# Tauri app (run from app/)
npm run dev                    # Dev mode (hot reload)
npm run build                  # Production build

# Rust tests
cargo test --manifest-path app/src-tauri/Cargo.toml   # all Rust tests
cargo test --manifest-path app/src-tauri/Cargo.toml db # module filter

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

1. New Rust command with testable logic → `#[cfg(test)]` tests
2. New state logic (store actions, derived state) → store unit tests (once stores exist)
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
| Rust command or `db.rs` | `cargo test --manifest-path app/src-tauri/Cargo.toml <module>` |
| Bun sidecar (`app/sidecar/`) | `cd app/sidecar && npx vitest run` |
| Python orchestrator / agents | `cd orchestrator && uv run pytest <module>` |
| Unsure | all of the above |

Run `npx tsc --noEmit` from `app/` first — catches type errors in files you didn't directly touch.

## Design Docs

Design notes live in `docs/design/`. Each topic gets its own subdirectory with a `README.md`
(e.g. `docs/design/orchestrator-design/README.md`). The index at `docs/design/README.md` must be
updated when adding a new subdirectory.

Write design docs concisely — state the decision and the reason, not the reasoning process. One
sentence beats a paragraph. Avoid restating what the code already makes obvious.

## Code Style

- Granular commits: one concern per commit, run tests before each
- Stage specific files — use `git add <file>` not `git add .`
- All `.md` files must pass `markdownlint` before committing (`markdownlint <file>`)
- Verify before committing: `cd app && npx tsc --noEmit` + `cargo check --manifest-path app/src-tauri/Cargo.toml`

### Naming conventions

**TypeScript** (`app/src/`): files `kebab-case`, components `PascalCase`, functions/variables `camelCase`, constants `UPPER_SNAKE_CASE`. Strict mode, no `any`.

**Python** (`orchestrator/`): files `snake_case`, classes `PascalCase`, functions/variables `snake_case`, constants `UPPER_SNAKE_CASE`. Type annotations required on all function signatures. Use `pathlib.Path`, not `os.path`. Never bare `except:`.

**Rust** (`app/src-tauri/`): standard Rust conventions enforced by `clippy`. Use `thiserror` for error types; propagate with `?`.

### Frontend (`app/src/`)

Use AD brand CSS variables — never raw Tailwind palette classes (`text-green-500`, `bg-blue-400`, etc.):

| Semantic | Usage |
|---|---|
| Primary / active | `style={{ color: "var(--color-pacific)" }}` |
| Success / complete | `style={{ color: "var(--color-seafoam)" }}` |
| Warning | `text-amber-600 dark:text-amber-400` (no CSS variable for amber) |
| Error | `text-destructive` — never `text-red-*` |
| Tinted background | `color-mix(in oklch, var(--color-pacific), transparent 85%)` |

Fonts: Inter Variable (sans) + JetBrains Mono Variable (mono) — never introduce other fonts.

State indicators use fixed icon + colour combinations. Install components from **shadcn/ui only** — no other component libraries. Use **Lucide React** for icons — no other icon library.

Zustand stores: one file per store in `app/src/stores/` (planned). Full rules: `.claude/rules/frontend-design.md`, `.claude/rules/ui-flows.md`.

### Rust backend (`app/src-tauri/`)

Every `#[tauri::command]` must:

- Log `info!` on entry with key params: `info!("command_name: key={}", val)`
- Log `error!` on failure: `error!("command_name: failed: {}", e)`
- Return `Result<T, CommandError>` where `CommandError` derives `serde::Serialize`

Commands: one module per concern in `src/commands/` (planned). Full rules: `.claude/rules/rust-backend.md`.

### Sidecar (`app/sidecar/`)

Communicates with Rust via **JSONL on stdin/stdout** — never write anything to stdout except protocol messages. Log to **stderr** only. Rebuild after edits: `npm run sidecar:build`. Full rules: `.claude/rules/agent-sidecar.md`.

### Error handling

Validate at system boundaries only (Fabric API responses, ADF JSON, dbt-core-mcp results, `plan.md` reads) — trust internal guarantees elsewhere.

- **Python:** raise typed exceptions, never swallow silently
- **TypeScript:** surface typed Tauri errors to the user via error state
- **Agent tools:** log the error and mark the affected model `BLOCKED` in `plan.md` — don't crash the orchestrator

## Issue Management

- **PR title format:** `VU-XXX: short description`
- **PR body link:** `Fixes VU-XXX`
- **Worktrees:** `../worktrees/<branchName>` relative to repo root. Full rules: `.claude/rules/git-workflow.md`.

## Skills

Use these repo-local skills when requests match:

- `.claude/skills/create-linear-issue/SKILL.md` — create/log/file a Linear issue, bug, feature, or ticket decomposition
- `.claude/skills/implement-linear-issue/SKILL.md` — implement/fix/work on a Linear issue (e.g. `VU-123`)
- `.claude/skills/close-linear-issue/SKILL.md` — close/complete/ship/merge a Linear issue
- `.claude/skills/tauri/SKILL.md` — Tauri-specific implementation or debugging
- `.claude/skills/shadcn-ui/SKILL.md` — shadcn/ui component work

## Logging

Every new feature must include logging. Use `logging` module (Python), `log` crate (Rust), and
`console.*` (frontend). Layer-specific rules are in the relevant `.claude/rules/` file.

| Level | When to use |
|---|---|
| **error** | Operation failed, user impact likely |
| **warn** | Unexpected but recoverable |
| **info** | Key lifecycle events (command invoked, agent started, plan state changed) |
| **debug** | Internal details useful only when troubleshooting |

## Gotchas

- **Agent SDK has no team tools:** The Claude Agent SDK (Python) does NOT support TeamCreate, TaskCreate, or SendMessage. Use the `Task` tool for sub-agents. Multiple `Task` calls in the same turn run in parallel.
- **Parallel worktrees:** `npm run dev` auto-assigns a free port — safe to run multiple Tauri instances simultaneously.
