# Scope Selection

Route: `/scope` — Step 2

## Pattern

**Schema-grouped table list with per-group select-all.** Modelled on Fivetran's schema tab and Airbyte's stream selection: schemas as sticky group header rows, tables listed within each schema, a select-all checkbox per schema group.

## Layout

```text
Toolbar:  [Search input]              [Schema: All ▼]   [Select All | Deselect All]
                                                                    [N selected]

Table:
┌──────────────────────────────────────────────────────────────────┐
│ ☑  Name                     Schema    Object ID    Object Type   │
├──────────────────────────────────────────────────────────────────┤
│ [dbo]  ☑ Select all (16)                                         │
│  ☑  fact_sales              dbo                    Table         │
│  ☑  dim_customer            dbo                    Table         │
│  □  dim_product             dbo                    Table         │
├──────────────────────────────────────────────────────────────────┤
│ [reporting]  □ Select all (4)                                    │
│  □  gold_summary            reporting              Table         │
└──────────────────────────────────────────────────────────────────┘

Sticky footer: [12 tables selected]        [Continue to Candidacy Review →]
```

## Key Decisions

**Schema group rows** are non-data `tr` elements styled `bg-muted`, acting as section headers. Each has a select-all `Checkbox` that toggles all tables in the schema group. This mirrors Fivetran exactly.

**Data source:** `warehouse_tables_list(warehouse_item_id)` — only tables are selectable in scope; stored procedures are discovered automatically in Step 3 (Candidacy) by tracing each table back to its producing artifact.

**Table names** use `font-mono text-sm` — they are identifiers, not prose.

**Autosave:** Checkbox toggles call `selected_tables_save` debounced at 300ms. No explicit Save button. State is never lost on backward navigation.

**Continue button:** Enabled only when N > 0, shown in the sticky footer. Clicking calls `markComplete("scope")` and navigates to `/candidacy`.

## Components

| Component | Use |
|-----------|-----|
| `Table`, `TableRow`, `TableCell` | Main grid |
| `Checkbox` | Per-row and per-group select-all |
| `Input` | Search field |
| `Select` | Schema filter dropdown |
| `Button` | Select All, Deselect All, Continue |
| `Badge` | Object type indicator |

Use **TanStack Table** for client-side sort and filter of the `warehouse_tables_list` result. Group rows are injected between data rows during render, not part of the TanStack Table data model.

## References

- [Airbyte Schema Configuration](https://docs.airbyte.com/platform/using-airbyte/configuring-schema)
- [Fivetran Connection Schemas](https://fivetran.com/docs/using-fivetran/fivetran-dashboard/connectors/schema)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table)
