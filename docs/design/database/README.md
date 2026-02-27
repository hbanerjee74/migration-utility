# Database Design

SQLite database local to the Tauri desktop app. Stores a read-only mirror of the
Fabric workspace (Fabric layer) and the FDE's migration decisions on top of it
(Migration layer).

---

## Hierarchy

Fabric objects form a four-level tree. The schema follows this structure exactly.

```text
Level 1 — Workspace
└── Level 2 — Item  (type: Warehouse | DataPipeline | Notebook)
    │
    ├── [Warehouse] Level 3 — Schema
    │                └── Level 4 — Table
    │                └── Level 4 — Stored Procedure
    │
    └── [DataPipeline] Level 3 — Activity
```

Each level has its own table. Foreign keys enforce the parent-child relationships so
the full tree can be traversed top-down or bottom-up.

---

## Fabric Layer

Mirrors the Fabric API response. Never edited by the FDE directly. Populated by the
workspace scanner during the import step.

### `workspaces`

One row per Fabric workspace connected to this app.

| Column | Type | Source |
|---|---|---|
| `id` | TEXT PK | `WorkspaceInfo.id` (UUID) |
| `display_name` | TEXT NOT NULL | `WorkspaceInfo.displayName` |
| `migration_repo_path` | TEXT NOT NULL | Local path (FDE-provided) |
| `created_at` | TEXT NOT NULL | App-generated timestamp |

### `items`

All workspace-level Fabric items. One row per item regardless of type.

| Column | Type | Source |
|---|---|---|
| `id` | TEXT PK | `Item.id` (UUID, globally unique across Fabric) |
| `workspace_id` | TEXT NOT NULL → `workspaces.id` | `Item.workspaceId` |
| `display_name` | TEXT NOT NULL | `Item.displayName` |
| `description` | TEXT | `Item.description` (optional) |
| `folder_id` | TEXT | `Item.folderId` — null means workspace root |
| `item_type` | TEXT NOT NULL | `Item.type` — see CHECK below |
| `connection_string` | TEXT | `WarehouseProperties.connectionString` — Warehouse only |
| `collation_type` | TEXT | `WarehouseProperties.collationType` — Warehouse only |

`item_type` CHECK: `'Warehouse' \| 'DataPipeline' \| 'Notebook'`

`connection_string` and `collation_type` are null for non-Warehouse rows. Populated
from `GET /warehouses/{warehouseId}` — the generic items endpoint does not return them.

### `warehouse_schemas`

Level 3 — schemas within a warehouse. Populated via T-SQL:

```sql
SELECT schema_id, name FROM sys.schemas
```

| Column | Type | Source |
|---|---|---|
| `warehouse_item_id` | TEXT NOT NULL → `items.id` | — |
| `schema_name` | TEXT NOT NULL | `sys.schemas.name` |
| `schema_id_local` | INTEGER | `sys.schemas.schema_id` — DB-scoped, not portable |

PK: `(warehouse_item_id, schema_name)`

### `warehouse_tables`

Level 4 — tables within a schema. Populated via T-SQL:

```sql
SELECT table_schema, table_name FROM INFORMATION_SCHEMA.TABLES
```

| Column | Type | Source |
|---|---|---|
| `warehouse_item_id` | TEXT NOT NULL → `warehouse_schemas` | — |
| `schema_name` | TEXT NOT NULL → `warehouse_schemas` | `INFORMATION_SCHEMA.TABLES.TABLE_SCHEMA` |
| `table_name` | TEXT NOT NULL | `INFORMATION_SCHEMA.TABLES.TABLE_NAME` |
| `object_id_local` | INTEGER | `sys.objects.object_id` — DB-scoped, not portable |

PK: `(warehouse_item_id, schema_name, table_name)`

Composite FK: `(warehouse_item_id, schema_name)` → `warehouse_schemas(warehouse_item_id, schema_name)`

### `warehouse_procedures`

Level 4 — stored procedures within a schema. Populated via T-SQL:

```sql
SELECT routine_schema, routine_name, routine_definition
  FROM INFORMATION_SCHEMA.ROUTINES
 WHERE routine_type = 'PROCEDURE'
```

| Column | Type | Source |
|---|---|---|
| `warehouse_item_id` | TEXT NOT NULL → `warehouse_schemas` | — |
| `schema_name` | TEXT NOT NULL → `warehouse_schemas` | `INFORMATION_SCHEMA.ROUTINES.ROUTINE_SCHEMA` |
| `procedure_name` | TEXT NOT NULL | `INFORMATION_SCHEMA.ROUTINES.ROUTINE_NAME` |
| `object_id_local` | INTEGER | `sys.objects.object_id` — DB-scoped, not portable |
| `sql_body` | TEXT | `INFORMATION_SCHEMA.ROUTINES.ROUTINE_DEFINITION` |

