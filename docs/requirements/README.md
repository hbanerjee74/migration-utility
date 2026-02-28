# Migration Utility

*Read top to bottom before touching any linked document.*

---

## The Problem

Vibedata is built for greenfield. The world is brownfield.

Customers arrive with existing silver and gold transformation logic — T-SQL stored procedures in Microsoft Fabric Warehouse, orchestrated by Azure Data Factory pipelines. Until those are on Vibedata standards (dbt models, unit tests, CI/CD, lineage), none of our agents can help them. The Migration Utility is what gets them there.

Without it, migration is a manual FDE engagement measured in weeks per domain. That pace caps how many customers can onboard and how quickly they see value from the platform.

---

## What It Does

The utility migrates the users fabric warehouse to lakehouse following the Vibedata standards — one domain at a time, ready for the FDE to merge into the production repo.

**Setup (Tauri desktop app).** The FDE works through a five-step wizard on their laptop. Working state persists to local SQLite so sessions can span multiple days around domain owner conversations.

1. **Workspace** — link the Fabric workspace and migration repo
2. **Scope** — select domain tables; the utility traces each back to its producing stored procedure
3. **Candidacy** — each procedure is classified as Migrate, Review, or Reject based on SQL expressibility; the FDE can override
4. **Table config** — confirm snapshot strategy, PII columns, and incremental column per table
5. **Launch** — config is written to `plan.md`, committed to the migration repo, and the headless pipeline starts

**Execution (GitHub Actions + Claude Agent SDK).** From trigger to PR, everything runs headless. Sub-agents work in parallel across independent procedures: candidacy analysis, SQL-to-dbt translation, unit test and fixture generation, and validation against a production snapshot. The FDE monitors via `plan.md` and resolves any `BLOCKED` items before relaunching.

When all Migrate-tier procedures pass, the utility pushes a branch to the production repo. The FDE opens a standard PR. The rest of the steps follow Vibedata deploy process - UAT runs in CI via an ephemeral Fabric workspace and once signed off merge completes the cutover.

---

## Key Design Decisions

### Migration repo

All utility work happens in an isolated migration repo — the production repo is never touched during migration. When all Migrate-tier procedures pass, the utility pushes a branch to a separate production repo (created fresh to Vibedata standards). The FDE opens a standard PR from there. The migration repo is scaffolding; it doesn't ship.

### Review and Reject objects

Review and Reject procedures are not blocked on — the FDE migrates them manually in parallel with the automated track. Both tracks converge at the same PR. Models that depend on an unresolved Review/Reject upstream are marked `BLOCKED` in `plan.md`; the FDE marks them `RESOLVED` and relaunches the agent to resume.

### Data sampling

A point-in-time snapshot is taken of every table in the dependency graph (bronze through gold). Dimensions are copied in full. Facts are sampled to one day on the incremental column (most recent complete day, FDE-overridable). Downstream silver/gold rows are filtered to only those derivable from the 1-day fact sample. PII columns are masked before fixture generation. Snapshotting bronze only would leave silver/gold as moving targets, making fixtures inconsistent.

### Unit testing

Each agent-migrated model gets dbt unit tests and YAML fixtures generated as part of migration. Fixtures come from the production snapshot. Both `dbt test --select test_type:unit` and `dbt build` must pass before the PR is raised. Tests are permanent artifacts that carry into the production repo, required to pass Vibedata's CI coverage gates.

### UAT and data validation

UAT is Vibedata's standard CI/CD — the utility doesn't own it. When the FDE opens the PR, CI provisions an ephemeral Fabric workspace and runs the full E2E pipeline against live production sources as a parallel run alongside the legacy pipelines. The domain owner signs off on the output comparison before merge. Cutover happens on merge; legacy pipeline retirement is the domain owner's responsibility.

---

## Timeline

Five weeks, one engineer.

| Phase | Weeks | Deliverable |
|-------|-------|-------------|
| 0 — Foundation | 0.5 | Stack validation, orchestrator scaffold, mock scenarios, `plan.md` schema |
| 1 — MVP pipeline | 3 | Candidacy → translation → test generation → push for SQL-heavy stored procedures |
| 2 — Real customer + UI | 1.5 | End-to-end on real stored procs, Tauri setup UI, session resumption |

---

## Document Index

| Document | Purpose | What You Learn |
|----------|---------|----------------|
| [decisions.md](decisions.md) | Binding architectural decisions (DEC-01 through DEC-20) | Why specific choices were made — read before changing any architectural boundary |
| [build-plan.md](build-plan.md) | Week-by-week plan, mock scenario catalogue, risk register | What to build in what order and what could go wrong |
| [initial-bootstrap.md](initial-bootstrap.md) | Tauri app scaffold: 7 phases from blank screen to working first screen | Exact steps to get the app running with sidecar, SQLite, mock data, and routing |
| [vibedata-architecture.md](vibedata-architecture.md) | Vibedata platform architecture: modules, agents, deployment, CI/CD | The broader product this utility feeds into |
| [vibedata-strategy.md](vibedata-strategy.md) | Problem statement, personas, differentiation, metrics | Why Vibedata exists and where this utility fits |
| [research/](research/) | dbt unit test strategy, domain memory management, competitor analysis | Supporting evidence for decisions in decisions.md |
