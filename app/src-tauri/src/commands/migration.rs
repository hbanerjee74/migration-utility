use rusqlite::{params, OptionalExtension};
use tauri::State;

use crate::db::DbState;
use crate::types::{Candidacy, CommandError, SelectedTable, TableArtifact, TableConfig};

#[tauri::command]
pub fn migration_save_selected_tables(
    workspace_id: String,
    tables: Vec<SelectedTable>,
    state: State<DbState>,
) -> Result<(), CommandError> {
    log::info!(
        "migration_save_selected_tables: workspace_id={} count={}",
        workspace_id,
        tables.len()
    );
    let conn = state.0.lock().unwrap();
    let tx = conn.unchecked_transaction().map_err(|e| {
        log::error!("migration_save_selected_tables: failed to begin transaction: {e}");
        CommandError::from(e)
    })?;
    for table in &tables {
        log::debug!(
            "migration_save_selected_tables: upserting table id={}",
            table.id
        );
        tx.execute(
            "INSERT OR REPLACE INTO selected_tables(id, workspace_id, warehouse_item_id, schema_name, table_name)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                table.id,
                table.workspace_id,
                table.warehouse_item_id,
                table.schema_name,
                table.table_name,
            ],
        )
        .map_err(|e| {
            log::error!(
                "migration_save_selected_tables: failed to upsert table {}: {e}",
                table.id
            );
            CommandError::from(e)
        })?;
    }
    tx.commit().map_err(|e| {
        log::error!("migration_save_selected_tables: failed to commit: {e}");
        CommandError::from(e)
    })?;
    Ok(())
}

#[tauri::command]
pub fn migration_save_table_artifact(
    artifact: TableArtifact,
    state: State<DbState>,
) -> Result<(), CommandError> {
    log::info!(
        "migration_save_table_artifact: selected_table_id={}",
        artifact.selected_table_id
    );
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO table_artifacts(selected_table_id, warehouse_item_id, schema_name, procedure_name, pipeline_activity_id, discovery_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            artifact.selected_table_id,
            artifact.warehouse_item_id,
            artifact.schema_name,
            artifact.procedure_name,
            artifact.pipeline_activity_id,
            artifact.discovery_status,
        ],
    )
    .map_err(|e| {
        log::error!("migration_save_table_artifact: failed: {e}");
        CommandError::from(e)
    })?;
    Ok(())
}

#[tauri::command]
pub fn migration_save_candidacy(
    candidacy: Candidacy,
    state: State<DbState>,
) -> Result<(), CommandError> {
    log::info!(
        "migration_save_candidacy: warehouse_item_id={} schema={} procedure={}",
        candidacy.warehouse_item_id,
        candidacy.schema_name,
        candidacy.procedure_name
    );
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO candidacy(warehouse_item_id, schema_name, procedure_name, tier, reasoning, overridden, override_reason)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            candidacy.warehouse_item_id,
            candidacy.schema_name,
            candidacy.procedure_name,
            candidacy.tier,
            candidacy.reasoning,
            candidacy.overridden as i64,
            candidacy.override_reason,
        ],
    )
    .map_err(|e| {
        log::error!("migration_save_candidacy: failed: {e}");
        CommandError::from(e)
    })?;
    Ok(())
}

#[tauri::command]
pub fn migration_override_candidacy(
    warehouse_item_id: String,
    schema_name: String,
    procedure_name: String,
    new_tier: String,
    reason: String,
    state: State<DbState>,
) -> Result<(), CommandError> {
    log::info!(
        "migration_override_candidacy: warehouse_item_id={} schema={} procedure={} new_tier={}",
        warehouse_item_id,
        schema_name,
        procedure_name,
        new_tier
    );
    let conn = state.0.lock().unwrap();
    let rows_affected = conn
        .execute(
            "UPDATE candidacy SET tier=?1, overridden=1, override_reason=?2 WHERE warehouse_item_id=?3 AND schema_name=?4 AND procedure_name=?5",
            params![new_tier, reason, warehouse_item_id, schema_name, procedure_name],
        )
        .map_err(|e| {
            log::error!("migration_override_candidacy: failed: {e}");
            CommandError::from(e)
        })?;
    if rows_affected == 0 {
        log::error!(
            "migration_override_candidacy: not found {}.{}",
            schema_name,
            procedure_name
        );
        return Err(CommandError::NotFound(format!(
            "{}.{}",
            schema_name, procedure_name
        )));
    }
    Ok(())
}

