# Migration Utility — Build Plan

*1 engineer with Claude Code. 5 weeks to MVP.*

---

## Architecture

| Component | What | Tech |
|-----------|------|------|
| Setup UI | Scope selection, candidacy review, table config (snapshot, PII, incremental column) | Tauri + SQLite. Pushes finalized config to plan.md |
| Orchestrator | Reads plan.md, spawns sub-agents in parallel, handles BLOCKED/RESOLVED | Claude Agent SDK (Python) |
| Sub-agents | Candidacy, Translation, Test Generator, Validation | Agent SDK `AgentDefinition` with scoped tools |
| dbt interaction | Lineage, compiled SQL, model execution, validation queries | dbt-core-mcp (MCP server) |
| Runtime | Headless execution, no UI timeout | GitHub Actions (minimal YAML) |
| State | Progress, dependencies, start/stop resumption | plan.md in repo (git-backed) |

---

## Pre-Reqs

1. Claude Agent SDK (Python) + Anthropic API key
2. dbt-fabricspark adapter
3. dbt-core-mcp — confirmed compatible with dbt-fabricspark and dbt Core 1.9+
4. Fabric API service principal — workspace metadata, notebooks, table schemas
5. One real customer domain with 10+ notebooks (SQL-heavy majority)
6. Dedicated F2 PAYG workspace with pause/resume
7. Vibedata production repo template
8. GitHub Actions runner with Fabric API access and `ANTHROPIC_API_KEY` secret

---

## Timeline

| Phase | What | Weeks |
|-------|------|-------|
| 0 | Foundation — validate stack, scaffold orchestrator, create mock notebooks, define plan.md schema | 0.5 |
| 1 | MVP pipeline — scan → classify → translate → test → push (SQL-heavy only) | 3 |
| 2 | Real customer domain end-to-end + Tauri setup UI + hardening | 1.5 |
| **MVP** | **Full pipeline, SQL-heavy patterns** | **5** |
| 3 | Pattern expansion | ongoing |

### Phase 1 Breakdown

| Week | Deliverable |
|------|-------------|
| 1 | Candidacy agent — workspace scan, dependency graph (`get_lineage`), tier classification → scope.md + candidacy.md + dbt sources |
| 2 | Translation agent + test generator — N-01, N-02, N-04, N-10 → dbt model + schema.yml + unit test + YAML fixture |
| 3 | Orchestrator + snapshot pipeline + validation agent + push to prod branch → full pipeline end-to-end on mocks |

### Phase 2 Breakdown

| Week | Deliverable |
|------|-------------|
| 4 | E-01, E-02 on real notebooks. Tauri setup UI (scope, candidacy, table config) |
| 5 | E-03 session resumption. Error handling. Edge cases from real data |

### Phase 3: Pattern Expansion (ongoing)

| Pattern | Effort |
|---------|--------|
| PySpark DataFrame API (N-03) | 2–3 days |
| Mixed SQL/Python (N-05) | 1–2 days |
| `%run` references (N-06) | 1 day |
| Reject refinement (N-07, N-08, N-09) | 1 day each |

---

## Mock Scenarios

### Notebooks

| ID | Scenario | Phase |
|----|----------|-------|
| N-01 | Pure SQL — SELECT/JOIN/GROUP BY | MVP |
| N-02 | SparkSQL with temp views and CTEs | MVP |
| N-04 | Incremental MERGE (SCD Type 1/2) | MVP |
| N-10 | Full-refresh (OVERWRITE) | MVP |
| N-03 | PySpark DataFrame API | Post-MVP |
| N-05 | Mixed 70% SQL + Python string formatting | Post-MVP |
| N-06 | `%run` notebook reference | Post-MVP |
| N-07 | UDF-heavy | Post-MVP |
| N-08 | ML pipeline | Post-MVP |
| N-09 | RDD operations | Post-MVP |

### Dependency Graphs

| ID | Scenario |
|----|----------|
| G-01 | Linear: bronze → silver → gold |
| G-02 | Fan-out: 1 bronze → 3 silver → 1 gold |
| G-03 | Diamond: A → B, A → C, B+C → D |
| G-04 | Mixed tiers: Migrate depends on Review upstream |
| G-05 | Circular dependency (should error) |
| G-06 | External source (table not in any notebook) |
| G-07 | 50+ notebooks, mixed tiers |
| G-08 | Resumed session — plan.md 60% DONE, 2 BLOCKED |

### Snapshot + Fixtures

| ID | Scenario |
|----|----------|
| S-01 | Dimension, 500 rows, no PII |
| S-02 | Dimension with PII columns |
| S-03 | Fact, 10M rows, 1-day sample |
| S-04 | Ambiguous incremental column |
| S-05 | Silver derived from fact sample |
| S-07 | Full-refresh table |
| S-08 | YAML fixture — dbt compatibility |

### Test Gate

| ID | Scenario |
|----|----------|
| T-01 | Passes |
| T-02 | Unit test fails — gate blocks |
| T-03 | `dbt build` fails — gate blocks |
| T-04 | Upstream source reference |

### End-to-End

| ID | Scenario |
|----|----------|
| E-01 | 5 notebooks, all Migrate, linear chain |
| E-02 | 10 notebooks, mixed tiers, diamond |
| E-03 | Session interrupted at 40%, resumed |

---

## Key Risks

| Risk | Mitigation |
|------|------------|
| dbt-fabricspark instability | Validate Day 1 |
| dbt-core-mcp incompatible with dbt-fabricspark or dbt <1.9 | Validate Day 1 — fallback: custom wrappers (+1 week) |
| Translation quality | Eval loop Week 2 with real notebooks |
| Fabric API gaps | Week 1 — fall back to notebook export/parse |
| GitHub Actions cost | Self-hosted runner if needed |
| Real notebooks diverge from mocks | Real notebooks by Week 4 |
