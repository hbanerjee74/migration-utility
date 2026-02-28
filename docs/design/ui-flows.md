# Migration Utility — UI Flows

Maps the FDE user journey to the surfaces and screens in the Tauri desktop app. Each flow references the requirements that drive the design decisions.

---

## Surfaces

The app has four surfaces reachable from the left icon nav at any time:

| Surface | Icon | Purpose |
|---------|------|---------|
| **Home** | House | Migration status at a glance. Entry point to setup and in-progress state. |
| **Scope** | Grid | Three-step wizard: Scope → Candidacy → Table Config. FDE navigates freely between steps. |
| **Monitor** | Waveform | Launch migration and track the running pipeline. |
| **Settings** | Gear | One-time connections and per-migration workspace config. |

---

## Flow 1 — First launch: connect and configure

**Trigger:** App opens with no prior state.

**Home** shows a "Setup required" empty state with a single CTA: *Go to Settings*.

**Settings → Connections** (one-time, safe to update at any time):

1. Authenticate with GitHub — used to clone and push to the migration repo.
2. Add the Anthropic API key — used by headless pipeline agents during execution.

**Settings → Workspace** (set once per migration, locked after launch):

1. Enter the Fabric workspace URL and service principal credentials — the source workspace containing the stored procedures to migrate (DEC-03).
2. Select or create the migration repo on GitHub — all utility work happens here; the production repo is never touched during migration (DEC-05).
3. Set the local working directory — where the migration repo is cloned. Default: `~/migration-utility`.

The app data directory (`~/.vibedata/migration-utility`) is hardcoded and stores `.claude` context, agent logs, and run history.

Once Connections and Workspace are both configured, **Home** transitions to the "Ready" state.

---

## Flow 2 — Migration setup

**Trigger:** Home is in the Ready state. FDE clicks the Scope icon.

The **Scope surface** hosts a three-step sidebar stepper. All three steps are freely navigable — the FDE can move back and forth at any point before launch. State autosaves to SQLite on every change, so the app can be closed between domain owner conversations and resume exactly where it left off.

### Step 1 — Scope

*Screen pattern: [scope.md](ui-patterns/scope.md)*

The FDE selects which tables belong to this domain migration. Tables are fetched from the Fabric workspace and displayed grouped by schema. A per-schema select-all checkbox mirrors the Fivetran schema tab pattern.

**What happens behind the scenes:** The utility only asks the FDE to select *tables* — it then traces each table back to the stored procedure that produces it using ADF pipeline definitions and write-target SQL patterns (DEC-10). Domain owners think in tables, not code artifacts.

Continue is enabled when at least one table is selected. Clicking it saves the selection and moves to Candidacy.

### Step 2 — Candidacy Review

*Screen pattern: [candidacy.md](ui-patterns/candidacy.md)*

Each resolved stored procedure is classified by a candidacy agent into one of three tiers (DEC-11):

| Tier | Criteria | What the FDE does |
|------|----------|-------------------|
| **Migrate** | >70% SQL-expressible; no blocking patterns | Nothing — utility handles it automatically |
| **Review** | 40–70% SQL-expressible; some blocking patterns | FDE migrates manually in parallel |
| **Reject** | <40% SQL-expressible; blocking patterns dominate | FDE migrates manually in parallel |

The table is filterable by tier and schema. Expanding any row shows the agent's reasoning. The FDE can override any classification via a Sheet drawer — overrides are marked with a pencil icon in the OVR column and can be changed at any time before launch.

### Step 3 — Table Config

*Screen pattern: [table-config.md](ui-patterns/table-config.md)*

The FDE confirms per-table settings using a master-detail split layout (table list on the left, config form on the right). The agent pre-populates all fields from candidacy analysis — pre-filled fields show a blue left border ("AI suggested"). Editing a field removes the indicator.

For each table the FDE confirms:

- **Table type:** Fact, Dimension, or Other — drives snapshot strategy
- **Snapshot strategy:** 1-day sample (facts) or full copy (dimensions) — DEC-16
- **Incremental column:** Inferred from stored procedure SQL; confirmed before the snapshot runs
- **PII columns:** Agent-recommended; masked before fixture generation — DEC-15, DEC-16

