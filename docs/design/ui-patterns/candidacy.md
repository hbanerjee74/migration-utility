# Candidacy Review

Route: `/candidacy` — Step 3

## Pattern

**Filterable data table with inline row expansion and a Sheet drawer for overrides.** Modelled on dbt Cloud run history (status badges, drill-down) and PatternFly's faceted filter toolbar.

## Layout

```text
Toolbar:
[Search procedures...]  [Tier: All ▼]  [Schema: All ▼]  [☐ Overrides only]
                              47 procedures · 31 migrate · 8 review · 8 reject

Table:
┌────────────────────────────────────────────────────────────────────────────────┐
│  Stored Procedure ↕    Table Written ↕   Schema ↕   Tier ↕   OVR   Actions     │
├────────────────────────────────────────────────────────────────────────────────┤
│  usp_load_fact_sales   fact_sales        dbo        migrate         [Override] │
│  usp_load_dim_cust     dim_customer      dbo        migrate   ✏    [Override]  │
│▼ usp_load_gold_sum     gold_summary      dbo        reject          [Override] │
│  ┗━ Reasoning: Contains EXEC sp_executesql with dynamically constructed        │
│     WHERE clauses. Dynamic SQL is a blocking pattern (DEC-11). Estimated       │
│     15% SQL-expressible — below Reject threshold.                              │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Tier Badges

```tsx
// migrate
style={{
  background: "color-mix(in oklch, var(--color-pacific), transparent 85%)",
  color: "var(--color-pacific)"
}}

// review
className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"

// reject
className="bg-destructive/15 text-destructive"
```

All badges: `rounded-full text-xs font-medium px-2 py-0.5`

## Row Expansion

Clicking a row (or a `ChevronDown` button) expands it **inline** — a sub-row spanning all columns, `bg-muted/50`, showing the full `reasoning` text in `text-sm text-muted-foreground font-mono`. No modal. The table stays readable while reasoning is visible.

## Override Flow

Clicking "Override" opens a **`Sheet`** (side drawer, slides from the right). Using `Sheet` rather than `Dialog` keeps the full table visible behind the drawer — the FDE can see the procedure they are overriding in context.

Sheet contents:

```text
Procedure: usp_load_gold_summary
Current tier: reject

New tier:
  ○ migrate
  ● review    ← selected
  ○ reject

Reason for override:
[FDE will handle dynamic SQL manually — rest of proc is standard T-SQL]

[Save]  [Cancel]
```

On save: calls `candidacy_override`, updates the row in place, sets `overridden = true` (shows `Pencil` icon in the OVR column).

## Columns

| Column | Type | Sortable | Notes |
|--------|------|----------|-------|
| Stored Procedure | `font-mono text-sm` | Yes | `procedure_name` |
| Table Written | `font-mono text-sm` | Yes | From `table_artifacts` join |
| Schema | text | Yes | `schema_name` |
| Tier | badge | Yes | `migrate` / `review` / `reject` |
| OVR | `Pencil` icon | — | Only shown when `overridden = true` |
| Actions | `Button` | — | "Override" button |

## Components

| Component | Use |
|-----------|-----|
| `Table` | Main grid |
| `Sheet` | Override drawer |
| `RadioGroup` | Tier picker in Sheet |
| `Textarea` | Override reason in Sheet |
| `Input` | Search toolbar |
| `Select` | Tier filter, Schema filter |
| `Badge` | Tier display |
| `Button` | Override trigger, Save/Cancel in Sheet |

**TanStack Table** with `columnFilters` + `globalFilter`. All data fetched once on mount from `candidacy_list(workspace_id)` — filtering is client-side.

## References

- [dbt Cloud Monitor Jobs](https://docs.getdbt.com/docs/deploy/monitor-jobs)
- [PatternFly Filters Design Guidelines](https://www.patternfly.org/patterns/filters/design-guidelines/)
- [Data Table Design UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [shadcn/ui Sheet](https://ui.shadcn.com/docs/components/sheet)
