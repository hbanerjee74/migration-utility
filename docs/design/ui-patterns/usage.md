# Usage Tracking

Route: `/settings` → **Usage tab** — fourth tab in the Settings surface (Connections · Workspace · Reset · Usage)

## Pattern

**Summary cards + horizontal bar charts + time series + expandable run history.**
Modelled directly on the skill-builder usage page. Primary breakdown dimension is
**table** instead of skill. Secondary dimensions are phase and model.

## Data Model

Two SQLite tables, added to the existing migration utility database:

### `migration_runs`

One row per headless pipeline invocation (each press of "Launch migration").

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `workspace_id` | TEXT | FK to `workspaces` |
| `status` | TEXT | `running` / `completed` / `failed` |
| `total_tables` | INTEGER | Tables in scope at launch |
| `started_at` | TEXT | ISO 8601 |
| `completed_at` | TEXT | |
| `reset_marker` | TEXT | Set by reset; excluded from all queries |

### `agent_runs`

One row per agent invocation. Multiple rows per table (one per phase).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `migration_run_id` | INTEGER | FK to `migration_runs` |
| `table_name` | TEXT | Primary breakdown dimension |
| `schema_name` | TEXT | |
| `phase` | TEXT | `discovery` / `candidacy` / `translation` / `tests` / `validation` |
| `model` | TEXT | Full model ID (e.g. `claude-sonnet-4-6`) |
| `status` | TEXT | `running` / `completed` / `failed` / `blocked` |
| `input_tokens` | INTEGER | |
| `output_tokens` | INTEGER | |
| `cache_read_tokens` | INTEGER | |
| `cache_write_tokens` | INTEGER | |
| `total_cost` | REAL | USD |
| `num_turns` | INTEGER | |
| `tool_use_count` | INTEGER | |
| `started_at` | TEXT | |
| `completed_at` | TEXT | |
| `reset_marker` | TEXT | |

**Soft-delete on reset:** `reset_marker` is stamped on both tables when the user resets
the migration. All queries add `WHERE reset_marker IS NULL`. No rows are ever physically
deleted, preserving audit history across resets.

## Tauri Commands

| Command | Purpose |
|---------|---------|
| `persist_agent_run` | Write / update one agent run row (called on start, complete, fail) |
| `get_usage_summary` | Aggregate totals: total cost, tables migrated, avg cost per table |
| `get_usage_by_table` | Cost + run count grouped by `table_name` — primary chart data |
| `get_usage_by_phase` | Cost + run count grouped by `phase` |
| `get_usage_by_model` | Cost + run count grouped by `model` |
| `get_usage_by_day` | Daily time series (cost + tokens) |
| `get_recent_migration_runs` | Run list with per-run aggregated totals |
| `get_run_agent_runs` | Drill-down: all agent runs within one migration run |
| `get_table_names` | Distinct table names for the filter dropdown |

All read commands accept `(hide_failed: bool, start_date: Option<String>, table_name: Option<String>)`.

## Layout

