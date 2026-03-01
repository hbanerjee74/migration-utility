PRAGMA foreign_keys = OFF;

CREATE TABLE workspaces_new (
  id                               TEXT PRIMARY KEY,
  display_name                     TEXT NOT NULL,
  migration_repo_path              TEXT NOT NULL,
  created_at                       TEXT NOT NULL,
  fabric_url                       TEXT,
  migration_repo_name              TEXT,
  fabric_service_principal_id      TEXT,
  fabric_service_principal_secret  TEXT,
  source_type                      TEXT CHECK(source_type IN ('sql_server', 'fabric_warehouse')),
  source_server                    TEXT,
  source_database                  TEXT,
  source_port                      INTEGER,
  source_authentication_mode       TEXT,
  source_username                  TEXT,
  source_password                  TEXT,
  source_encrypt                   INTEGER,
  source_trust_server_certificate  INTEGER
);

CREATE TABLE items_new (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspaces_new(id) ON DELETE CASCADE,
  display_name      TEXT NOT NULL,
  description       TEXT,
  folder_id         TEXT,
  item_type         TEXT NOT NULL
    CHECK(item_type IN ('Warehouse','DataPipeline','Notebook')),
  connection_string TEXT,
  collation_type    TEXT
);

CREATE TABLE warehouse_schemas_new (
  warehouse_item_id TEXT NOT NULL REFERENCES items_new(id) ON DELETE CASCADE,
  schema_name       TEXT NOT NULL,
  schema_id_local   INTEGER,
  PRIMARY KEY (warehouse_item_id, schema_name)
);

CREATE TABLE warehouse_tables_new (
  warehouse_item_id TEXT NOT NULL,
  schema_name       TEXT NOT NULL,
  table_name        TEXT NOT NULL,
  object_id_local   INTEGER,
  PRIMARY KEY (warehouse_item_id, schema_name, table_name),
  FOREIGN KEY (warehouse_item_id, schema_name)
    REFERENCES warehouse_schemas_new(warehouse_item_id, schema_name) ON DELETE CASCADE
);

CREATE TABLE warehouse_procedures_new (
  warehouse_item_id TEXT NOT NULL,
  schema_name       TEXT NOT NULL,
  procedure_name    TEXT NOT NULL,
  object_id_local   INTEGER,
  sql_body          TEXT,
  PRIMARY KEY (warehouse_item_id, schema_name, procedure_name),
  FOREIGN KEY (warehouse_item_id, schema_name)
    REFERENCES warehouse_schemas_new(warehouse_item_id, schema_name) ON DELETE CASCADE
);

CREATE TABLE pipeline_activities_new (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  pipeline_item_id         TEXT NOT NULL REFERENCES items_new(id) ON DELETE CASCADE,
  activity_name            TEXT NOT NULL,
  activity_type            TEXT NOT NULL,
  target_warehouse_item_id TEXT REFERENCES items_new(id) ON DELETE CASCADE,
  target_schema_name       TEXT,
  target_procedure_name    TEXT,
  parameters_json          TEXT,
  depends_on_json          TEXT,
  UNIQUE (pipeline_item_id, activity_name)
);

CREATE TABLE selected_tables_new (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspaces_new(id) ON DELETE CASCADE,
  warehouse_item_id TEXT NOT NULL REFERENCES items_new(id) ON DELETE CASCADE,
  schema_name       TEXT NOT NULL,
  table_name        TEXT NOT NULL
);

CREATE TABLE table_artifacts_new (
  selected_table_id    TEXT PRIMARY KEY REFERENCES selected_tables_new(id) ON DELETE CASCADE,
  warehouse_item_id    TEXT NOT NULL REFERENCES items_new(id) ON DELETE CASCADE,
  schema_name          TEXT NOT NULL,
  procedure_name       TEXT NOT NULL,
  pipeline_activity_id INTEGER REFERENCES pipeline_activities_new(id) ON DELETE CASCADE,
  discovery_status     TEXT NOT NULL
    CHECK(discovery_status IN ('resolved','orphan','duplicate_writer'))
);

