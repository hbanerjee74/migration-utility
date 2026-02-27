# Migration Utility

A desktop app that migrates Microsoft Fabric Warehouse stored procedures to dbt models on Vibedata's agentic data engineering platform.

You connect it to your Fabric workspace, select which tables to migrate, review and confirm the AI's analysis, then launch. The migration runs as a pipeline in your GitHub repo — producing tested, ready-to-use dbt models at the end.

**Scope:** Silver and gold transformations from Fabric Warehouse (T-SQL). Lakehouse / Spark is not supported.

---

## Prerequisites

Before you start, make sure you have:

- Access to the Fabric workspace you want to migrate (Viewer role or higher)
- A GitHub repo set up as your migration repo (can be empty)
- A Vibedata workspace connected to that repo
- The Migration Utility desktop app installed (see below)

---

## Installation

Download the latest release from the [Releases page](https://github.com/hbanerjee74/migration-utility/releases).

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `migration-utility_aarch64.dmg` |
| macOS (Intel) | `migration-utility_x86_64.dmg` |
| Windows | `migration-utility_x86_64-setup.exe` |
| Linux | `migration-utility_amd64.AppImage` |

**macOS:** Open the `.dmg`, drag Migration Utility to Applications. On first launch, right-click → Open if macOS shows an unverified developer warning.

---

## Workflow

The app walks you through five steps. Each step must be completed before the next unlocks.

### Step 1 — Workspace setup

Enter your Fabric workspace details and point the app at your local migration repo:

- **Workspace name** — a label for this migration (e.g. "ACME Finance Warehouse")
- **Migration repo path** — the local folder where your migration repo is cloned
- **Fabric workspace URL** — optional; used to pre-fill the Fabric connection

Click **Continue** to scan your workspace. The app reads your Fabric Warehouse schema and pipeline definitions — this usually takes under a minute.

### Step 2 — Table scope

You'll see every table in your Fabric Warehouse. Select the ones you want to migrate to dbt.

For each selected table, choose the table type:

| Type | When to use |
|---|---|
| Fact | High-volume transactional tables loaded incrementally |
| Dimension | Reference tables that change slowly |
| Full refresh | Tables always rebuilt from scratch |

If you're not sure, leave it as **Unknown** — you can change it before launching.

### Step 3 — Candidacy review

The app analyses each stored procedure that writes to your selected tables and classifies it as:

| Classification | Meaning |
|---|---|
| **Migrate** | Straightforward T-SQL — high confidence dbt translation |
| **Review** | Complex patterns (dynamic SQL, MERGE, temp tables) — needs human sign-off |
| **Reject** | Cannot be migrated automatically (e.g. relies on Fabric-specific features) |

Review the classifications. You can override any decision — select a different tier and add a short reason. Rejected procedures won't be included in the migration.

### Step 4 — Table config

For each table, confirm the migration settings:

- **PII columns** — columns containing personal data (masked or excluded in Vibedata)
- **Incremental column** — the timestamp or sequence column used for incremental loads
- **Snapshot strategy** — how historical snapshots are taken:
  - `sample_1day` — one snapshot per day (default)
  - `full` — full table snapshot on each run
  - `full_flagged` — full snapshot with an active/inactive flag

### Step 5 — Review and launch

A summary of everything you've configured. Review the table count, any outstanding Review-tier procedures, and the migration repo path.

When ready, click **Launch migration**. The app commits a `plan.md` to your migration repo and triggers the GitHub Actions pipeline.

---

## After launch

The migration pipeline runs in your GitHub repo. It works through your selected tables in parallel, translating each stored procedure to a dbt model, generating tests, and validating the output.

You can follow progress in the GitHub Actions tab of your migration repo. When complete, the pipeline opens a pull request with the generated dbt models for your review.

Typical run time: 5–20 minutes depending on the number of tables and complexity of your stored procedures.

---

## License

[Elastic License 2.0](LICENSE) — free to use, not available as a managed service.
