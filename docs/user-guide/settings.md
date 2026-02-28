# Settings

Access Settings from the sidebar. Changes take effect immediately unless noted.

---

## Connections

### Microsoft Fabric

**Fabric Token** — Enter your Fabric personal access token. Click **Test** to validate it. The token is stored locally and never transmitted except to the Fabric API.

### GitHub

Shows your connected GitHub account avatar and username when signed in.

**How to connect GitHub**

1. Click **Sign in with GitHub**.
2. A device code appears in the dialog. Click the copy icon to copy it.
3. Click **Open GitHub**. Your browser opens `github.com/login/device` and the app begins polling.
4. Paste the code on GitHub and authorize the application.
5. The dialog shows *"Signed in successfully"* and closes automatically.

**How to disconnect GitHub**

Click **Sign Out** next to your account name.

---

## Workspace

| Field | What it is | Action |
|---|---|---|
| **Migration repository** | Local clone of the repo where `plan.md` and migration branches are created | **Browse** to change |
| **dbt project** | Local path to the dbt project that receives generated models | **Browse** to change |

Changes to workspace paths take effect on the next migration run.

---

## Reset

Clears all migration state and returns the app to its initial configuration.

> **Warning:** Reset removes all stored procedure selections, candidacy overrides, and table configuration. This cannot be undone. Migration branches already pushed to GitHub are not affected.

**How to reset**

1. Click **Reset all data**.
2. Confirm in the dialog that appears.

---

## Usage

Shows token consumption and estimated cost for migration runs.

### Summary

| Card | What it shows |
|---|---|
| **Total cost** | Cumulative spend across all runs |
| **Total tokens** | Total input + output tokens consumed |
| **Runs** | Number of migration runs completed |

### Cost by table

A bar chart showing the top stored procedures by migration cost.

### Cost by phase

A bar chart breaking down spend by agent phase (Candidacy, Translation, Test Generation, Validation).

### Recent runs

A list of recent migration sessions. Click a row to expand it and see per-agent token usage.
