# Database Design

SQLite database local to the Tauri desktop app.

This schema is connector-pluggable (VU-374 direction): each connector extracts
its metadata into one canonical model used by scope, candidate selection, and planning.

## Canonical Model

### 1) `sources`

Top-level configured source context in the app (connection profile + local repo context + workflow state).

`source_type` selects the extractor implementation (currently SQL Server).

Connector mapping:

- SQL Server: connection
- Fabric: workspace

### 2) `containers`

Top-level units discovered under a source.

Examples by connector:

- SQL Server: database
- Fabric: Warehouse item, Lakehouse item

### 3) `namespaces`

Logical namespace within a data container.

Examples:

- SQL Server: schema
- Fabric Warehouse: schema
- Fabric Lakehouse: schema (or connector-normalized default namespace)

### 4) `data_objects`

Objects discovered within a namespace.

Examples:

- table
- view
- procedure
- function

### 5) `orchestration_items`

Parent orchestration units directly under a source.

Examples:

- Fabric: pipeline
- SQL Server: optional future mapping (job/task orchestration, if ingested)

### 6) `orchestration_activities`

Activity/step rows under an orchestration item.

Examples:

- Fabric: pipeline activity from definition JSON

### 7) `activity_object_links`

Read/write/reference links from an orchestration activity to a data object.

### 8) Connector extension tables

Connector-specific metadata keyed by canonical IDs. These add depth without changing the canonical flow.

Examples:

- SQL Server runtime stats
- SQL Server partition metadata
- SQL Server procedure parameter metadata
- DDL snapshots

## Canonical Relationships

```text
source
├── container (data)
│   └── namespace
│       └── data_object
└── orchestration_item
    └── orchestration_activity
        └── activity_object_link -> data_object
```

Execution metadata is intentionally modeled as a separate branch and references data objects via link tables.

## Foundational Detailed Table Contracts

This section is the canonical contract for local SQLite table design. It keeps top-level concepts and implementation details in one place.

### Canonical Core Tables

| Local table | Description | PK columns | FK columns | Unique index | FK index | SQL Server physical ID mapping | Fabric Warehouse physical ID mapping | Fabric Lakehouse physical ID mapping |
|---|---|---|---|---|---|---|---|---|
| `sources` | Top-level configured source context | `id` | — | `ux_sources_external (source_type, external_source_id)` | — | `external_source_id = sanitized_connection_identity` | `external_source_id = workspace_id` | `external_source_id = workspace_id` |
| `containers` | Data containers under a source | `id` | `source_id -> sources.id` | `ux_containers_external (source_id, container_type, external_container_id)` | `ix_containers_source_id (source_id)` | `external_container_id = sys.databases.database_id` | `external_container_id = items.id (Warehouse)` | `external_container_id = items.id (Lakehouse)` |
| `namespaces` | Schema/namespace under a container | `id` | `container_id -> containers.id` | `ux_namespaces_natural (container_id, namespace_name)` | `ix_namespaces_container_id (container_id)` | `external_namespace_id = sys.schemas.schema_id` | `external_namespace_id = sys.schemas.schema_id (if available)` | `external_namespace_id = null` |
| `data_objects` | Table/view/procedure/function in namespace | `id` | `namespace_id -> namespaces.id` | `ux_data_objects_natural (namespace_id, object_name, object_type)` | `ix_data_objects_namespace_id (namespace_id)` | `external_object_id = sys.objects.object_id` | `external_object_id = sys.objects.object_id (if available)` | `external_object_id = null` |
| `orchestration_items` | Parent orchestration unit | `id` | `source_id -> sources.id` | `ux_orchestration_items_external (source_id, orchestration_type, external_orchestration_id)` | `ix_orchestration_items_source_id (source_id)` | `null` | `external_orchestration_id = DataPipeline item id` | `external_orchestration_id = DataPipeline item id` |
| `orchestration_activities` | Activities under orchestration item | `id` | `orchestration_item_id -> orchestration_items.id` | `ux_orchestration_activities_natural (orchestration_item_id, activity_name)` | `ix_orchestration_activities_item_id (orchestration_item_id)` | `null` | `external_activity_id = null (use activity_name)` | `external_activity_id = null (use activity_name)` |
| `activity_object_links` | Activity-to-object dependency links | `id` | `orchestration_activity_id -> orchestration_activities.id`; `data_object_id -> data_objects.id` | `ux_activity_object_links (orchestration_activity_id, data_object_id, access_type, evidence_source)` | `ix_activity_object_links_activity_id (orchestration_activity_id)`; `ix_activity_object_links_data_object_id (data_object_id)` | `derived` | `derived` | `derived` |

