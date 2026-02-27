# Migration Utility — Decisions

*Last updated: 2026-02-27. Decisions are grouped by reasoning chain — later decisions in each section depend on earlier ones.*

---

## 1. Scope and Target Stack

*These are the load-bearing constraints. Everything else is derived from them.*

### DEC-01 — Transformations Only
**Decision:** Silver and gold transformations only. Bronze (DLT/mirroring) is out of scope — handled by a separate utility.
**Rationale:** Bronze has a different migration path. Mixing concerns complicates both utilities.

---

### DEC-02 — Single Target: Lakehouse + Delta via dbt-fabric
**Decision:** All transformation code converts to dbt models on Lakehouse + Delta using Vibedata's dbt-fabric port. One target, no exceptions.

---

### DEC-03 — Input: Fabric Workspace Only
**Decision:** The utility takes a Fabric workspace as input and creates an isolated migration repo for all utility work. Production artifacts are never modified.

---

## 2. People and Process Boundaries

*Who does what, when, and with what authority. These constrain the tool's design surface.*

### DEC-04 — Migration is Per-Domain
**Decision:** Migration runs one domain at a time, not in bulk. The FDE performs the migration; the domain owner signs off scope only.
**Rationale:** Per-domain limits blast radius and keeps accountability with the domain owner.

---

## 3. Repo Architecture and CI/CD

*What gets created and what gets replaced.*

### DEC-05 — Production Repo to Vibedata Standards
**Decision:** A new production GitHub repo is created following Vibedata standards. This is separate from the migration repo where the utility does its work. We do not retrofit the customer's existing repo.

---

### DEC-06 — CI/CD: Replace, Not Extend
**Decision:** Customers adopt Vibedata's CI/CD and branch model. We do not extend or integrate with their existing workflows.

---

### DEC-07 — Observability: Automatic
**Decision:** No observability setup during migration. It activates automatically when the domain runs on Vibedata's standard pipelines.

---

### DEC-08 — Handoff: Utility Pushes to Production Repo Branch
**Decision:** Utility pushes completed code to a branch in the production repo. FDE opens a standard PR from there. The PR, UAT, and merge all happen in the production repo using standard Vibedata CI/CD.

---

### DEC-09 — Cutover and Legacy Retirement
**Decision:** Cutover happens on PR merge via standard Vibedata CI/CD. Legacy pipeline retirement is the domain owner's responsibility and outside the utility's scope.

---

## 4. Scoping

*Pick the tables, then evaluate the notebooks. This defines what the engine will work on.*

### DEC-10 — Scope Selection Before Candidacy
**Decision:** Domain table scope is agreed before candidacy runs. Candidacy assessment operates only on notebooks producing the selected tables.
**Rationale:** Lakehouses are not organised by domain — the utility cannot infer domain boundaries.

---

### DEC-11 — Three-Tier Candidacy Classification
**Decision:** After scope selection, a candidacy agent classifies each in-scope notebook:

| Tier | Criteria | Handling |
|------|----------|----------|
| Migrate | >70% SQL-expressible; no blocking patterns | Utility migrates automatically |
| Review | 40–70% SQL-expressible; some blocking patterns present | FDE migrates manually |
| Reject | <40% SQL-expressible; blocking patterns dominate (UDFs, row iteration, ML ops, `%run` orchestration, RDD ops) | FDE migrates manually |

**Note:** 70%/40% thresholds are a starting point — calibrate against real customer notebooks before release.

---

## 5. Execution

*Two interfaces. A Tauri desktop app handles pre-migration setup (scope, candidacy, table config) — no hosting, no auth, persists state to repo. Once the FDE triggers migration, everything runs headless via GitHub Actions + Claude Agent SDK. Execution state and agent outputs are markdown in the repo.*

### DEC-19 — Execution Runtime: GitHub Actions + Claude Agent SDK
**Decision:**

- **Setup UI (Tauri desktop app):** scope selection, candidacy review/override, table-level config (snapshot strategy, PII column confirmation, incremental column confirmation). Working state persists in local SQLite — FDE can close and reopen across days while consulting with domain owner. Once setup is finalized, Tauri pushes config into plan.md and commits to repo
- **Execution (headless):** GitHub Actions workflow in the migration repo. YAML is trivial: install deps, set env, run orchestrator script
- Orchestrator agent (Agent SDK, Python) reads plan.md, identifies ready models, spawns sub-agents via `Task` for parallel migration
- Sub-agents: candidacy, translation, test generation, validation — each defined as an `AgentDefinition` with scoped tools
- dbt-core-mcp connects as an MCP server to agents that need dbt interaction
- Session resumption via Agent SDK sessions — each workflow run resumes from prior state
- **Post-trigger interface is the repo:** plan.md for state/progress, agent outputs as markdown, BLOCKED → RESOLVED via plan.md edit + action re-trigger

