# Lakebridge Architecture Review

*Critical analysis of Lakebridge's architecture, patterns, and code reusability for the Migration Utility. Platform-agnostic — focuses on approach, not target.*

*Date: 2026-02-27*

---

## 1. What Lakebridge Actually Is

Lakebridge is a Python CLI (99.9% Python) under `databrickslabs/lakebridge` on GitHub. It was originally BladeBridge, a commercial migration tool acquired by Databricks in Feb 2025 and open-sourced as a Databricks Labs project.

Three components, run sequentially:

1. **Assessment** (Profiler + Analyzer) — connects to source, extracts metadata, produces Excel reports on size/complexity/effort
2. **Transpiler** (3 engines) — converts source SQL to target SQL
3. **Reconciler** — validates data parity between source and target post-migration

124 stars, 88 forks, 780 commits, 33+ contributors. Last release: v0.12.2 (Feb 26, 2026). Active development.

---

## 2. License: Not Usable

**This is the most important finding.** Despite being on GitHub and marketed as "free, open source," Lakebridge uses a **custom Databricks License**, not Apache 2.0, MIT, or any OSI-approved license.

Key restriction from the LICENSE file:

> "You may not use the Licensed Materials except in connection with your use of the Databricks Services"

This means:

- You **cannot** fork it and use the code outside Databricks
- You **cannot** extract components (reconciler, analyzer) for use in a non-Databricks pipeline
- You **cannot** use it as a library in the Migration Utility
- Even studying the code and reimplementing the same patterns is legally gray if it constitutes a derived work

The Switch (LLM transpiler) plugin has its own PyPI package (`databricks-switch-plugin`) with license listed as "Other/Proprietary."

**Bottom line: Lakebridge code is not reusable. Period.** You can study the architecture for ideas, but you cannot lift code.

---

## 3. Architecture Deep Dive

### 3.1 Overall Pattern: Sequential Three-Phase Pipeline

```
Assessment → Transpilation → Reconciliation
```

Each phase is a separate CLI command (`analyze`, `transpile`, `reconcile`). No dependency graph, no parallelism across phases, no state machine connecting them. The operator runs each command manually in sequence.

**Critique:** This is a human-in-the-loop waterfall. There's no feedback loop between reconciliation failures and transpilation fixes. If validation fails, the operator manually fixes the SQL and re-runs. Compare this to Datafold's iterative LLM loop or our agent-driven BLOCKED/RESOLVED cycle.

### 3.2 Assessment (Profiler + Analyzer)

**What it does:** Connects to source via JDBC, extracts metadata (tables, views, procedures, dependencies), produces Excel workbooks with complexity scores and effort estimates.

**Architecture:**
- Factory pattern for source-specific connectors (SQL Server, Synapse, Oracle, Snowflake, Teradata, Netezza, Presto)
- `ApplicationContext` for dependency injection (workspace client, config, prompts)
- Output is static Excel reports — no structured data that feeds downstream automation

**What's good:**
- Broad source coverage (20+ technologies across SQL, ETL, orchestration)
- Complexity scoring gives humans a planning baseline

**What's missing:**
- No candidacy classification. Everything that can be transpiled is transpiled. There's no equivalent of our DEC-11 three-tier system (Migrate/Review/Reject) that filters artifacts before the engine touches them
- No table-first scoping. The tool works on code artifacts directly, not on domain tables traced back to producing artifacts
- Assessment output is Excel, not structured state. It doesn't feed into the transpiler programmatically — the human reads the report and decides what to run next

### 3.3 Transpiler (3 Engines)

This is the most architecturally interesting part. Lakebridge uses a **plugin architecture** where transpilers are separate processes communicating via **Language Server Protocol (LSP)**.

**Three engines:**

| Engine | Type | Distribution | What it does |
|--------|------|-------------|--------------|
| BladeBridge | Rule-based | Maven JAR | Mature, broad dialect coverage, handles some ETL/orchestration. Static pattern matching. |
| Morpheus | Rule-based | Maven JAR | Next-gen, fewer dialects, experimental dbt "repointing" (not full dbt generation). |
| Switch | LLM-powered | PyPI package | Uses LLMs to convert SQL to Databricks notebooks. "Multi-stage processing pipeline." Beta. |