Each table is explicitly confirmed with a "Confirm" button. The left panel shows confirmation status (not started / opened / confirmed). Once all tables are confirmed, the FDE goes to Monitor to launch.

---

## Flow 3 — Launch and monitor

**Trigger:** All tables confirmed in Table Config. FDE navigates to Monitor.

*Screen pattern: [launch-monitor.md](ui-patterns/launch-monitor.md)*

**Monitor — Ready state:**

A pre-launch summary shows confirmed procedure and table counts across all three tiers. The "Launch migration" button writes config to `plan.md`, commits it to the migration repo, and triggers the GitHub Actions workflow (DEC-19). Once launched:

- The Scope surface locks — all three steps become read-only with an amber banner.
- Monitor transitions to the Running state.

**Monitor — Running state:**

The pipeline runs headless. The orchestrator reads `plan.md`, builds a dependency graph of Migrate-tier procedures, and spawns sub-agents in parallel (DEC-13). Monitor shows:

- **Progress bar:** procedures complete vs total.
- **Agent phases grid:** Discovery → Candidacy → Translation → Tests → Validation. Each cell shows the state of one procedure through one phase. Clicking a cell opens the log detail for that combination.
- **Log stream:** real-time output from the running agents via Tauri events.

**Handling BLOCKED procedures:**

Models that depend on an unresolved Review or Reject upstream are marked `BLOCKED` in `plan.md`. The FDE migrates the upstream manually, marks it `RESOLVED` in `plan.md`, and relaunches — the orchestrator resumes from that point without re-running completed procedures (DEC-12, DEC-13).

**Completion:**

When all Migrate-tier procedures pass `dbt test` and `dbt build` against the production snapshot (DEC-14), the utility pushes a branch to the production repo. The FDE opens a standard PR. UAT runs in Vibedata's CI/CD via an ephemeral Fabric workspace — the utility does not own this step (DEC-17, DEC-08).

---

## Flow 4 — Session resumption

**Trigger:** FDE closes the app mid-setup (between Table Config conversations with the domain owner) or mid-run (pipeline interrupted).

**On reopen:**

- If setup was in progress: Home shows "Ready" with the wizard progress summary (which steps are complete, current step progress). The Scope surface restores exactly from SQLite state.
- If the pipeline was running: Home shows "Active" with the last known procedure count from `plan.md`. Monitor shows current state parsed from `plan.md` — real-time events resume once the GitHub Actions workflow reconnects.

SQLite is the persistence layer for setup state. `plan.md` is the persistence layer for execution state — both are independent of the app process lifecycle (DEC-19).

---

## Flow 5 — Reset and start fresh

**Trigger:** FDE needs to restart a migration (wrong scope, wrong workspace, post-failure clean slate).

**Settings → Reset:**

A single destructive action with an explicit list of what gets removed:

- Migration repo branch abandoned
- Local working directory deleted
- All scope, candidacy, and table config selections cleared
- Workspace configuration cleared (Fabric URL, SP credentials, migration repo, working directory)

GitHub connection and Anthropic API key are kept — they are reusable across migrations.

After reset, Home returns to the "Ready" state (connections still configured). The FDE sets Workspace config and starts the setup flow again.

---

## Key constraints captured in the UI

| Constraint | Where it appears |
|------------|-----------------|
| One migration at a time (DEC-04) | Home shows one active migration or the setup wizard, never a list |
| Table-first scope selection (DEC-10) | Scope step selects tables; stored procedure discovery is automatic |
| FDE can override candidacy tiers | Candidacy Sheet drawer, pencil icon on overridden rows |
| Workspace locked during migration | Settings → Workspace fields disabled; amber lock badge |
| Scope locks after launch | Amber banner on Scope surface; all fields non-interactive |
| Manual Review/Reject track runs in parallel | Candidacy step shows all tiers; BLOCKED in Monitor resolves when FDE marks upstream RESOLVED |
| PII masking before fixtures | Table Config PII column confirmation required before launch |
