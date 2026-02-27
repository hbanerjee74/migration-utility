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
  connection_string TEXT,
  collation_type    TEXT
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
  table_name        TEXT NOT NULL
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
  selected_table_id   TEXT PRIMARY KEY REFERENCES selected_tables(id),
  table_type          TEXT
    CHECK(table_type IN ('fact','dimension','unknown')),
  load_strategy       TEXT
    CHECK(load_strategy IN ('incremental','full_refresh','snapshot')),
  grain_columns       TEXT,
  relationships_json  TEXT,
  incremental_column  TEXT,
  date_column         TEXT,
  snapshot_strategy   TEXT NOT NULL DEFAULT 'sample_1day'
    CHECK(snapshot_strategy IN ('sample_1day','full','full_flagged')),
  pii_columns         TEXT,
  confirmed_at        TEXT
);
