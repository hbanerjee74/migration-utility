CREATE TABLE IF NOT EXISTS sources (
  id                               TEXT PRIMARY KEY,
  workspace_id                     TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_type                      TEXT NOT NULL,
  external_source_id               TEXT NOT NULL,
  display_name                     TEXT,
  source_server                    TEXT,
  source_database                  TEXT,
  source_port                      INTEGER,
  source_authentication_mode       TEXT,
  created_at                       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sources_external
  ON sources(source_type, external_source_id);

CREATE TABLE IF NOT EXISTS containers (
  id                    TEXT PRIMARY KEY,
  source_id             TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  container_type        TEXT NOT NULL,
  external_container_id TEXT NOT NULL,
  container_name        TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_containers_external
  ON containers(source_id, container_type, external_container_id);
CREATE INDEX IF NOT EXISTS ix_containers_source_id
  ON containers(source_id);

CREATE TABLE IF NOT EXISTS namespaces (
  id                    TEXT PRIMARY KEY,
  container_id          TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  namespace_name        TEXT NOT NULL,
  external_namespace_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_namespaces_natural
  ON namespaces(container_id, namespace_name);
CREATE INDEX IF NOT EXISTS ix_namespaces_container_id
  ON namespaces(container_id);

CREATE TABLE IF NOT EXISTS data_objects (
  id                 TEXT PRIMARY KEY,
  namespace_id       TEXT NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
  object_name        TEXT NOT NULL,
  object_type        TEXT NOT NULL
    CHECK(object_type IN ('table', 'view', 'procedure', 'function', 'unknown')),
  external_object_id TEXT,
  sql_body           TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_data_objects_natural
  ON data_objects(namespace_id, object_name, object_type);
CREATE INDEX IF NOT EXISTS ix_data_objects_namespace_id
  ON data_objects(namespace_id);

CREATE TABLE IF NOT EXISTS orchestration_items (
  id                        TEXT PRIMARY KEY,
  source_id                 TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  orchestration_type        TEXT NOT NULL,
  external_orchestration_id TEXT,
  orchestration_name        TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_orchestration_items_external
  ON orchestration_items(source_id, orchestration_type, external_orchestration_id);
CREATE INDEX IF NOT EXISTS ix_orchestration_items_source_id
  ON orchestration_items(source_id);

CREATE TABLE IF NOT EXISTS orchestration_activities (
  id                        TEXT PRIMARY KEY,
  orchestration_item_id     TEXT NOT NULL REFERENCES orchestration_items(id) ON DELETE CASCADE,
  activity_name             TEXT NOT NULL,
  external_activity_id      TEXT,
  activity_type             TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_orchestration_activities_natural
  ON orchestration_activities(orchestration_item_id, activity_name);
CREATE INDEX IF NOT EXISTS ix_orchestration_activities_item_id
  ON orchestration_activities(orchestration_item_id);

CREATE TABLE IF NOT EXISTS activity_object_links (
  id                        TEXT PRIMARY KEY,
  orchestration_activity_id TEXT NOT NULL REFERENCES orchestration_activities(id) ON DELETE CASCADE,
  data_object_id            TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  access_type               TEXT NOT NULL
    CHECK(access_type IN ('read', 'write', 'reference', 'unknown')),
  evidence_source           TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_activity_object_links
  ON activity_object_links(orchestration_activity_id, data_object_id, access_type, evidence_source);
CREATE INDEX IF NOT EXISTS ix_activity_object_links_activity_id
  ON activity_object_links(orchestration_activity_id);
CREATE INDEX IF NOT EXISTS ix_activity_object_links_data_object_id
  ON activity_object_links(data_object_id);

CREATE TABLE IF NOT EXISTS sqlserver_object_columns (
  id             TEXT PRIMARY KEY,
  data_object_id TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  column_name    TEXT NOT NULL,
  column_id      INTEGER,
  data_type      TEXT,
  is_nullable    INTEGER
);

CREATE TABLE IF NOT EXISTS sqlserver_constraints_indexes (
  id                TEXT PRIMARY KEY,
  data_object_id    TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  constraint_name   TEXT,
  index_name        TEXT,
  constraint_type   TEXT,
  definition_json   TEXT
);

CREATE TABLE IF NOT EXISTS sqlserver_partitions (
  id               TEXT PRIMARY KEY,
  data_object_id   TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  partition_number INTEGER,
  row_count        INTEGER
);

CREATE TABLE IF NOT EXISTS sqlserver_procedure_parameters (
  id               TEXT PRIMARY KEY,
  data_object_id   TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  parameter_name   TEXT NOT NULL,
  parameter_id     INTEGER,
  parameter_type   TEXT,
  is_output        INTEGER
);

CREATE TABLE IF NOT EXISTS sqlserver_procedure_runtime_stats (
  id                      TEXT PRIMARY KEY,
  data_object_id          TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  last_execution_time     TEXT,
  execution_count         INTEGER,
  avg_duration_ms         REAL
);

CREATE TABLE IF NOT EXISTS sqlserver_procedure_lineage (
  id                        TEXT PRIMARY KEY,
  procedure_data_object_id  TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  table_data_object_id      TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  lineage_type              TEXT
);

CREATE TABLE IF NOT EXISTS sqlserver_table_ddl_snapshots (
  id               TEXT PRIMARY KEY,
  data_object_id   TEXT NOT NULL REFERENCES data_objects(id) ON DELETE CASCADE,
  ddl_sql          TEXT NOT NULL,
  captured_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
