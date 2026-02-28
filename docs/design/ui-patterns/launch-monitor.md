# Launch Monitor

Route: `/launch` — Step 5

## Pattern

**Airflow-style agent status grid + collapsible log stream.** Procedures as rows, agent phases as columns, colored status indicators in each cell. Adapted from Apache Airflow's Grid view and GitHub Actions' workflow visualization.

## Layout

### Top — Pipeline Summary

```text
┌── Migration Run ──────────────────────────────── [Cancel]  [Re-run failed] ┐
│  Started: 2026-02-28 14:32   Duration: 4m 12s                              │
│  ████████████████░░░░░░░░░░  12 / 31 procedures complete                   │
│  31 migrate · 0 failed · 19 pending                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

Progress bar: `bg-primary` (pacific) for the filled portion. Summary line uses counts per state — not just a percentage. This is the LogRocket recommendation: "20 succeeded, 3 failed, 5 skipped" beats "65% complete".

### Middle — Agent Status Grid

```text
Procedure            | Discovery | Candidacy | Translation | Tests | Validation
usp_load_fact_sales  |    ✓      |     ✓     |      ✓      |   ✓   |  ◌ running
usp_load_dim_cust    |    ✓      |     ✓     |   ◌ running |   –   |     –
usp_load_dim_prod    |    ✓      |  ◌ running|      –      |   –   |     –
usp_silver_revenue   |  ⏱ pending|     –     |      –      |   –   |     –
usp_gold_summary     |    ✓      |     ✓     |      ✗      |   –   |     –
```

### Cell State Encoding

| State | Icon | Color |
|-------|------|-------|
| `complete` | `CheckCircle2` | `style={{ color: "var(--color-seafoam)" }}` |
| `running` | `Loader2` with `animate-spin` | `style={{ color: "var(--color-pacific)" }}` |
| `pending` | `Clock` | `text-muted-foreground` |
| `failed` | `XCircle` | `text-destructive` |
| `blocked` | `AlertTriangle` | `text-amber-600 dark:text-amber-400` |
| not applicable | empty | `bg-muted/30` |

`blocked` maps directly to the `BLOCKED` state in `plan.md` — a procedure waiting on an unresolved upstream Review/Reject dependency.

Clicking any cell opens a log detail panel for that specific agent/procedure combination.

### Bottom — Log Stream

```text
[14:32:01] ▼ Translation: usp_load_fact_sales
  [14:32:01] Reading stored procedure SQL body...
  [14:32:02] Identified pattern: incremental with watermark load_date
  [14:32:05] Generated dbt model: fact_sales.sql (47 lines)
  [14:32:05] Translation complete.
[14:32:05] ▶ Tests: usp_load_fact_sales        (collapsed — success)
[14:32:01] ▼ Candidacy: usp_load_dim_customer   (running)
  [14:32:03] Classifying... tier=migrate
```

- Fixed-height `ScrollArea` (e.g., `h-64`) with `pre`/`font-mono text-xs`
- Auto-scrolls to bottom as new lines arrive
- Phase groups use `Collapsible` — collapsed once the phase completes, showing only the summary line
- Log lines arrive via Tauri `listen()` from `@tauri-apps/api/event`, pushed by the Rust sidecar manager

## Partial Failure Handling

When any sub-agent fails:

1. Failed rows surface to the top of the grid under a sticky "Failed" section header
2. "Re-run failed" button in the top bar re-queues only failed procedures — not the full run
3. Clicking a failed cell opens the error detail: which phase failed, the error message, and a copy-to-clipboard button for the stack trace
4. Successful rows remain in place and are not re-run

This is the LogRocket recommendation: avoid replacing the entire UI with a generic error state when only part of the job failed. Show mixed results accurately.

## State Source

The grid reads from `plan.md` (git-backed) and/or real-time Tauri events from the sidecar. On page load, parse current `plan.md` state to pre-populate the grid. Live updates come via events during an active run.

## Components

| Component | Use |
|-----------|-----|
| `Progress` | Overall completion bar |
| `Table` | Agent status grid |
| `Badge` | State labels in summary bar |
| `Collapsible` | Log phase groups |
| `ScrollArea` | Log stream container |
| `Button` | Cancel, Re-run failed |
| Icons | `CheckCircle2`, `Loader2` (`animate-spin`), `XCircle`, `Clock`, `AlertTriangle` |

## References

- [Apache Airflow Grid View](https://airflow.apache.org/docs/apache-airflow/stable/ui.html)
- [GitHub Actions Workflow Visualization](https://docs.github.com/actions/managing-workflow-runs/using-the-visualization-graph)
- [dbt Cloud Run Visibility](https://docs.getdbt.com/docs/deploy/run-visibility)
- [UI Patterns for Async Workflows — LogRocket](https://blog.logrocket.com/ui-patterns-for-async-workflows-background-jobs-and-data-pipelines)
- [shadcn/ui Collapsible](https://ui.shadcn.com/docs/components/collapsible)
- [shadcn/ui Progress](https://ui.shadcn.com/docs/components/progress)