#[tauri::command]
pub fn migration_list_candidacy(
    workspace_id: String,
    state: State<DbState>,
) -> Result<Vec<Candidacy>, CommandError> {
    log::info!("migration_list_candidacy: workspace_id={}", workspace_id);
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT c.warehouse_item_id, c.schema_name, c.procedure_name, c.tier, c.reasoning, c.overridden, c.override_reason
             FROM candidacy c
             INNER JOIN table_artifacts ta
               ON ta.warehouse_item_id = c.warehouse_item_id
               AND ta.schema_name = c.schema_name
               AND ta.procedure_name = c.procedure_name
             INNER JOIN selected_tables st
               ON st.id = ta.selected_table_id
               AND st.workspace_id = ?1",
        )
        .map_err(|e| {
            log::error!("migration_list_candidacy: failed to prepare query: {e}");
            CommandError::from(e)
        })?;

    let rows = stmt
        .query_map(params![workspace_id], |row| {
            let overridden_int: i64 = row.get(5)?;
            Ok(Candidacy {
                warehouse_item_id: row.get(0)?,
                schema_name: row.get(1)?,
                procedure_name: row.get(2)?,
                tier: row.get(3)?,
                reasoning: row.get(4)?,
                overridden: overridden_int != 0,
                override_reason: row.get(6)?,
            })
        })
        .map_err(|e| {
            log::error!("migration_list_candidacy: query failed: {e}");
            CommandError::from(e)
        })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| {
            log::error!("migration_list_candidacy: row error: {e}");
            CommandError::from(e)
        })?);
    }
    Ok(results)
}

#[tauri::command]
pub fn migration_save_table_config(
    config: TableConfig,
    state: State<DbState>,
) -> Result<(), CommandError> {
    log::info!(
        "migration_save_table_config: selected_table_id={}",
        config.selected_table_id
    );
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO table_config(selected_table_id, table_type, load_strategy, grain_columns, relationships_json, incremental_column, date_column, snapshot_strategy, pii_columns, confirmed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            config.selected_table_id,
            config.table_type,
            config.load_strategy,
            config.grain_columns,
            config.relationships_json,
            config.incremental_column,
            config.date_column,
            config.snapshot_strategy,
            config.pii_columns,
            config.confirmed_at,
        ],
    )
    .map_err(|e| {
        log::error!("migration_save_table_config: failed: {e}");
        CommandError::from(e)
    })?;
    Ok(())
}