---

### DEC-20 — dbt-core-mcp for Lineage, Compilation, and Validation
**Decision:**

- Agents use [dbt-core-mcp](https://github.com/NiclasOlofsson/dbt-core-mcp) as an MCP server for all dbt interactions: lineage resolution, compiled SQL retrieval, model execution, and validation queries
- Replaces custom manifest.json parsing, dbt compile/run wrappers, and SQL execution harness
- Column-level lineage (`get_column_lineage`) used for transformation validation — checks column flow, not just row counts
- Requires dbt Core 1.9+ — confirm dbt-fabricspark compatibility before build starts

**Rationale:** Eliminates ~1 week of custom dbt tooling. Lineage, compilation, and execution become MCP calls instead of shell wrappers.

---

### DEC-12 — Review/Reject: Parallel Manual FDE Track
**Decision:** Review and Reject notebooks are migrated manually by the FDE in parallel with automated migration. Both tracks converge at the PR.

---

### DEC-13 — Engine: Dependency-Aware Parallel Execution with plan.md State
**Decision:**

- Agent builds a dependency graph of Migrate-tier notebooks and generates `plan.md` as the persistent state file
- Upstream tables are auto-registered as external dbt sources from the graph
- Independent models run in parallel
- Models blocked by unresolved Review/Reject upstream dependencies are marked BLOCKED in `plan.md`
- FDE marks dependencies RESOLVED; relaunching the agent resumes from that state
- Engine's job ends when all Migrate-tier models are converted

---

## 6. Testing

*Agents test migrated models using dbt unit tests with YAML fixtures — no full table materialization required. Fixture data comes from a production snapshot.*

### DEC-14 — Testing Approach: dbt Unit Tests with YAML Fixtures
**Decision:**

- Agent generates dbt unit tests and YAML fixtures for every migrated model as part of migration
- Tests and fixtures are committed as permanent artifacts that carry into the production repo
- All testing runs on a dedicated persistent Fabric workspace using `dbt-fabricspark` (F2 PAYG with pause/resume automation)
- `dbt test --select test_type:unit` and `dbt build` run against the snapshot before the PR is raised — both must pass
- FDE reviews at PR time

**Rationale:** Models without unit tests fail Vibedata's CI coverage gates.

---

### DEC-15 — Fixture Data Source: Point-in-Time Snapshot
**Decision:**

- Fixtures are derived from a point-in-time snapshot of all tables in the dependency graph — bronze, silver, and gold
- All migration work (code generation, fixture generation) runs against this snapshot exclusively
- After migration, dbt source definitions are updated to point to live production tables

**Rationale:** Snapshotting bronze only leaves intermediate silver/gold as moving targets, making fixture data inconsistent.

---

### DEC-16 — Snapshot Strategy by Table Type

**All tables:**
- PII columns are recommended by the agent per table, confirmed by the FDE, and masked before fixture generation

**Dimensions:**
- Snapshotted in full

**Facts:**
- Sampled to 1 day on the incremental column — most recent complete day by default, FDE-overridable
- Incremental column is inferred from notebook SQL patterns and confirmed by the FDE before snapshot runs

**Downstream silver/gold:**
- Filtered to rows derivable from the 1-day fact sample

**Full-refresh tables (no incremental pattern):**
- Copied in full and flagged to the FDE

---

## 7. Validation

*Validation uses real production data in an ephemeral environment. This is standard Vibedata CI/CD — the utility does not own it.*

### DEC-17 — UAT: Parallel Run in Ephemeral Workspace
**Decision:** After the FDE opens the PR, Vibedata's CI/CD provisions an ephemeral Fabric workspace. E2E pipelines run against live production sources as a parallel run alongside legacy pipelines. The domain owner signs off.

---

## 8. Memory and Rules (Optional)

*Fully decoupled from the migration utility. Optional step after migration is complete.*

### DEC-18 — Memory Seeding: Separate Agent, Two Sources
**Decision:**

- Memory and rules creation is optional and handled by a separate agent — not part of the migration utility
- Two sources feed memory: (1) Studio reads chat history from the migration session, (2) a separate utility reads the migrated code to infer business rules and transformation patterns
- FDE and domain owner work with the agent to curate and commit memory/rules to the repo
- Business rules and domain semantics → `.claude/rules` (always in build agent context). Technical patterns → domain memory store (retrieved dynamically per intent).
