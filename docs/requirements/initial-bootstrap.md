# Initial Bootstrap Plan

Scaffold the Tauri desktop app to a working state: running app, Bun sidecar connected,
SQLite schema in place, mock data seeded, UI routing shell built, and first screen live.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri v2 |
| Frontend | React 19, TypeScript (strict), Vite 7 |
| Styling | Tailwind CSS 4, shadcn/ui, AD brand CSS variables |
| State | Zustand |
| Routing | TanStack Router |
| Agent sidecar | Bun + `@anthropic-ai/claude-agent-sdk` |
| Database | SQLite via `rusqlite` |
| Git operations | `git2` |
| HTTP (Fabric API) | `reqwest` |

---

## Phase 1 — Tauri App Scaffold

**Goal:** Running Tauri app with full frontend stack, blank screen, no errors.

### Steps

1. Initialise Tauri v2 project: `npm create tauri-app@latest` — select React + TypeScript
2. Configure `tauri.conf.json`:
   - `productName`: "Migration Utility"
   - `identifier`: "com.vibedata.migration-utility"
   - Window: `width: 1280`, `height: 800`, `minWidth: 1024`, `minHeight: 720`
3. Install frontend dependencies:
   - `react@19`, `react-dom@19`
   - `vite@7`, `@vitejs/plugin-react`
   - `typescript` (strict mode — `"strict": true`, `"noImplicitAny": true`)
   - `tailwindcss@4` + PostCSS config
   - `@tanstack/react-router`, `@tanstack/router-devtools`
   - `zustand`
4. Initialise shadcn/ui: `npx shadcn@latest init`
   - Style: Default, Base colour: Neutral (starting point only — overridden in next step)
5. Create `app/src/styles/globals.css` with AD brand CSS variables:
   - Add AD brand primitives: `--color-seafoam`, `--color-pacific`, `--color-ocean`
   - Override shadcn/ui semantic variables to use AD brand colours:
     `--primary` → pacific, `--ring` → pacific, `--destructive` stays as-is
   - Inter Variable (sans) + JetBrains Mono Variable (mono) as font stack
   - Light/dark mode via `@media (prefers-color-scheme: dark)`
   - Reference: `.claude/rules/frontend-design.md` — all UI must follow these rules
6. Verify: `npm run dev` boots, blank screen, no console errors, Tauri devtools open

---

## Phase 2 — Bun Sidecar

**Goal:** Bun sidecar running, connected to Rust via stdin/stdout JSONL, SDK ready to
receive agent requests.

### Steps

1. Create `app/sidecar/` directory with its own `package.json`
2. Port from `~/src/skill-builder/app/sidecar/`:
   - `agent-runner.ts` — entry point, SIGTERM/SIGINT handling, calls `runPersistent()`
   - `persistent-mode.ts` — stdin reader, message router, request multiplexer
   - `run-agent.ts` — calls `claude-agent-sdk` `query()`, streams responses
   - `build.js` — esbuild bundler (bundles to `dist/agent-runner.js`, copies SDK runtime)
3. Install sidecar dependencies:
   - `@anthropic-ai/claude-agent-sdk` (Bun-native)
   - `esbuild` (build-time only)
4. Add build scripts to root `package.json`:
   - `"sidecar:install"`: `cd sidecar && bun install`
   - `"sidecar:build"`: `cd sidecar && bun install && bun run build`
   - `"postinstall"`: `cd sidecar && bun install`
5. Create `app/src-tauri/src/agents/sidecar_pool.rs` — port from skill-builder:
   - Swap Node binary reference for Bun standalone binary
   - `get_or_spawn()`, `do_spawn()`, `stdout_reader`, `stderr_reader`, `heartbeat_task`
   - Keep JSONL protocol identical: `agent_request`, `stream_start`, `sidecar_ready`
6. Add Bun binaries to `tauri.conf.json` resources:
   - `bun-aarch64-apple-darwin`, `bun-x86_64-apple-darwin`
   - `bun-x86_64-unknown-linux-gnu`, `bun-x86_64-pc-windows-msvc.exe`
7. Add `sidecar/dist/` to `tauri.conf.json` resources
8. Verify: Rust can spawn sidecar, receives `{"type":"sidecar_ready"}`, ping/pong works

---

## Phase 3 — SQLite Schema

**Goal:** Schema initialised on app start, migration system in place, all tables created.

### Schema

```sql
CREATE TABLE schema_version (
  version   INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE workspaces (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  fabric_workspace_url TEXT,
  migration_repo_path TEXT NOT NULL,
  created_at          TEXT NOT NULL
);

CREATE TABLE tables (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  schema_name  TEXT NOT NULL,
  table_name   TEXT NOT NULL,
  table_type   TEXT NOT NULL CHECK(table_type IN ('fact','dimension','full_refresh','unknown'))
);

CREATE TABLE artifacts (
  id               TEXT PRIMARY KEY,
  workspace_id     TEXT NOT NULL REFERENCES workspaces(id),
  table_id         TEXT REFERENCES tables(id),
  name             TEXT NOT NULL,
  artifact_type    TEXT NOT NULL CHECK(artifact_type IN ('stored_proc')),
  sql_body         TEXT,
  adf_pipeline_ref TEXT
);

CREATE TABLE candidacy (
  artifact_id     TEXT PRIMARY KEY REFERENCES artifacts(id),
  tier            TEXT NOT NULL CHECK(tier IN ('migrate','review','reject')),
  reasoning       TEXT,
  overridden       INTEGER NOT NULL DEFAULT 0,
  override_reason  TEXT
);

CREATE TABLE table_config (
  table_id          TEXT PRIMARY KEY REFERENCES tables(id),
  pii_columns       TEXT,   -- JSON array of column names
  incremental_column TEXT,
  snapshot_strategy TEXT NOT NULL DEFAULT 'sample_1day'
    CHECK(snapshot_strategy IN ('sample_1day','full','full_flagged')),
  confirmed_at      TEXT
);
```

