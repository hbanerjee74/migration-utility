# Skip the shims — validate on real Fabric

**A dedicated Fabric workspace running dbt-fabricspark is the simplest, lowest-risk path.** It eliminates every adapter mismatch, dialect gap, and transpilation failure mode that plagues the four local alternatives. The decisive factor: Vibedata targets Fabric Lakehouse via Spark SQL, not T-SQL — which disqualifies SQL Server Docker outright and makes DuckDB transpilation a leaky abstraction rather than a guarantee. With pause/resume automation already possible via Azure APIs and Autoscale Billing for Spark now GA, the cost is **$5–20/month**, and the team inherits zero new infrastructure.

This recommendation rests on a critical architectural fact most discussions miss: the dbt adapter determines the SQL dialect, and `dbt-fabricspark` speaks Spark SQL. Every local substitute requires either transpilation into a different dialect or constraining the agent to write only portable SQL — both of which mean maintaining two concerns instead of one.

---

## Option 3 is disqualified: SQL Server speaks the wrong language

The most surprising finding in this analysis is that **Docker SQL Server + dbt-sqlserver is fundamentally incompatible** with Vibedata's target. Fabric Lakehouse uses Spark SQL via `dbt-fabricspark`, while SQL Server uses T-SQL via `dbt-sqlserver`. These are materially different dialects: `SELECT TOP 100` vs. `LIMIT 100`, `NVARCHAR(255)` vs. `STRING`, `GETDATE()` vs. `current_date()`, `BIT` vs. `BOOLEAN`, and entirely different DDL for table creation and incremental merges. Code validated against T-SQL would not run on Spark SQL.

Even if Vibedata targeted Fabric Data Warehouse (which does use T-SQL), Docker SQL Server has significant friction. The `mcr.microsoft.com/mssql/server` image is **x86-64 only** — there is no native ARM64 build. Azure SQL Edge, the previous Apple Silicon workaround, was retired in September 2025. Running via Rosetta 2 emulation on Apple Silicon Macs works but brings noticeable performance degradation, audible fan noise, and intermittent reliability issues. Add the ODBC driver 17/18 dependency, **2GB minimum RAM** hard requirement, and the community-maintained status of dbt-sqlserver (being restructured as a child adapter of dbt-fabric), and this option introduces meaningful operational surface for a problem it cannot actually solve.

---

## SQLGlot is impressive but adds a translation layer that leaks

SQLGlot is genuinely mature: **~8,900 GitHub stars**, zero open issues (actively triaged), 83 active contributors, and commercial backing from Tobiko Data (the SQLMesh creators). It handles T-SQL transpilation well — `TRY_CAST`, `DATEDIFF`, `DATEADD`, `EOMONTH`, `ISNULL`, `STRING_AGG`, window functions, and CTEs all transpile to DuckDB equivalents. The project even includes a dedicated `fabric` dialect that extends `tsql` with Fabric-specific type mappings. The `FORMAT` function with .NET-style codes and `CONVERT` with style parameters are the notable weak spots.

The problem is architectural, not technical. SQLGlot transpilation would sit *between* the migration agent's output and the validation engine, creating a pipeline: agent generates Fabric SQL → SQLGlot transpiles to DuckDB → dbt-duckdb executes. Every transpilation step is a potential source of false positives (SQLGlot silently emits best-effort translations for unsupported patterns) and false negatives (DuckDB accepts SQL that Spark SQL would reject). The `DATEDIFF` function alone demonstrates the risk: DuckDB calculates week boundaries differently from SQL Server in edge cases. SQLGlot's maintainer explicitly notes the transpiler takes an "incremental approach" where "dialect pairs may currently lack support for some inputs."