**Plugin architecture:**
- Transpilers install as separate artifacts (JARs from Maven, wheels from PyPI) into `labs/remorph-transpilers/`
- Communication is via LSP — transpilers expose themselves as LSP servers, CLI invokes them as child processes
- `TranspileEngine` → `LSPEngine` (pluggable) or `SqlglotEngine` (fallback)
- Config-driven: `TranspileConfig` YAML specifies source dialect, target catalog/schema, validation settings
- Output: transpiled SQL files with header comments (success/failure), plus `errors.log`

**What's good:**
- The LSP plugin architecture is genuinely clever. It decouples transpiler implementation from the CLI, allows swapping engines without changing the orchestration layer, and supports multiple languages (Java transpilers via JAR, Python via wheel)
- Having multiple engines for the same task (rule-based + LLM) is a pattern worth noting
- `SqlglotEngine` as a fallback using the sqlglot library (MIT licensed, independently usable) for parsing is practical

**What's missing:**
- No iterative correction. Transpilation is one-shot: source SQL in, target SQL out. If the output is wrong, the human fixes it manually
- No dependency awareness. Files are transpiled independently. There's no graph that says "model A depends on model B, so transpile B first"
- Switch (LLM engine) is a black box. "Multi-stage processing pipeline" is the extent of the documentation. No details on prompting strategy, validation loops, or how it handles failures
- BladeBridge's core limitation (per Datafold's analysis): "relies on static pattern-matching rather than structured understanding, making it prone to failure on complex or unconventional logic"
- Morpheus "experimental dbt support" is dbt repointing (updating references), not dbt model generation. It doesn't produce `SELECT` statements with `{{ ref() }}` and `{{ source() }}` — it just adjusts catalog/schema references

### 3.4 Reconciler

**What it does:** Compares data between source and target systems at schema, row, and column levels.

**Architecture:**
- Config-driven via JSON files: table pairs, join columns, column mappings, transformations, thresholds
- Four comparison modes: `schema` (datatype compatibility), `row` (hash-based, no join columns needed), `data` (row/column with joins), `all` (combined)
- Source-specific data connectors (Oracle, Snowflake, SQL Server, Databricks, Synapse)
- Column-level transformations before comparison (SQL expressions, NULL handling)
- Threshold support: percentage-based tolerance for numeric/temporal columns
- Aggregate reconciliation: MIN, MAX, COUNT, SUM, AVG, STDDEV, VARIANCE, MEDIAN with GROUP BY
- JDBC reader options for parallel extraction (partitioning, fetch size)
- Results stored in Databricks workspace tables + dashboards

**What's good:**
- The reconciler config format is well-designed. Column mappings, per-column transformations, threshold tolerances, and filters are all declarative JSON. This is a pattern worth studying
- Hash-based row validation without requiring join columns is practical for tables without clean primary keys
- Aggregate reconciliation with GROUP BY is useful for large tables where row-level comparison is too expensive

**What's missing (per Datafold's critique):**
- "Stops short of full value-level data diffing." It detects that rows differ but doesn't pinpoint which specific columns caused the mismatch
- No feedback loop. Reconciliation results don't feed back into the transpiler. A failed reconciliation means the human investigates and manually fixes the SQL
- Results are reports, not actionable state. There's no BLOCKED/RESOLVED mechanism or agent that can act on the findings

---

## 4. Architecture Comparison (Platform-Agnostic)

Stripping away "dbt vs Databricks SQL" and focusing purely on architectural approach:

### 4.1 Orchestration Model

| Dimension | Lakebridge | Migration Utility |
|-----------|-----------|-------------------|
| Execution | Manual CLI commands, sequential | Agent orchestrator, parallel with dependency graph |
| State | None between phases; Excel reports + file system | `plan.md` — git-backed, resumable, editable |
| Parallelism | None (one file at a time per transpile run) | Dependency-aware parallel execution |
| Human interaction | Between every phase | Setup upfront (Tauri), then headless until BLOCKED |
| Feedback loops | None | Agent retries, BLOCKED/RESOLVED, iterative test-fix |
| Resumption | Re-run from scratch | Session resumption from prior state |