### SQL Server Extension Tables (Current Implemented Depth)

| Local table | Description | PK columns | FK columns | Physical ID basis |
|---|---|---|---|---|
| `sqlserver_object_columns` | Column metadata per source object | `id` | `data_object_id -> data_objects.id` | `sys.columns.column_id` within `sys.objects.object_id` |
| `sqlserver_constraints_indexes` | PK/FK/unique/check/index metadata | `id` | `data_object_id -> data_objects.id` | Constraint/index names scoped by table |
| `sqlserver_partitions` | Partition structure and metrics | `id` | `data_object_id -> data_objects.id` | `sys.partitions.partition_number` |
| `sqlserver_procedure_parameters` | Procedure parameter metadata | `id` | `data_object_id -> data_objects.id` | `sys.parameters.parameter_id` |
| `sqlserver_procedure_runtime_stats` | Procedure runtime recency and usage stats | `id` | `data_object_id -> data_objects.id` | Query Store and/or DMV procedure stats keyed to procedure object identity |
| `sqlserver_procedure_lineage` | Procedure-to-table lineage edges | `id` | `procedure_data_object_id -> data_objects.id`; `table_data_object_id -> data_objects.id` | Derived from dependency metadata |
| `sqlserver_table_ddl_snapshots` | Stored table DDL snapshots | `id` | `data_object_id -> data_objects.id` | Table logical key + captured DDL |

### Accuracy Notes for Physical IDs

- SQL Server provides stable local IDs for databases (`database_id`), schemas (`schema_id`), objects (`object_id`), columns (`column_id`), and procedure parameters (`parameter_id`).
- SQL Server `sources.external_source_id` should be a sanitized canonical connection identity (never raw credential-bearing connection strings).
- Fabric Items APIs provide stable item IDs for Warehouse, Lakehouse, and DataPipeline items (`items.id`).
- Fabric pipeline activity identity in definitions is activity `name` within a pipeline; no separate documented activity GUID.
- Fabric Lakehouse table APIs document table name/type/location fields but do not document a stable table UUID; use logical key plus location/path when needed.

### API References Used for ID Mapping

- SQL Server `sys.databases`: https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-databases-transact-sql
- SQL Server `sys.schemas`: https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/schemas-catalog-views-sys-schemas
- SQL Server `sys.columns`: https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-columns-transact-sql
- SQL Server object catalogs (`sys.all_objects`/`sys.system_objects`): https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-system-objects-transact-sql
- SQL Server `sys.parameters`: https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-parameters-transact-sql
- Fabric Core Items List (Warehouse/Lakehouse/DataPipeline IDs): https://learn.microsoft.com/en-us/rest/api/fabric/core/items/list-items
- Fabric DataPipeline definition (activities): https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/get-data-pipeline-definition
- Fabric Lakehouse table APIs: https://learn.microsoft.com/en-us/rest/api/fabric/lakehouse/tables/list-tables

## Apply and Refresh Semantics

### Settings -> Source -> Apply

Apply initializes or refreshes local source metadata for the selected source:

- validates connection and access
- loads/discovers canonical entities
- writes canonical tables and connector extensions
- supports progress + cancel
- runs once per source setup; subsequent metadata refresh is handled in Scope

### Scope -> Select Tables -> Refresh Schema

Refresh is performed from scope (not settings) and re-syncs source metadata used for table selection and downstream planning.

## FK Delete Policy

Delete behavior is cascade-by-default. This app does not preserve historical user decision records when upstream source entities are removed.

### Cascading FK chains

- `sources -> containers -> namespaces -> data_objects`
- `sources -> orchestration_items -> orchestration_activities -> activity_object_links`
- `data_objects -> activity_object_links`
- `data_objects -> sqlserver_*` extension tables
- Scope/planning/user-decision tables should cascade from their parent rows

### Rule

- Default FK action: `ON DELETE CASCADE`
- Use `RESTRICT` only when a specific business rule requires blocking deletion
- No soft-delete requirement for source mirror or user-decision tables in this model

## Naming Note

This design uses `source` as the top-level concept. Existing physical tables may temporarily use legacy names during migration; implementation should converge on the canonical names above.