#[tauri::command]
pub fn migration_get_table_config(
    selected_table_id: String,
    state: State<DbState>,
) -> Result<Option<TableConfig>, CommandError> {
    log::info!(
        "migration_get_table_config: selected_table_id={}",
        selected_table_id
    );
    let conn = state.0.lock().unwrap();
    let result = conn
        .query_row(
            "SELECT selected_table_id, table_type, load_strategy, grain_columns, relationships_json, incremental_column, date_column, snapshot_strategy, pii_columns, confirmed_at
             FROM table_config WHERE selected_table_id=?1",
            params![selected_table_id],
            |row| {
                Ok(TableConfig {
                    selected_table_id: row.get(0)?,
                    table_type: row.get(1)?,
                    load_strategy: row.get(2)?,
                    grain_columns: row.get(3)?,
                    relationships_json: row.get(4)?,
                    incremental_column: row.get(5)?,
                    date_column: row.get(6)?,
                    snapshot_strategy: row.get(7)?,
                    pii_columns: row.get(8)?,
                    confirmed_at: row.get(9)?,
                })
            },
        )
        .optional()
        .map_err(|e| {
            log::error!("migration_get_table_config: failed: {e}");
            CommandError::from(e)
        })?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn setup_workspace_and_item(conn: &rusqlite::Connection) -> (String, String) {
        let ws_id = uuid::Uuid::new_v4().to_string();
        let item_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO workspaces(id, display_name, migration_repo_path, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![ws_id, "Test Workspace", "/tmp/repo", "2026-01-01T00:00:00Z"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items(id, workspace_id, display_name, item_type) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![item_id, ws_id, "Warehouse", "Warehouse"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO warehouse_schemas(warehouse_item_id, schema_name) VALUES (?1, ?2)",
            rusqlite::params![item_id, "dbo"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO warehouse_procedures(warehouse_item_id, schema_name, procedure_name) VALUES (?1, ?2, ?3)",
            rusqlite::params![item_id, "dbo", "sp_load"],
        )
        .unwrap();
        (ws_id, item_id)
    }

    #[test]
    fn override_candidacy_sets_overridden_flag() {
        let conn = db::open_in_memory().unwrap();
        let (ws_id, item_id) = setup_workspace_and_item(&conn);

        // Insert a selected_table
        let st_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO selected_tables(id, workspace_id, warehouse_item_id, schema_name, table_name) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![st_id, ws_id, item_id, "dbo", "orders"],
        )
        .unwrap();

        // Insert a table_artifact
        conn.execute(
            "INSERT INTO table_artifacts(selected_table_id, warehouse_item_id, schema_name, procedure_name, discovery_status) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![st_id, item_id, "dbo", "sp_load", "resolved"],
        )
        .unwrap();

        // Insert a candidacy record
        conn.execute(
            "INSERT INTO candidacy(warehouse_item_id, schema_name, procedure_name, tier, overridden) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![item_id, "dbo", "sp_load", "migrate", 0],
        )
        .unwrap();

        // Override
        let rows = conn.execute(
            "UPDATE candidacy SET tier=?1, overridden=1, override_reason=?2 WHERE warehouse_item_id=?3 AND schema_name=?4 AND procedure_name=?5",
            rusqlite::params!["reject", "Not suitable", item_id, "dbo", "sp_load"],
        )
        .unwrap();
        assert_eq!(rows, 1);

        let (tier, overridden, reason): (String, i64, Option<String>) = conn
            .query_row(
                "SELECT tier, overridden, override_reason FROM candidacy WHERE warehouse_item_id=?1 AND schema_name=?2 AND procedure_name=?3",
                rusqlite::params![item_id, "dbo", "sp_load"],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(tier, "reject");
        assert_eq!(overridden, 1);
        assert_eq!(reason.as_deref(), Some("Not suitable"));
    }

    #[test]
    fn list_candidacy_returns_items_for_workspace() {
        let conn = db::open_in_memory().unwrap();
        let (ws_id, item_id) = setup_workspace_and_item(&conn);

        // Second workspace — its candidacy should NOT appear
        let ws2_id = uuid::Uuid::new_v4().to_string();
        let item2_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO workspaces(id, display_name, migration_repo_path, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![ws2_id, "Other Workspace", "/tmp/other", "2026-01-01T00:00:00Z"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items(id, workspace_id, display_name, item_type) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![item2_id, ws2_id, "Warehouse2", "Warehouse"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO warehouse_schemas(warehouse_item_id, schema_name) VALUES (?1, ?2)",
            rusqlite::params![item2_id, "dbo"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO warehouse_procedures(warehouse_item_id, schema_name, procedure_name) VALUES (?1, ?2, ?3)",
            rusqlite::params![item2_id, "dbo", "sp_other"],
        )
        .unwrap();

        // Insert selected_table + artifact + candidacy for workspace 1
        let st_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO selected_tables(id, workspace_id, warehouse_item_id, schema_name, table_name) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![st_id, ws_id, item_id, "dbo", "orders"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO table_artifacts(selected_table_id, warehouse_item_id, schema_name, procedure_name, discovery_status) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![st_id, item_id, "dbo", "sp_load", "resolved"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO candidacy(warehouse_item_id, schema_name, procedure_name, tier, overridden) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![item_id, "dbo", "sp_load", "migrate", 0],
        )
        .unwrap();

        // Insert selected_table + artifact + candidacy for workspace 2
        let st2_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO selected_tables(id, workspace_id, warehouse_item_id, schema_name, table_name) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![st2_id, ws2_id, item2_id, "dbo", "other_table"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO table_artifacts(selected_table_id, warehouse_item_id, schema_name, procedure_name, discovery_status) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![st2_id, item2_id, "dbo", "sp_other", "resolved"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO candidacy(warehouse_item_id, schema_name, procedure_name, tier, overridden) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![item2_id, "dbo", "sp_other", "reject", 0],
        )
        .unwrap();

        // Query for workspace 1 only
        let mut stmt = conn
            .prepare(
                "SELECT DISTINCT c.warehouse_item_id, c.schema_name, c.procedure_name, c.tier, c.reasoning, c.overridden, c.override_reason
                 FROM candidacy c
                 INNER JOIN selected_tables st ON st.workspace_id = ?1
                 INNER JOIN table_artifacts ta ON ta.selected_table_id = st.id
                   AND ta.warehouse_item_id = c.warehouse_item_id
                   AND ta.schema_name = c.schema_name
                   AND ta.procedure_name = c.procedure_name",
            )
            .unwrap();

        let results: Vec<Candidacy> = stmt
            .query_map(rusqlite::params![ws_id], |row| {
                let overridden_int: i64 = row.get(5)?;
                Ok(Candidacy {
                    warehouse_item_id: row.get(0)?,
                    schema_name: row.get(1)?,
                    procedure_name: row.get(2)?,
                    tier: row.get(3)?,
                    reasoning: row.get(4)?,
                    overridden: overridden_int != 0,
                    override_reason: row.get(6)?,
                })
            })
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].procedure_name, "sp_load");
        assert_eq!(results[0].tier, "migrate");
    }
}