```text
┌─ Filters ────────────────────────────────────────────────────────────────────┐
│  [Table: All ▼]   [7d · 14d · 30d · All ▼]   [☐ Hide failed]               │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Summary ──────────────┬───────────────────────┬──────────────────────────────┐
│  $4.82  Total spent    │  14  Tables migrated  │  $0.34  Avg cost / table     │
└────────────────────────┴───────────────────────┴──────────────────────────────┘

┌─ Cost by Table ───────────────────┐  ┌─ Cost by Phase ────────────────────────┐
│ fact_sales         ████████ $1.24 │  │ Translation   ████████████████  $2.91  │
│ silver_revenue     █████    $0.78 │  │ Tests         ████████          $1.40  │
│ dim_customer       ████     $0.61 │  │ Candidacy     ████              $0.31  │
│ gold_summary       ███      $0.55 │  │ Validation    ███               $0.14  │
│ dim_product        ██       $0.42 │  │ Discovery     █                 $0.06  │
└───────────────────────────────────┘  └────────────────────────────────────────┘

┌─ Cost Over Time ──────────────────────────────────────────────────────────────┐
│   [Cost ·  Tokens]                                                            │
│                              █                                                │
│                         █    █ █                                              │
│  ___  ___  ___  ___  ___█____█_█__  ___  ___                                 │
│  Feb 20  21  22  23  24  25  26  27  28                                       │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ Recent Migration Runs ───────────────────────────────────────────────────────┐
│ ▶  Feb 28 2026 14:32   14 tables   $4.82   completed                         │
│ ▼  Feb 24 2026 09:15   12 tables   $3.61   completed                         │
│    fact_sales      translation  completed  $0.92  claude-sonnet-4-6           │
│    silver_revenue  translation  completed  $0.74  claude-sonnet-4-6           │
│    dim_customer    tests        completed  $0.41  claude-haiku-4-5            │
│    …                                                                          │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Sections

### Filters

| Control | Behaviour |
|---------|-----------|
| Table dropdown | Populated from `get_table_names`. When set, all charts and tables scope to that table only. |
| Date range | `7d` / `14d` / `30d` / `All`. Passed as `start_date` to all commands. |
| Hide failed | Excludes `status = 'failed'` rows from aggregations. |

Changing any filter re-fetches all data in parallel (same pattern as skill-builder `fetchUsage()`).

### Summary Cards

Three cards in a row:

- **Total spent** — sum of `total_cost` across all `agent_runs` matching filters
- **Tables migrated** — count of distinct `table_name` values with at least one `completed` run
- **Avg cost / table** — total spent ÷ tables migrated

### Cost by Table

Horizontal bar chart. One row per `table_name`, sorted descending by cost. Bar width is
proportional to cost relative to the most expensive table. Label shows table name + cost +
total agent run count.

This is the primary chart — it shows which tables drove the most spend and helps the FDE
understand where agent effort is concentrated.

### Cost by Phase

Same horizontal bar layout. One row per phase in pipeline order
(Translation → Tests → Candidacy → Validation → Discovery). Translation and Tests are
typically the dominant cost phases.

### Cost Over Time

Pure-CSS bar chart (no external library). Toggle between **Cost** (USD) and **Tokens**
(input + output). Bars sized proportionally. X-axis: dates. One bar per day from
`get_usage_by_day`.

### Recent Migration Runs

Expandable list of `migration_runs`. Each collapsed row: date, table count, total cost,
status chip. Expanding fetches `get_run_agent_runs(id)` and shows one row per agent run
with: table name, phase, status, cost, model.

## Zustand Store Shape

```ts
interface UsageStore {
  summary:          UsageSummary | null
  byTable:          UsageByTable[]
  byPhase:          UsageByPhase[]
  byModel:          UsageByModel[]
  byDay:            UsageByDay[]
  recentRuns:       MigrationRunRecord[]

  // filters
  hideFailed:       boolean
  dateRange:        '7d' | '14d' | '30d' | 'all'
  tableFilter:      string | null
  tableNames:       string[]

  fetchUsage:       () => Promise<void>
  setDateRange:     (range: DateRange) => void
  setTableFilter:   (table: string | null) => void
  toggleHideFailed: () => void
}
```

## Recording Usage

Usage is recorded from the Bun sidecar manager (same pattern as skill-builder's
`agent-store.ts`):

1. **On agent start** — `persist_agent_run` with `status = 'running'`, zero tokens/cost.
2. **On agent complete** — update the row with final token counts, cost, `num_turns`,
   `tool_use_count`, and `status = 'completed'`.
3. **On agent fail / block** — update with partial data and `status = 'failed'` or
   `'blocked'`.

The `table_name`, `schema_name`, and `phase` are passed from the orchestrator's job
descriptor when each agent task is spawned, not inferred from the output.

## Components

| Component | Use |
|-----------|-----|
| `Select` | Table filter, date range |
| `Checkbox` | Hide failed toggle |
| `Card` | Summary cards, chart containers |
| `Badge` | Status chips on run rows |
| `Collapsible` | Expandable recent runs |
| `ScrollArea` | Run detail list |
| CSS bar chart | Cost by table, by phase, by model, over time — no external charting library |

## References

- skill-builder usage page — `/Users/hbanerjee/src/skill-builder/app/src/pages/usage.tsx`
- skill-builder usage store — `/Users/hbanerjee/src/skill-builder/app/src/stores/usage-store.ts`
- skill-builder Tauri usage commands — `/Users/hbanerjee/src/skill-builder/app/src-tauri/src/commands/usage.rs`
