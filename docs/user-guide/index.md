# Getting Started

## First-time setup

The Settings screen appears on first launch. You need to connect two accounts before you can run a migration.

**How to complete setup**

1. Open **Settings → Connections**.
2. Enter your **Microsoft Fabric token** and click **Test** to validate it.
3. Click **Sign in with GitHub**. Authorize the app in your browser when prompted.
4. Open **Settings → Workspace** and confirm the paths for your migration repository and dbt project.
5. Navigate to **Scope** in the sidebar to begin selecting tables.

---

## What's in the app

| Screen | What you do there |
|---|---|
| [Settings](settings.md) | Connect Fabric and GitHub, configure workspace paths, manage usage |
| [Scope — Select tables](scope/select-tables.md) | Choose which ADF pipelines and stored procedures to migrate |
| [Scope — Candidacy](scope/candidacy.md) | Review AI candidacy assessments and override where needed |
| [Scope — Table config](scope/table-config.md) | Set snapshot strategy, PII handling, and incremental column per table |
| [Monitor](monitor.md) | Launch the migration, track per-model progress, resume interrupted sessions |

---

## Quick concepts

**Stored procedure** — A T-SQL routine in Microsoft Fabric Warehouse that this app converts into a dbt model.

**Candidacy** — An AI assessment of whether a stored procedure can be automatically migrated. Procedures rated *Unlikely* or *Manual* require human review before they are included in a migration run.

**Migration run** — A headless GitHub Actions workflow that translates selected stored procedures into dbt models, runs tests, and opens a pull request on your production repo.

**Session resumption** — If a migration run is interrupted, the app can pick up from where it left off using the `plan.md` state file in your migration repository.