CREATE TABLE candidacy_new (
  warehouse_item_id TEXT NOT NULL REFERENCES items_new(id) ON DELETE CASCADE,
  schema_name       TEXT NOT NULL,
  procedure_name    TEXT NOT NULL,
  tier              TEXT NOT NULL
    CHECK(tier IN ('migrate','review','reject')),
  reasoning         TEXT,
  overridden        INTEGER NOT NULL DEFAULT 0,
  override_reason   TEXT,
  PRIMARY KEY (warehouse_item_id, schema_name, procedure_name)
);

CREATE TABLE table_config_new (
  selected_table_id   TEXT PRIMARY KEY REFERENCES selected_tables_new(id) ON DELETE CASCADE,
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

INSERT INTO workspaces_new
SELECT
  id,
  display_name,
  migration_repo_path,
  created_at,
  fabric_url,
  migration_repo_name,
  fabric_service_principal_id,
  fabric_service_principal_secret,
  source_type,
  source_server,
  source_database,
  source_port,
  source_authentication_mode,
  source_username,
  source_password,
  source_encrypt,
  source_trust_server_certificate
FROM workspaces;

INSERT INTO items_new
SELECT id, workspace_id, display_name, description, folder_id, item_type, connection_string, collation_type
FROM items;

INSERT INTO warehouse_schemas_new
SELECT warehouse_item_id, schema_name, schema_id_local
FROM warehouse_schemas;

INSERT INTO warehouse_tables_new
SELECT warehouse_item_id, schema_name, table_name, object_id_local
FROM warehouse_tables;

INSERT INTO warehouse_procedures_new
SELECT warehouse_item_id, schema_name, procedure_name, object_id_local, sql_body
FROM warehouse_procedures;

INSERT INTO pipeline_activities_new
SELECT
  id,
  pipeline_item_id,
  activity_name,
  activity_type,
  target_warehouse_item_id,
  target_schema_name,
  target_procedure_name,
  parameters_json,
  depends_on_json
FROM pipeline_activities;

INSERT INTO selected_tables_new
SELECT id, workspace_id, warehouse_item_id, schema_name, table_name
FROM selected_tables;

INSERT INTO table_artifacts_new
SELECT
  selected_table_id,
  warehouse_item_id,
  schema_name,
  procedure_name,
  pipeline_activity_id,
  discovery_status
FROM table_artifacts;

INSERT INTO candidacy_new
SELECT
  warehouse_item_id,
  schema_name,
  procedure_name,
  tier,
  reasoning,
  overridden,
  override_reason
FROM candidacy;

INSERT INTO table_config_new
SELECT
  selected_table_id,
  table_type,
  load_strategy,
  grain_columns,
  relationships_json,
  incremental_column,
  date_column,
  snapshot_strategy,
  pii_columns,
  confirmed_at
FROM table_config;

DROP TABLE table_config;
DROP TABLE candidacy;
DROP TABLE table_artifacts;
DROP TABLE selected_tables;
DROP TABLE pipeline_activities;
DROP TABLE warehouse_procedures;
DROP TABLE warehouse_tables;
DROP TABLE warehouse_schemas;
DROP TABLE items;
DROP TABLE workspaces;

ALTER TABLE workspaces_new RENAME TO workspaces;
ALTER TABLE items_new RENAME TO items;
ALTER TABLE warehouse_schemas_new RENAME TO warehouse_schemas;
ALTER TABLE warehouse_tables_new RENAME TO warehouse_tables;
ALTER TABLE warehouse_procedures_new RENAME TO warehouse_procedures;
ALTER TABLE pipeline_activities_new RENAME TO pipeline_activities;
ALTER TABLE selected_tables_new RENAME TO selected_tables;
ALTER TABLE table_artifacts_new RENAME TO table_artifacts;
ALTER TABLE candidacy_new RENAME TO candidacy;
ALTER TABLE table_config_new RENAME TO table_config;

PRAGMA foreign_keys = ON;