**Assessment:** Lakebridge is a toolkit the human operates. The Migration Utility is an agent the human supervises. Fundamentally different operating models.

### 4.2 Scoping and Candidacy

| Dimension | Lakebridge | Migration Utility |
|-----------|-----------|-------------------|
| Scope selection | Entire source environment, or manual file filtering | Table-first: pick domain tables, trace back to producing artifacts |
| Candidacy | None — everything gets transpiled | Three-tier classification (Migrate/Review/Reject) with blocking pattern detection |
| Domain awareness | None | Per-domain migration with domain owner sign-off |

**Assessment:** Lakebridge assumes everything migrates. The Migration Utility's candidacy system is a genuine differentiator — it prevents the engine from wasting cycles on artifacts that need human intervention, and surfaces this decision explicitly rather than discovering it at validation time.

### 4.3 Translation

| Dimension | Lakebridge | Migration Utility |
|-----------|-----------|-------------------|
| Engine | Rule-based (BladeBridge/Morpheus) + LLM (Switch) | LLM-based (Claude Agent SDK sub-agents) |
| Dependency awareness | None — files transpiled independently | Dependency graph drives execution order |
| Output | Raw SQL files or notebooks | dbt models with ref()/source() + tests + fixtures |
| Iteration | One-shot, human fixes failures | Agent iterates: translate → test → fix → validate |
| Context | Source SQL only | Source SQL + lineage + schema + domain memory |

**Assessment:** Lakebridge's plugin architecture for transpilers (LSP-based, swappable engines) is well-engineered infrastructure. But the single-pass, no-context translation approach is its core weakness. The Migration Utility's iterative agent loop with test feedback is architecturally stronger for handling edge cases.

### 4.4 Validation

| Dimension | Lakebridge | Migration Utility |
|-----------|-----------|-------------------|
| Approach | Post-migration reconciliation (data comparison) | Pre-merge testing (unit tests + CI validation) |
| Scope | Schema + row hash + aggregate checks | dbt unit tests (logic), then ephemeral parallel run (data) |
| When | After everything is migrated | Per-model during migration |
| Feedback | Report to human | Feeds back to translation agent |
| Persistence | Dashboard/tables in Databricks | Tests committed as permanent repo artifacts |

**Assessment:** These solve different problems. Lakebridge validates data parity after the fact. The Migration Utility validates logic correctness during migration and data parity at PR time. The Migration Utility's approach catches errors earlier and produces permanent regression tests. Lakebridge's reconciler config format (column mappings, thresholds, transforms) is worth studying as a design reference for any future data validation needs.

---

## 5. Patterns Worth Studying (Not Copying)

Given the license prohibits code reuse, these are architectural ideas to evaluate:

### 5.1 LSP-Based Plugin Architecture for Transpilers

Lakebridge's use of Language Server Protocol to decouple transpiler engines from the CLI is well-designed. Each transpiler is a separate process (JAR or Python package) communicating via LSP.

**Relevance:** The Migration Utility uses Agent SDK sub-agents for translation, which already provides process isolation and swappability. LSP would be over-engineering for our use case since our "transpiler" is an LLM agent, not a rule engine. No action needed.

### 5.2 Reconciler Config Format

The JSON-based declarative config for data reconciliation (column mappings, per-column transforms, thresholds, filters, aggregate checks) is practical and well-structured.

**Relevance:** If the Migration Utility ever adds a data reconciliation step beyond dbt unit tests and CI parallel runs, this config pattern is a good reference for how to specify table-pair comparisons declaratively. Low priority — DEC-17 already covers validation via ephemeral workspace parallel runs.

### 5.3 Multi-Engine Strategy

Having multiple translation engines (rule-based + LLM) for the same task, with the ability to swap between them, is a hedge against LLM unreliability.

