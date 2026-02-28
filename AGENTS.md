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
| Routing | TanStack Router |
| Icons | Lucide React |
| Agent sidecar | Bun + `@anthropic-ai/claude-agent-sdk` |
| Database | SQLite (`rusqlite` bundled) |
| Git operations | `git2` |
| HTTP (Fabric API) | `reqwest` |
| Rust errors | `thiserror` |
| Orchestrator | Python + Claude Agent SDK (`uv` for deps) |
| dbt integration | dbt-core-mcp (MCP server) |
| Runtime | GitHub Actions (headless execution, session resumption) |
| Execution state | `plan.md` in migration repo (git-backed) |

**Source scope:** Fabric Warehouse (T-SQL stored procedures via ADF pipelines). Lakehouse/Spark is post-MVP.

## Dev Commands

```bash
# Tauri app (run from app/)
cd app && npm install && npm run sidecar:build
npm run dev                    # Dev mode (hot reload)
npm run build                  # Production build

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
| Python orchestrator / agents | `cd orchestrator && uv run pytest <module>` |
| Shared infrastructure (test mocks, setup, tauri.ts) | `npm run test:all` |
| Unsure | `npm run test:all` (app) + `cd orchestrator && uv run pytest` |

Run `npx tsc --noEmit` from `app/` first — catches type errors in files you didn't directly touch.

### Updating the test manifest

Update `app/tests/TEST_MANIFEST.md` when adding new Rust commands (add cargo filter + E2E tag),
new E2E spec files, or changing shared infrastructure. Frontend test mappings are handled
automatically by `vitest --changed` and naming conventions.

## Design Docs

Design notes live in `docs/design/`. Each topic gets its own subdirectory with a `README.md`
(e.g. `docs/design/orchestrator-design/README.md`). The index at `docs/design/README.md` must be
updated when adding a new subdirectory.

Write design docs concisely — state the decision and the reason, not the reasoning process. One
sentence beats a paragraph. Avoid restating what the code already makes obvious.

## Code Style

- Granular commits: one concern per commit, run tests before each
- Stage specific files — use `git add <file>` not `git add .`
- TypeScript strict mode, no `any`
- Zustand stores: one file per store in `app/src/stores/`
- Rust commands: one module per concern in `app/src-tauri/src/commands/`
- Tailwind 4 + shadcn/ui for all UI — see `.claude/rules/frontend-design.md` (auto-loaded in `app/src/`)
- **Error colors:** Always use `text-destructive` for error text — never hardcoded `text-red-*`
- Verify before committing: `cd app && npx tsc --noEmit` (frontend) + `cargo check --manifest-path app/src-tauri/Cargo.toml` (backend)

## Issue Management

- **PR title format:** `VU-XXX: short description`
- **PR body link:** `Fixes VU-XXX`

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

## UI Constraints

These rules are enforced by the design but easy to miss during implementation:

- **Scope locks after launch:** All three Scope steps (Select, Candidacy, Table Config) become read-only once a migration run is launched. Show an amber banner; disable all form fields. The surface remains navigable.
- **Workspace tab locks after launch:** Fabric URL, migration repo, and working directory fields are `disabled` once a run is active. Connections tab (GitHub, API key) stays editable.
- **Wizard forward navigation:** Blocked only when required state is missing. Validate inline — never block with a modal. Backward navigation is always free.
- **Candidacy override reason is required:** The override reason field must be non-empty before the override Sheet can save. Call `candidacy_override` command on explicit save, not debounced.
- **PII confirmation is explicit:** "Confirm table" in Table Config must be clicked before launch is allowed — auto-populated PII fields do not count as confirmed.

## Gotchas

- **Agent SDK has no team tools:** The Claude Agent SDK (Python) does NOT support TeamCreate, TaskCreate, or SendMessage. Use the `Task` tool for sub-agents. Multiple `Task` calls in the same turn run in parallel.
- **Parallel worktrees:** `npm run dev` auto-assigns a free port — safe to run multiple Tauri instances simultaneously.
