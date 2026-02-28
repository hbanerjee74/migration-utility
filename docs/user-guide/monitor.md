# Monitor

Monitor is where you launch a migration run and track its progress.

---

## Launching a run

1. Review the scope summary — the count of included pipelines and stored procedures.
2. Click **Launch migration**. The app writes `plan.md` to your migration repository, pushes it to GitHub, and triggers the Actions workflow.
3. The progress table appears and updates as each stored procedure is processed.

> The **Launch migration** button is disabled if there are no included procedures or if required Settings fields are incomplete.

---

## Progress table

Each row represents one stored procedure. The status column shows its current state.

| Status | Meaning |
|---|---|
| **Pending** | Waiting to be picked up by an agent |
| **Running** | An agent is actively processing this procedure |
| **Completed** | Successfully translated to a dbt model |
| **Blocked** | Depends on another model that has not completed yet |
| **Failed** | The agent could not complete the migration for this procedure |

Click a row to expand it and see the agent log for that procedure.

---

## Handling blocked procedures

A procedure is marked **Blocked** when it depends on another stored procedure in the same run that has not yet completed. Blocked procedures are retried automatically once their dependencies resolve.

If a procedure remains blocked after all dependencies complete, check the agent log on the row for details.

---

## Handling failed procedures

A **Failed** procedure was not migrated automatically. Common reasons are shown in the agent log.

Options:
- **Retry** — click the retry icon on the row to re-queue the procedure
- **Skip** — exclude the procedure and continue with the rest of the run
- **Manual** — write the dbt model by hand and add it to the migration branch

---

## Session resumption

If a migration run is interrupted (network loss, machine restart, workflow timeout), you can resume it.

1. Return to the Monitor screen. The app detects the in-progress `plan.md` in your migration repository.
2. Click **Resume session**. The run continues from the last saved state.

Procedures that completed before the interruption are not re-run.

---

## Pull request

When all included procedures have either completed or been skipped, the migration agent opens a pull request on your production repo. The PR contains all generated dbt models, tests, and a migration summary.

You receive a link to the PR in the Monitor screen once it is created.