**Relevance:** Currently the Migration Utility is all-LLM. If specific T-SQL patterns prove deterministic enough, a rule-based pre-pass (using sqlglot, which is MIT-licensed and independent of Lakebridge) before the LLM agent could reduce token cost and improve reliability for simple cases. Worth considering post-MVP.

### 5.4 Hash-Based Row Validation Without Join Keys

The reconciler's ability to hash entire rows for comparison without requiring explicit join columns is practical for tables with composite or unclear primary keys.

**Relevance:** Potentially useful if we add a data comparison step. Not relevant for MVP since DEC-14/DEC-17 cover testing.

---

## 6. What Lakebridge Gets Wrong

### 6.1 No Candidacy Filtering

Transpiling everything and discovering failures at validation time is wasteful. The Migration Utility's three-tier candidacy (DEC-11) is a better architecture — classify first, automate what's automatable, route the rest to humans explicitly.

### 6.2 No Feedback Loops

The sequential pipeline (assess → transpile → reconcile) has no backpressure. Reconciliation failures don't trigger re-transpilation. Translation errors don't feed back into the assessment. Each phase is fire-and-forget.

### 6.3 No Dependency Awareness

Transpiling files independently without a dependency graph means you can't validate correctness incrementally. If model A depends on model B and model B was transpiled incorrectly, you discover this only at reconciliation — after both are done.

### 6.4 Assessment Output is a Dead End

Excel reports are human-readable but not machine-actionable. The assessment doesn't produce structured data that the transpiler consumes programmatically. Contrast with `plan.md`, which is both human-readable and the orchestrator's execution state.

### 6.5 "Open Source" Marketing is Misleading

The custom Databricks License restricts usage to Databricks Services. Calling this "free, open source" in marketing while the license says otherwise is misleading. This matters because potential users and competitors may overestimate what they can do with the code.

---

## 7. Conclusions

### Can you use their code?

**No.** The Databricks License explicitly restricts usage to Databricks Services. Even if you wanted to extract the reconciler or analyzer, you legally cannot use them outside Databricks.

### Is the architecture aligned with yours?

**No, and yours is stronger.** Lakebridge is a human-operated CLI toolkit with no feedback loops, no candidacy, no dependency awareness, and no state management. The Migration Utility is an agent-supervised pipeline with all of those things. These are architecturally different categories.

### What should you take away?

1. **sqlglot** (MIT-licensed, independent of Lakebridge) is worth evaluating as a pre-pass for deterministic T-SQL → SparkSQL patterns before the LLM agent handles complex cases
2. The **reconciler config format** (column mappings, thresholds, per-column transforms) is a good design reference if you ever need declarative data validation config
3. **Datafold's Migration Agent** remains the closer architectural competitor — LLM-powered, iterative, with value-level data diffing. Watch them, not Lakebridge
4. Lakebridge's market positioning as "free migration tool" will attract customers who then hit its limitations (no dbt, no tests, no CI/CD, one-shot translation). This is an opportunity, not a threat

---

## Sources

- [databrickslabs/lakebridge (GitHub)](https://github.com/databrickslabs/lakebridge)
- [Lakebridge LICENSE](https://github.com/databrickslabs/lakebridge/blob/main/LICENSE)
- [Lakebridge Overview (docs)](https://databrickslabs.github.io/lakebridge/docs/overview/)
- [Lakebridge Reconciler Configuration](https://databrickslabs.github.io/lakebridge/docs/reconcile/reconcile_configuration/)
- [databricks-switch-plugin (PyPI)](https://pypi.org/project/databricks-switch-plugin/)
- [Lakebridge vs. Datafold (Datafold blog)](https://www.datafold.com/blog/lakebridge-alternatives)
- [Lakebridge Technical Review (Intellus Group)](https://www.intellus.group/databricks-lakebridge-what-is-it-and-how-to-use-it-to-migrate-your-legacy-data-warehouse/)
- [Lakebridge Technical Deep Dive (DeepWiki)](https://deepwiki.com/databrickslabs/lakebridge/2.2-quick-start-guide)
- [BladeBridge Acquisition (Databricks)](https://www.databricks.com/company/newsroom/press-releases/databricks-acquires-bladebridge-technology-and-talent)
