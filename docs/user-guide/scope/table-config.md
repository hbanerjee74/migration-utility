# Configure Tables

Table config lets you set migration options for each included stored procedure before launching the run.

---

## Configuration options

### Snapshot strategy

Controls how the generated dbt model handles historical data.

| Strategy | When to use |
|---|---|
| **None** | The procedure does not track history — generate a standard dbt model |
| **Timestamp** | Use a timestamp column to detect new and updated rows |
| **Check** | Compare specific columns to detect changes |

The AI suggests a strategy based on the stored procedure's SQL. You can override it.

### PII handling

Toggle **Contains PII** if the stored procedure processes personally identifiable information. This adds a `meta: { contains_pii: true }` tag to the generated dbt model, which can be used downstream for access control.

### Incremental column

When using the **Timestamp** snapshot strategy, specify the column name used to filter new rows (e.g. `updated_at`, `created_date`). The AI suggests a column from the stored procedure's SQL where one can be inferred.

---

## Applying a setting to multiple procedures

1. Check the boxes on the rows you want to update.
2. Use the **Bulk edit** bar that appears above the table to apply a shared value.

---

## Next step

After configuring tables, go to [Monitor](../monitor.md) to launch the migration run.
