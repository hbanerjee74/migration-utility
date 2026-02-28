# Migration Utility

*Read top to bottom before touching any linked document.*

---

## The Problem

Vibedata is built for greenfield. The world is brownfield.

Customers arrive with existing silver and gold transformation logic — T-SQL stored procedures in Microsoft Fabric Warehouse, orchestrated by Azure Data Factory pipelines. Until those are on Vibedata standards (dbt models, unit tests, CI/CD, lineage), none of our agents can help them. The Migration Utility is what gets them there.

Without it, migration is a manual FDE engagement measured in weeks per domain. That pace caps how many customers can onboard and how quickly they see value from the platform.

---

## What It Does

The utility migrates a Fabric Warehouse to Lakehouse following Vibedata standards — one domain at a time, ready for the FDE to merge into the production repo.

**Setup (Tauri desktop app).** The FDE works through a wizard on their laptop. State persists to local SQLite so sessions can span multiple days around domain owner conversations.

**Execution (GitHub Actions + Claude Agent SDK).** From trigger to PR, everything runs headless. Sub-agents work in parallel across independent procedures: candidacy analysis, SQL-to-dbt translation, unit test and fixture generation, and validation against a production snapshot. The FDE monitors via `plan.md` and resolves any `BLOCKED` items before relaunching.

When all Migrate-tier procedures pass, the utility pushes a branch to the production repo. The FDE opens a standard PR. UAT runs in CI via an ephemeral Fabric workspace; once signed off, merge completes the cutover.

---

## FDE User Journey

The FDE works through four surfaces in the Tauri app. Full screen-level detail is in [docs/design/ui-patterns/README.md](../design/ui-patterns/README.md).

### Surfaces

| Surface | Purpose |
|---------|---------|
| **Home** | Status at a glance. Routes the FDE to the right next step. Three states: Setup required / Ready (wizard progress) / Active (pipeline running). |
| **Scope** | Three-step wizard: Scope → Candidacy → Table Config. Freely navigable before launch; locked read-only after. |
| **Monitor** | Launch the migration and track it. Ready state → Running state on launch. |
| **Settings** | Connections (one-time) · Workspace (per-migration) · Reset · Usage (cost tracking). |

### Key journeys

**First launch:** Home shows "Setup required". FDE goes to Settings → Connections (GitHub + Anthropic API key), then Settings → Workspace (Fabric URL, SP credentials, migration repo, working directory). Once both are configured, Home shows Ready.

**Migration setup:** FDE opens Scope. Step 1 selects domain tables — the utility traces each back to its producing stored procedure (DEC-10). Step 2 shows candidacy results (Migrate / Review / Reject) with FDE override (DEC-11). Step 3 confirms per-table snapshot strategy, incremental column, and PII columns (DEC-15, DEC-16).

**Launch:** All tables confirmed → FDE opens Monitor → clicks "Launch migration". Config is written to `plan.md`, committed, and the GitHub Actions workflow starts (DEC-19). Scope locks. Monitor shows agent phases grid, progress bar, and log stream. BLOCKED procedures (depending on unresolved Review/Reject upstreams) are resolved by the FDE marking the upstream `RESOLVED` in `plan.md` and relaunching (DEC-12, DEC-13).

**Session resumption:** SQLite owns setup state; `plan.md` owns execution state. Both survive process restart. Home restores to the correct state on reopen (DEC-19).

**Reset:** Settings → Reset clears the migration repo branch, local working directory, scope selections, and workspace config. GitHub and Anthropic credentials are kept.

### UI constraints

| Constraint | Requirement |
|------------|-------------|
| One migration at a time — Home shows one active migration, never a list | DEC-04 |
| Table-first scope selection — stored procedure discovery is automatic | DEC-10 |
| Workspace locked while pipeline is running | DEC-19 |
| Scope locked (read-only) after launch | DEC-19 |
| Review/Reject procedures migrated manually in parallel; BLOCKED resolves when upstream is RESOLVED | DEC-12 |

---

## Key Design Decisions

### Migration repo

All utility work happens in an isolated migration repo — the production repo is never touched during migration. When all Migrate-tier procedures pass, the utility pushes a branch to the production repo (created fresh to Vibedata standards). The FDE opens a standard PR. The migration repo is scaffolding; it doesn't ship.

### Review and Reject objects

Review and Reject procedures are not blocked on — the FDE migrates them manually in parallel with the automated track. Both tracks converge at the same PR. Models that depend on an unresolved Review/Reject upstream are marked `BLOCKED` in `plan.md`; the FDE marks them `RESOLVED` and relaunches to resume.

### Data sampling

A point-in-time snapshot is taken of every table in the dependency graph (bronze through gold). Dimensions are copied in full. Facts are sampled to one day on the incremental column (most recent complete day, FDE-overridable). Downstream silver/gold rows are filtered to only those derivable from the 1-day fact sample. PII columns are masked before fixture generation.

### Unit testing

Each agent-migrated model gets dbt unit tests and YAML fixtures generated as part of migration. Fixtures come from the production snapshot. Both `dbt test --select test_type:unit` and `dbt build` must pass before the PR is raised. Tests are permanent artifacts that carry into the production repo, required to pass Vibedata's CI coverage gates.

### UAT and data validation

UAT is Vibedata's standard CI/CD — the utility doesn't own it. When the FDE opens the PR, CI provisions an ephemeral Fabric workspace and runs the full E2E pipeline against live production sources as a parallel run alongside the legacy pipelines. The domain owner signs off on the output comparison before merge.

---

## Document Index

| Document | Purpose |
|----------|---------|
| [decisions.md](decisions.md) | Binding architectural decisions (DEC-01 through DEC-20). Read before changing any architectural boundary. |
| [build-plan.md](build-plan.md) | Week-by-week plan, mock scenario catalogue, risk register. |
| [../design/ui-patterns/README.md](../design/ui-patterns/README.md) | Surfaces, user flows, screen patterns, and interactive mockup. |
| [research/vibedata-architecture.md](research/vibedata-architecture.md) | Vibedata platform architecture: modules, agents, deployment, CI/CD. |
| [research/vibedata-strategy.md](research/vibedata-strategy.md) | Problem statement, personas, differentiation, metrics. |
| [research/](research/) | dbt unit test strategy, domain memory management, competitor analysis. |