### Steps

1. Create `app/src-tauri/src/db/mod.rs` — opens SQLite connection, runs migrations
2. Create `app/src-tauri/src/db/migrations.rs` — version table + `V1__initial_schema.sql`
3. Call `db::init()` from `app/src-tauri/src/main.rs` on startup before window opens
4. Verify: fresh app start creates `migration-utility.db` with all tables

---

## Phase 4 — Rust Commands

**Goal:** Frontend can read and write all entities via Tauri commands.

### Commands to implement

**Workspace**

- `workspace_create(name, repo_path, fabric_url?) → Workspace`
- `workspace_get(id) → Workspace`

**Tables**

- `tables_upsert(workspace_id, rows: Vec<TableRow>) → ()`
- `tables_list(workspace_id) → Vec<Table>`

**Artifacts**

- `artifacts_upsert(workspace_id, rows: Vec<ArtifactRow>) → ()`
- `artifacts_list(workspace_id) → Vec<Artifact>`

**Candidacy**

- `candidacy_save(artifact_id, tier, reasoning) → ()`
- `candidacy_override(artifact_id, tier, reason) → ()`
- `candidacy_list(workspace_id) → Vec<CandidacyResult>`

**Table config**

- `table_config_save(table_id, pii_columns, incremental_column, snapshot_strategy) → ()`
- `table_config_get(table_id) → Option<TableConfig>`

**Plan + Git**

- `plan_write(workspace_id) → ()` — serialises state to `plan.md` in migration repo
- `git_commit_push(repo_path, message) → ()` — stages plan.md + config, commits, pushes

### File layout

```text
app/src-tauri/src/
  commands/
    workspace.rs
    tables.rs
    artifacts.rs
    candidacy.rs
    table_config.rs
    plan.rs
    git.rs
  db/
    mod.rs
    migrations.rs
  agents/
    sidecar_pool.rs
  main.rs
  lib.rs
```

---

## Phase 5 — Mock Seed Data

**Goal:** SQLite pre-populated with realistic mock scenarios so every UI screen has data
to render before Fabric import exists.

### Seed content

One workspace: `mock-workspace`, repo path points to a temp directory.

Tables and their producing stored procs (from `build-plan.md` mock scenarios):

| Table | Stored Proc | ADF Pipeline | Candidacy |
|---|---|---|---|
| `fact_sales` | `usp_load_fact_sales` (SP-01: pure T-SQL) | P-01 | Migrate |
| `dim_customer` | `usp_load_dim_customer` (SP-02: CTEs + temp tables) | P-01 | Migrate |
| `dim_product` | `usp_load_dim_product` (SP-04: MERGE SCD Type 1) | P-02 | Migrate |
| `silver_revenue` | `usp_load_silver_revenue` (SP-10: full-refresh TRUNCATE+INSERT) | P-02 | Migrate |
| `gold_summary` | `usp_load_gold_summary` (SP-03: dynamic SQL) | P-01 | Reject |

Pre-populated table config for fact_sales:

- PII columns: `["customer_email", "customer_phone"]`
- Incremental column: `load_date`
- Snapshot strategy: `sample_1day`

### Steps

1. Create `app/src-tauri/src/commands/seed.rs` — `seed_mock_data() → ()`
2. Expose as Tauri command, callable from a dev-only UI button
3. Guard with `#[cfg(debug_assertions)]` so it never ships to prod

---

## Phase 6 — UI Routing and Layout Shell

**Goal:** TanStack Router configured, 5-step wizard nav renders, steps transition correctly.

### Routes

```text
/                   → redirect to /workspace
/workspace          → Step 1: Workspace setup
/scope              → Step 2: Table scope selection
/candidacy          → Step 3: Candidacy review
/config             → Step 4: Table config (PII, incremental column, snapshot)
/launch             → Step 5: Review + launch
```

### Steps

1. Configure TanStack Router with file-based routes under `app/src/routes/`
2. Create root layout (`__root.tsx`):
   - Left sidebar: 5-step stepper nav (step name, status: pending/active/complete)
   - Main content area: `<Outlet />`
3. Create Zustand `workflowStore`:
   - `currentStep`, `completedSteps: Set<string>`
   - `workspaceId`, `selectedTableIds: string[]`
   - `setStep()`, `markComplete()`
4. Create placeholder page component for each route (step name + "coming soon")
5. Stepper nav highlights active step, shows checkmark on completed steps
6. Verify: clicking stepper nav items navigates between routes

---

## Phase 7 — Workspace Setup Screen

**Goal:** First fully working screen. FDE enters workspace details, saved to SQLite,
proceeds to scope selection.

### Steps

1. Build `WorkspaceForm` component:
   - Text input: workspace name
   - Directory picker (Tauri `dialog` plugin): migration repo path
   - Optional: Fabric workspace URL
2. On submit: call `workspace_create` Tauri command, save id to `workflowStore`
3. Redirect to `/scope` on success
4. On app start: if workspace exists in SQLite, skip to last completed step
5. Add "Load mock data" dev button (calls `seed_mock_data`) below the form

---

## Definition of Done

- [ ] `npm run dev` boots Tauri app, no errors
- [ ] Bun sidecar spawns, `sidecar_ready` received, ping/pong passes
- [ ] Fresh app start creates SQLite with correct schema
- [ ] `seed_mock_data` populates all 5 tables + stored procs + candidacy + table config
- [ ] All 5 routes render without errors
- [ ] Stepper nav reflects active and completed steps
- [ ] Workspace setup form saves to SQLite and advances to `/scope`