PK: `(warehouse_item_id, schema_name, procedure_name)`

Composite FK: `(warehouse_item_id, schema_name)` → `warehouse_schemas(warehouse_item_id, schema_name)`

### `pipeline_activities`

Level 3 — activities within a DataPipeline item. Populated by decoding the pipeline
definition from `POST /dataPipelines/{id}/getDefinition` (Base64-encoded JSON).

`activity_name` is the unique key within a pipeline — there is no separate `id` field
in the pipeline JSON. `endpointitemId` in the activity JSON maps to `items.id`.

| Column | Type | Source |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | — |
| `pipeline_item_id` | TEXT NOT NULL → `items.id` | — |
| `activity_name` | TEXT NOT NULL | `activity.name` — unique within pipeline |
| `activity_type` | TEXT NOT NULL | `activity.type` (e.g. `SqlServerStoredProcedure`) |
| `target_warehouse_item_id` | TEXT → `items.id` | `typeProperties.endpointitemId` |
| `target_schema_name` | TEXT | Parsed from `typeProperties` |
| `target_procedure_name` | TEXT | `typeProperties.storedProcedureName` |
| `parameters_json` | TEXT | `typeProperties.storedProcedureParameters` (JSON) |
| `depends_on_json` | TEXT | `dependsOn` array — `activity_name` references (JSON) |

UNIQUE: `(pipeline_item_id, activity_name)`

---

## Migration Layer

FDE decisions built on top of the Fabric layer. These tables are written by the app
as the FDE works through the 5-step wizard.

### `selected_tables`

Tables the FDE has chosen to include in the migration (scope selection step).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | App-generated UUID |
| `workspace_id` | TEXT NOT NULL → `workspaces.id` | — |
| `warehouse_item_id` | TEXT NOT NULL → `items.id` | — |
| `schema_name` | TEXT NOT NULL | — |
| `table_name` | TEXT NOT NULL | — |
| `table_type` | TEXT NOT NULL | `fact \| dimension \| full_refresh \| unknown` |

### `table_artifacts`

Discovery agent output: which stored procedure writes to each selected table.

| Column | Type | Notes |
|---|---|---|
| `selected_table_id` | TEXT PK → `selected_tables.id` | — |
| `warehouse_item_id` | TEXT NOT NULL → `items.id` | — |
| `schema_name` | TEXT NOT NULL | — |
| `procedure_name` | TEXT NOT NULL | — |
| `pipeline_activity_id` | INTEGER → `pipeline_activities.id` | Null if not found in any pipeline |
| `discovery_status` | TEXT NOT NULL | `resolved \| orphan \| duplicate_writer` |

### `candidacy`

AI classification of each stored procedure (keyed to the procedure, not the table —
one proc can write multiple tables).

| Column | Type | Notes |
|---|---|---|
| `warehouse_item_id` | TEXT NOT NULL → `items.id` | — |
| `schema_name` | TEXT NOT NULL | — |
| `procedure_name` | TEXT NOT NULL | — |
| `tier` | TEXT NOT NULL | `migrate \| review \| reject` |
| `reasoning` | TEXT | Agent's explanation |
| `overridden` | INTEGER NOT NULL DEFAULT 0 | 1 if FDE changed the tier |
| `override_reason` | TEXT | FDE's reason for override |

PK: `(warehouse_item_id, schema_name, procedure_name)`

### `table_config`

FDE-confirmed settings per selected table (table config step).

| Column | Type | Notes |
|---|---|---|
| `selected_table_id` | TEXT PK → `selected_tables.id` | — |
| `pii_columns` | TEXT | JSON array of column names |
| `incremental_column` | TEXT | Column used for incremental loads |
| `snapshot_strategy` | TEXT NOT NULL DEFAULT `sample_1day` | `sample_1day \| full \| full_flagged` |
| `confirmed_at` | TEXT | ISO 8601 timestamp — null until FDE confirms |

---

## DDL

