use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum CommandError {
    #[error("database error: {0}")]
    Database(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("io error: {0}")]
    Io(String),
    #[error("git error: {0}")]
    #[allow(dead_code)]
    Git(String),
}

impl From<rusqlite::Error> for CommandError {
    fn from(e: rusqlite::Error) -> Self {
        CommandError::Database(e.to_string())
    }
}

impl From<std::io::Error> for CommandError {
    fn from(e: std::io::Error) -> Self {
        CommandError::Io(e.to_string())
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub display_name: String,
    pub migration_repo_path: String,
    pub fabric_url: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub workspace_id: String,
    pub display_name: String,
    pub description: Option<String>,
    pub folder_id: Option<String>,
    pub item_type: String,
    pub connection_string: Option<String>,
    pub collation_type: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WarehouseSchema {
    pub warehouse_item_id: String,
    pub schema_name: String,
    pub schema_id_local: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WarehouseTable {
    pub warehouse_item_id: String,
    pub schema_name: String,
    pub table_name: String,
    pub object_id_local: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WarehouseProcedure {
    pub warehouse_item_id: String,
    pub schema_name: String,
    pub procedure_name: String,
    pub object_id_local: Option<i64>,
    pub sql_body: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PipelineActivity {
    pub id: Option<i64>,
    pub pipeline_item_id: String,
    pub activity_name: String,
    pub activity_type: String,
    pub target_warehouse_item_id: Option<String>,
    pub target_schema_name: Option<String>,
    pub target_procedure_name: Option<String>,
    pub parameters_json: Option<String>,
    pub depends_on_json: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SelectedTable {
    pub id: String,
    pub workspace_id: String,
    pub warehouse_item_id: String,
    pub schema_name: String,
    pub table_name: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TableArtifact {
    pub selected_table_id: String,
    pub warehouse_item_id: String,
    pub schema_name: String,
    pub procedure_name: String,
    pub pipeline_activity_id: Option<i64>,
    pub discovery_status: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Candidacy {
    pub warehouse_item_id: String,
    pub schema_name: String,
    pub procedure_name: String,
    pub tier: String,
    pub reasoning: Option<String>,
    pub overridden: bool,
    pub override_reason: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TableConfig {
    pub selected_table_id: String,
    pub table_type: Option<String>,
    pub load_strategy: Option<String>,
    pub grain_columns: Option<String>,
    pub relationships_json: Option<String>,
    pub incremental_column: Option<String>,
    pub date_column: Option<String>,
    pub snapshot_strategy: String,
    pub pii_columns: Option<String>,
    pub confirmed_at: Option<String>,
}
