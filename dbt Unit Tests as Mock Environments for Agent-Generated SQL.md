# dbt unit tests as mock environments for agent-generated SQL

**dbt unit tests (GA in v1.8, May 2024) provide the strongest available specification language for validating agent-generated SQL in the analytics engineering ecosystem.** They work by injecting static mock data as CTEs into the model's SQL, executing the full transformation logic, and comparing output against expected rows — all without reading production data. The critical constraint: they still require *some* SQL execution engine, making truly connectionless validation impossible within dbt's architecture. The standard workaround is **DuckDB as an in-process, zero-infrastructure substitute** for cloud warehouses like Fabric or Snowflake, enabling fast, headless CI execution. The emerging pattern of writing unit tests first as specifications, then having AI agents generate SQL to satisfy them, is being actively promoted by dbt Labs through its MCP Server and agent-skills framework.

---

## How dbt unit tests actually work under the hood

A dbt unit test is a YAML declaration with three parts: the **model** under test, **given** inputs (mock data for every `ref()` and `source()` the model touches), and **expected** output rows. When dbt compiles a unit test, it generates a single SQL query where each mocked input becomes a CTE named `__dbt__cte__<model_name>` containing `SELECT ... UNION ALL SELECT ...` statements representing the fixture rows. The model's own SQL follows, with all `ref()` and `source()` calls rewritten to point at these CTEs instead of real tables. dbt then runs a **set-based diff query** comparing actual output against expected rows — if the diff returns zero rows, the test passes (exit code 0); any mismatch yields a structured diff and exit code 1.

```yaml
unit_tests:
  - name: test_customer_order_count
    model: dim_customers
    given:
      - input: ref('stg_customers')
        rows:
          - {customer_id: 99, name: "Test User"}
      - input: ref('stg_orders')
        rows: []                          # edge case: no orders
    expect:
      rows:
        - {customer_id: 99, number_of_orders: 0}
```

The `given` block supports three formats: **dict** (YAML dictionaries, default — only columns relevant to the test need specifying, others auto-fill as NULL), **csv** (inline or external fixture files in `tests/fixtures/`), and **sql** (raw SELECT statements, required for ephemeral model inputs). The `overrides` block allows fixing non-deterministic values by overriding macros like `is_incremental`, `current_timestamp`, project vars, and env vars — essential for making tests hermetic. Every `ref()` and `source()` in the model must appear in the `given` block, even if mocked with empty rows (`rows: []`), or dbt throws a compilation error.

Within `dbt build`, unit tests execute **before** model materialization in DAG order: unit tests → materialize → data tests. This makes them a natural pre-deployment gate. The `--select "test_type:unit"` selector isolates unit test execution, and dbt Labs explicitly recommends running unit tests only in development and CI — not production — since their static inputs make production execution wasteful.

---

## The database connection requirement and what "offline" really means

**dbt unit tests cannot run without any database connection.** The execution stack has three stages with distinct connectivity requirements. `dbt parse` reads project files, validates syntax, constructs the manifest DAG, and writes `manifest.json` — all **fully offline** with zero database access. `dbt compile` generates executable SQL but **requires a connection** because it populates the relation cache, resolves introspective queries, and handles macros that query database metadata. `dbt test` **requires a connection** because the compiled CTE-based SQL must execute against a real SQL engine to produce the actual-vs-expected comparison.

| Command | Connection needed | What it does |
|---------|:-:|---|
| `dbt parse` | No | Validates syntax, builds manifest |
| `dbt compile` | Yes | Generates executable SQL |
| `dbt test` | Yes | Executes test SQL, compares results |

A GitHub issue (#10292) revealed that dbt needs column metadata (names and data types) from the database even for mocked inputs, confirming the connection is structural, not just incidental. The `--no-populate-cache` and `--no-introspect` flags reduce but do not eliminate connection requirements during compilation.

**For Microsoft Fabric specifically**, there is no offline mode or mock connection available in the `dbt-fabric` adapter. The only options are a live Fabric workspace connection (with service principal auth for CI) or the DuckDB substitution pattern described below — which only works if the SQL is dialect-portable and avoids T-SQL-specific syntax.

---

## DuckDB as the lightweight CI engine pattern

The established community pattern for warehouse-free unit testing uses **dbt-duckdb** as an embedded, in-process OLAP engine. DuckDB runs entirely within the Python process with zero external dependencies, satisfying dbt's connection requirement without any cloud infrastructure. The minimal profile is strikingly simple:

```yaml
# profiles.yml for CI
my_project:
  target: ci
  outputs:
    ci:
      type: duckdb
      path: ":memory:"    # in-memory, zero persistence
```

A complete GitHub Actions workflow installs `dbt-core` and `dbt-duckdb` via pip, runs `dbt build --select test_type:unit`, and completes in seconds. No credentials, no network access, no cloud costs. The `--empty` flag (new in v1.8) can create schema-only parent models via `dbt run --select "parent_models" --empty`, further minimizing overhead.

**The critical caveat is SQL dialect divergence.** DuckDB's SQL is PostgreSQL-flavored, while Fabric uses T-SQL and Snowflake uses its own dialect. Warehouse-specific functions (`QUALIFY`, `FLATTEN`, `TRY_CAST` T-SQL variants, Fabric's specific date functions) will fail on DuckDB. Cross-database macro packages like `dbt_utils` and `dbt_date` help write portable SQL, but teams heavily invested in platform-specific syntax face a real gap. A dbt Labs team member confirmed in GitHub Discussion #8275: *"If you want to run the tests with 0 DW cost, on DuckDB for example, you could write your models so that they work independently of the data warehouse, leveraging cross database macros."* This trade-off between dialect portability and local testability is the central architectural decision for teams adopting this pattern.