```sql
CREATE TABLE schema_version (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- ── FABRIC LAYER ──────────────────────────────────────────────────────────────

CREATE TABLE workspaces (
  id                  TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  migration_repo_path TEXT NOT NULL,
  created_at          TEXT NOT NULL
);

CREATE TABLE items (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspaces(id),
  display_name      TEXT NOT NULL,
  description       TEXT,
  folder_id         TEXT,
  item_type         TEXT NOT NULL
    CHECK(item_type IN ('Warehouse','DataPipeline','Notebook')),
  connection_string TEXT,   -- Warehouse only: TDS endpoint
  collation_type    TEXT    -- Warehouse only
);

CREATE TABLE warehouse_schemas (
  warehouse_item_id TEXT NOT NULL REFERENCES items(id),
  schema_name       TEXT NOT NULL,
  schema_id_local   INTEGER,
  PRIMARY KEY (warehouse_item_id, schema_name)
);

CREATE TABLE warehouse_tables (
  warehouse_item_id TEXT NOT NULL,
  schema_name       TEXT NOT NULL,
  table_name        TEXT NOT NULL,
  object_id_local   INTEGER,
  PRIMARY KEY (warehouse_item_id, schema_name, table_name),
  FOREIGN KEY (warehouse_item_id, schema_name)
    REFERENCES warehouse_schemas(warehouse_item_id, schema_name)
);

CREATE TABLE warehouse_procedures (
  warehouse_item_id TEXT NOT NULL,
  schema_name       TEXT NOT NULL,
  procedure_name    TEXT NOT NULL,
  object_id_local   INTEGER,
  sql_body          TEXT,
  PRIMARY KEY (warehouse_item_id, schema_name, procedure_name),
  FOREIGN KEY (warehouse_item_id, schema_name)
    REFERENCES warehouse_schemas(warehouse_item_id, schema_name)
);

CREATE TABLE pipeline_activities (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  pipeline_item_id         TEXT NOT NULL REFERENCES items(id),
  activity_name            TEXT NOT NULL,
  activity_type            TEXT NOT NULL,
  target_warehouse_item_id TEXT REFERENCES items(id),
  target_schema_name       TEXT,
  target_procedure_name    TEXT,
  parameters_json          TEXT,
  depends_on_json          TEXT,
  UNIQUE (pipeline_item_id, activity_name)
);

-- ── MIGRATION LAYER ───────────────────────────────────────────────────────────

CREATE TABLE selected_tables (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspaces(id),
  warehouse_item_id TEXT NOT NULL REFERENCES items(id),
  schema_name       TEXT NOT NULL,
  table_name        TEXT NOT NULL,
  table_type        TEXT NOT NULL
    CHECK(table_type IN ('fact','dimension','full_refresh','unknown'))
);

CREATE TABLE table_artifacts (
  selected_table_id    TEXT PRIMARY KEY REFERENCES selected_tables(id),
  warehouse_item_id    TEXT NOT NULL REFERENCES items(id),
  schema_name          TEXT NOT NULL,
  procedure_name       TEXT NOT NULL,
  pipeline_activity_id INTEGER REFERENCES pipeline_activities(id),
  discovery_status     TEXT NOT NULL
    CHECK(discovery_status IN ('resolved','orphan','duplicate_writer'))
);

CREATE TABLE candidacy (
  warehouse_item_id TEXT NOT NULL REFERENCES items(id),
  schema_name       TEXT NOT NULL,
  procedure_name    TEXT NOT NULL,
  tier              TEXT NOT NULL
    CHECK(tier IN ('migrate','review','reject')),
  reasoning         TEXT,
  overridden        INTEGER NOT NULL DEFAULT 0,
  override_reason   TEXT,
  PRIMARY KEY (warehouse_item_id, schema_name, procedure_name)
);

CREATE TABLE table_config (
  selected_table_id  TEXT PRIMARY KEY REFERENCES selected_tables(id),
  pii_columns        TEXT,
  incremental_column TEXT,
  snapshot_strategy  TEXT NOT NULL DEFAULT 'sample_1day'
    CHECK(snapshot_strategy IN ('sample_1day','full','full_flagged')),
  confirmed_at       TEXT
);
```

---

## Design Notes

- **`warehouse_item_id` is always a FK to `items.id`** — used in every sub-warehouse
  table as the level 2 anchor. In `warehouse_tables` and `warehouse_procedures` it is
  part of a composite FK to `warehouse_schemas`, which itself references `items.id`.

- **`object_id_local`** — `sys.objects.object_id` is scoped to the database instance.
  Stored as a lookup hint only. Never used as a cross-system key. Natural composite
  keys (item id + schema + object name) are the portable identifiers.

- **`connection_string` and `collation_type` on `items`** — nullable, only set for
  Warehouse rows. Avoids a separate table and a JOIN every time the scanner needs the
  TDS endpoint.

- **`folder_id` null = workspace root** — the Fabric API omits `folderId` entirely
  for root-level items rather than returning null. Treat its absence as root placement.

- **`target_warehouse_item_id` in `pipeline_activities`** — maps `endpointitemId` from
  the pipeline JSON to `items.id`, linking each activity to the warehouse it targets.

- **`candidacy` is keyed to the procedure** — one stored proc can write multiple
  tables, so candidacy classification lives at the procedure level, not the table level.
