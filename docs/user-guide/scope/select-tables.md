# Select Tables

The first step in Scope is choosing which ADF pipelines and stored procedures to include in your migration.

---

## How it works

The app connects to your Microsoft Fabric Workspace and lists all ADF pipelines it discovers. Each pipeline contains one or more stored procedures. You select at the pipeline level and then refine at the stored procedure level.

---

## Selecting pipelines

The left panel lists all pipelines found in your Fabric Workspace.

- Check the box next to a pipeline to include all its stored procedures.
- Uncheck a pipeline to exclude all its stored procedures.
- Click a pipeline name to expand it and see individual stored procedures.

---

## Selecting stored procedures

When a pipeline is expanded, each stored procedure appears as a child row.

- Check or uncheck individual procedures to include or exclude them independently of the pipeline selection.
- The count badge on each pipeline updates to show how many procedures are selected.

---

## Scope summary

The right panel shows a running total of selected pipelines and stored procedures. This count is used when estimating migration cost on the Monitor screen.

---

## Next step

After selecting tables, go to [Review candidacy](candidacy.md) to see AI assessments for each selected procedure.