Critically, `dbt-duckdb` does **not natively include SQLGlot transpilation**. A proposed plugin (PR #544) was declined by the maintainer, who is "very wary of supporting the general SQL transpilation stuff in this project directly." You would need a custom preprocessing step or cursor plugin — adding exactly the kind of infrastructure this evaluation seeks to avoid.

---

## SQLite is a dead end for analytics validation

dbt-sqlite has **83 stars** versus dbt-duckdb's **1,200+**, and it skipped dbt-core versions 1.6 through 1.8 entirely — the adapter jumped from 1.5.x to 1.9.x. SQLite's row-oriented, single-threaded architecture runs **5–20x slower** than DuckDB on analytical queries. Its date arithmetic uses non-standard modifier syntax (`date(column, '+1 month')`) instead of standard `DATEADD`-style functions, meaning dbt's cross-database macros like `dbt.dateadd()` and `dbt.datediff()` may lack SQLite dispatch implementations. There is no native `DATE` type — dates are stored as TEXT, REAL, or INTEGER. No `GROUPING SETS`, no `TRY_CAST`, no complex types.

In every dimension — community support, SQL feature coverage, performance, dbt macro compatibility, and unit test validation — **DuckDB strictly dominates SQLite**. The only scenario where dbt-sqlite makes sense is one where DuckDB is unavailable, which is not a realistic constraint.

---

## Portable DuckDB SQL covers 85–90% but creates a dialect tax

If the migration agent is constrained to write only portable SQL using `dbt.*` cross-database macros, dbt_utils, and dbt_date, approximately **85–90% of common analytics patterns** are covered. The coverage is genuinely strong for the core operations:

- **Fully portable**: `dbt.dateadd()`, `dbt.datediff()`, `dbt.date_trunc()`, `dbt.last_day()` (replaces EOMONTH), `dbt.safe_cast()` (replaces TRY_CAST), `dbt.listagg()` (replaces STRING_AGG), `dbt.concat()`, `dbt.hash()`, `COALESCE` (replaces ISNULL), all window functions, all CTEs, all JOINs and aggregations
- **Not portable**: `FORMAT()` with .NET-style codes, `CONVERT` with style parameters, `CROSS APPLY` / `OUTER APPLY`, legacy `FOR XML PATH` string aggregation, system functions (`@@ROWCOUNT`, `NEWID()`), temp table syntax, `TOP N WITH TIES`

The 10–15% gap matters less than it appears because most non-portable patterns are legacy T-SQL idioms that *should* be modernized during migration anyway. The real cost is the **dialect tax**: every model the agent generates must be reviewed not just for correctness but for portability. The agent must know which functions to avoid, which dbt macros to substitute, and where cross-database dispatch exists. This is a persistent constraint on code generation, not a one-time setup cost.

The deeper issue: even portable SQL tested on DuckDB does not guarantee it runs on Fabric Spark. DuckDB is PostgreSQL-flavored; Fabric Lakehouse runs Spark SQL. Differences in type coercion, null handling, and function edge cases mean some models that pass DuckDB unit tests will fail on Fabric. **You still need a Fabric validation step**, which means DuckDB becomes an additional layer rather than a replacement.

---

## A persistent Fabric workspace fits Vibedata's architecture perfectly

Vibedata already provisions ephemeral Fabric workspaces per feature branch using Slim CI with defer. The custom `dbt-fabricspark` adapter runs dbt via Fabric notebooks with Livy API execution. Capacity management, workspace creation, and lakehouse provisioning are all API-driven and automated. A dedicated migration-testing workspace is *simpler* than the ephemeral workspace infrastructure already in place — it is one persistent workspace that never needs creation or teardown.

**Cost with pause/resume automation is trivial.** An F2 capacity (the minimum, 2 CUs) costs $0.36/hour on PAYG. Paused, compute billing stops completely — you pay only for OneLake storage (~$0.23/month for 10GB). With Autoscale Billing for Spark (now GA), Spark jobs are billed independently per execution, so you can keep the base capacity paused and pay only when dbt actually runs. For ~20 CI validation runs per month at 30 minutes each, the total cost is **$5–10/month**. Even left always-on during business hours (8hrs/day, weekdays), the cost is ~$63/month — roughly the price of a single SaaS tool seat.

The operational overhead is minimal. The workspace is a SaaS container — Microsoft patches and maintains everything. Pause/resume is a single Azure CLI command (`az fabric capacity suspend/resume`) or REST API call, trivially integratable into CI pipelines. The pattern is: resume capacity → trigger dbt notebook → check results → pause capacity. Vibedata's existing pipeline orchestration can handle this.

| Cost scenario | Monthly cost |
|---|---|
| Paused by default, resumed only for CI runs (~10 hrs/month) | **$5–10** |
| On during business hours only (weekdays, 8hrs/day) | **~$63** |
| Always-on F2 (simplest, no automation) | **~$263** |

---

## The simplest path: one workspace, zero shims

The recommended architecture has exactly **one moving part**: a persistent Fabric workspace on an F2 PAYG capacity, with pause/resume automation in the CI pipeline.

The migration agent generates dbt models targeting `dbt-fabricspark`. Validation runs `dbt build` (which includes unit tests before materialization) against the dedicated Fabric workspace using the exact same adapter, Spark engine, and Delta Lake format as production. There is no transpilation step, no dialect mapping, no adapter mismatch, and no "does it work on real Fabric?" question. The code that passes validation *is* the production code.

For faster feedback during agent iteration (before the full Fabric round-trip), `dbt parse` runs fully offline to validate manifest structure, YAML syntax, ref() graph integrity, and model contracts — catching structural errors in under a second with zero connection. This two-tier approach — instant offline parsing for structure, real Fabric execution for logic — gives the agent a fast inner loop and a high-fidelity outer loop without any local engine substitution.

The alternatives each introduce at least one abstraction layer that the team must maintain, debug, and trust:

- **SQLGlot + DuckDB**: transpilation accuracy + DuckDB dialect gap + custom plugin integration
- **dbt-sqlite**: inferior engine + missing macro dispatch + maintenance gaps
- **Docker SQL Server**: wrong dialect entirely (T-SQL ≠ Spark SQL) + Apple Silicon friction + ODBC dependency
- **Portable DuckDB SQL**: dialect tax on agent + DuckDB-to-Spark gap + still needs Fabric validation

None of these eliminate the need for Fabric validation; they only add a preceding step. The simplest system is the one that skips the intermediate step entirely. For a team already operating Fabric workspaces and building API-driven infrastructure, adding one more workspace with a pause button is the path with fewest moving parts, lowest maintenance burden, and highest code quality guarantee.