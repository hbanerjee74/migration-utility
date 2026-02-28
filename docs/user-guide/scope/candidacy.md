# Review Candidacy

Candidacy is an AI assessment of how easily each selected stored procedure can be automatically migrated to a dbt model.

---

## Candidacy ratings

| Rating | Meaning |
|---|---|
| **Likely** | The procedure follows patterns the migration agent handles well. Included by default. |
| **Possible** | Migration is achievable but may need review after generation. Included by default. |
| **Unlikely** | The procedure has patterns that often cause migration failures. Excluded by default. |
| **Manual** | The procedure cannot be automatically migrated and requires a hand-written dbt model. Excluded by default. |

---

## Reading the table

Each row shows:

- **Stored procedure name** — the name of the procedure in Fabric Warehouse
- **Pipeline** — the ADF pipeline it belongs to
- **Rating** — the AI candidacy assessment
- **Reason** — a brief explanation of why the rating was assigned
- **Include** — whether this procedure is included in the migration run

Rows with AI-suggested values are indicated by a blue left border. The border is removed when you make a change.

---

## Overriding a candidacy decision

You can include or exclude any procedure regardless of its AI rating.

1. Find the procedure in the table.
2. Toggle the **Include** switch on the row.

Overrides are saved automatically.

---

## Filtering the table

Use the filter bar above the table to narrow by rating, pipeline, or inclusion status. This does not change which procedures are included — it only affects what is visible.

---

## Next step

After reviewing candidacy, go to [Configure tables](table-config.md) to set snapshot strategy, PII handling, and incremental columns.