---

## Unit tests as specifications for agent-generated code

The most compelling emerging pattern treats dbt unit tests as **executable specifications** that agent-generated SQL must satisfy — classic test-driven development applied to data transformations. The workflow operates as a feedback loop: a human (or AI assistant) writes unit test YAML defining input-output contracts, the code generation agent reads the specification, generates SQL to satisfy it, runs `dbt test --select test_type:unit`, reads any diff output on failure, modifies the SQL, and retries until all tests pass. The human then reviews both the specification and the implementation.

**dbt Labs is actively building toward this pattern.** The **dbt MCP Server** (GA as a remote server, announced at Coalesce 2025, adopted by over 900 data teams) exposes `build`, `compile`, `test`, `get_resource_info`, and `execute_sql` operations to AI agents via the Model Context Protocol. The companion **dbt-agent-skills** package on skills.sh provides structured instructions for AI agents including an explicit `adding-dbt-unit-test` skill with Gherkin-style scenario descriptions. The community-built **dbt-core-mcp** server by Niclas Olofsson further specializes this for TDD workflows, enabling agents to inspect dependencies, query sample data for realistic fixtures, and run targeted tests with fast iteration.

The three-layer defense for agent-generated code combines **model contracts** (structural validation — column names, types, not-null constraints enforced at build time), **unit tests** (logic validation — transformation correctness on mock data), and **data tests** (quality validation — assertions on materialized production data). Contracts catch structural drift, unit tests catch logic errors, and data tests catch data quality issues that static fixtures can't anticipate. For an agent generating SQL, the first two layers provide the tightest feedback loop since they don't depend on production data state.

---

## Structuring a project for test-driven agent workflows

Best practices for organizing dbt unit tests as the primary validation layer center on keeping specifications close to but distinct from implementation. Unit test YAML files must live in `models/` (or a configured model-path directory). The recommended pattern co-locates test YAML alongside model SQL files, though some practitioners advocate a parallel `unit_tests/` directory mirroring the model structure — which separates specification from implementation, a natural fit when tests are authored before code.

Effective unit tests focus on **complex transformation logic** — regex operations, date math, window functions, long CASE WHEN chains, and custom business rules. They should not test built-in warehouse functions or simple pass-through columns. Edge case coverage is critical: explicit null values, empty input sets (`rows: []`), type boundary conditions, and both incremental and full-refresh modes for incremental models. Non-deterministic elements must be pinned via `overrides` — timestamps, invocation IDs, and any macro that reads runtime state.

```bash
# CI pipeline commands
dbt test --select test_type:unit              # validate all logic specs
dbt test --select "state:modified,test_type:unit"  # only changed models
dbt build --exclude-resource-type unit_test    # production (skip unit tests)
```

The `state:modified` selector in CI runs unit tests only for models changed in the current PR, keeping feedback loops fast. The `--exclude-resource-type unit_test` flag in production skips unit tests entirely since their static inputs provide no value against live data.

---

## Conclusion: a strong but imperfect validation layer

dbt unit tests are the best-positioned tool in the analytics engineering ecosystem for validating agent-generated SQL. Their YAML-based input-output contract format is naturally machine-readable, their CTE-injection mechanism provides genuine logic isolation, and the surrounding MCP tooling creates a viable automated test-run-fix loop. The **DuckDB pattern makes CI execution practical** at near-zero cost and zero infrastructure, though dialect portability remains a real constraint for teams using warehouse-specific SQL features. The key architectural insight is that `dbt parse` works fully offline for manifest validation, but any SQL execution — including unit tests — requires at least a lightweight engine like DuckDB. For Fabric-specific projects, the choice is between maintaining dialect-portable SQL (enabling DuckDB CI) or requiring a live Fabric connection in CI. The specification-first pattern where tests precede implementation is not yet industry-standard, but dbt Labs' investment in MCP servers, agent skills, and dbt Agents signals this is the intended direction for AI-assisted analytics engineering.