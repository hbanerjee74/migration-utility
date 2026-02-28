# Table Config

Route: `/config` — Step 4

## Pattern

**Master-detail split layout.** Table list on the left (~40%), card-based form sections on the right (~60%). Modelled on Azure Data Studio's migration wizard (database list left, per-database config right).

A wide inline table with 7+ config columns per row requires horizontal scroll and makes it impossible to scan or compare rows. The master-detail split keeps both the list and the active form visible simultaneously.

## Layout

```text
┌─────────────────────────┬─────────────────────────────────────────┐
│ Tables (12)             │ fact_sales                              │
│ [Search...]             │ dbo · Stored procedure: usp_load_fact_  │
│                         │                                         │
│ ● fact_sales     ✓      │ ┌── Classification ──────────────────┐  │
│ ○ dim_customer   ●      │ │ Table type:      [Fact ▼]          │  │
│ ○ dim_product           │ │ Load strategy:   [Incremental ▼]   │  │
│ ○ silver_revenue        │ └────────────────────────────────────┘  │
│ ○ gold_summary          │ ┌── Incremental Config ──────────────┐  │
│                         │ │ Incremental col: [load_date ▼]     │  │
│                         │ │ Date column:     [sale_date ▼]     │  │
│                         │ └────────────────────────────────────┘  │
│                         │ ┌── Snapshot ────────────────────────┐  │
│                         │ │ Strategy:       [sample_1day ▼]    │  │
│                         │ └────────────────────────────────────┘  │
│                         │ ┌── PII Columns ─────────────────────┐  │
│                         │ │ [customer_email ×] [customer_ph ×] │  │
│                         │ │ + Add column                       │  │
│                         │ └────────────────────────────────────┘  │
│                         │                                         │
│                         │              [Confirm table →]          │
└─────────────────────────┴─────────────────────────────────────────┘
```

## Left Panel — Table List

Each row shows: table name (`font-mono`), schema, and a confirmation status indicator:

| Indicator | Meaning |
|-----------|---------|
| No badge | Not yet opened |
| Muted dot | Opened, not confirmed |
| Seafoam `CheckCircle2` | `confirmed_at` is set |

Clicking a row loads that table's config into the right panel. The selected row gets a `bg-accent` highlight.

## Right Panel — Form Sections

Each section is a `Card` with a title and grouped fields. Sections are separated by `Separator`.

### Field Types

| Field | Component | Source |
|-------|-----------|--------|
| `table_type` | `Select` | Enum: `fact`, `dimension`, `other` |
| `load_strategy` | `Select` | Enum: `incremental`, `full_refresh` |
| `snapshot_strategy` | `Select` | Enum: `full`, `sample_1day` |
| `incremental_column` | `Combobox` | Column names from `warehouse_schemas` for this table |
| `date_column` | `Combobox` | Column names from `warehouse_schemas` |
| `grain_columns` | Multi-select `Combobox` | Column names from `warehouse_schemas` |
| `pii_columns` | Badge chips with `×` | Column names, add via Combobox |

## Agent Suggestion Indicators

The agent pre-populates config fields via candidacy analysis. Pre-filled fields show a pacific left border to signal "AI suggested":

```tsx
style={{ borderLeft: "2px solid var(--color-pacific)" }}
```

When the FDE edits a pre-filled field, the border reverts to default — the field is now FDE-owned. A `Wand2` lucide icon alongside the label can optionally reinforce the AI origin.

## Autosave

Call `table_config_save` on every field change (blur or select), debounced 500ms. The "Confirm" button is separate — it sets `confirmed_at` and updates the left panel status indicator. Autosave prevents data loss; Confirm signals the FDE has intentionally reviewed all fields.

## Components

| Component | Use |
|-----------|-----|
| `ResizablePanelGroup` + `ResizablePanel` | Left/right split (or fixed CSS grid if resizing is not needed) |
| `Select` | Enum fields |
| `Combobox` | Column name pickers (searchable) |
| `Badge` | PII column chips |
| `Card`, `Separator` | Form section containers |
| `Button` | Confirm, Add column |
| `Input` | Left panel search |
| `ScrollArea` | Left panel list if > 10 tables |

## References

- [Azure SQL Migration Extension for Azure Data Studio](https://learn.microsoft.com/en-us/azure-data-studio/extensions/azure-sql-migration-extension)
- [Master-Detail Pattern — Medium](https://medium.com/@lucasurbas/case-study-master-detail-pattern-revisited-86c0ed7fc3e)
- [Fivetran per-row sync mode dropdowns](https://fivetran.com/docs/using-fivetran/fivetran-dashboard/connectors/schema)
- [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/combobox)
- [shadcn/ui Resizable](https://ui.shadcn.com/docs/components/resizable)
