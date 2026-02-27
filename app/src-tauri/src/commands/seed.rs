#![cfg(debug_assertions)]

use rusqlite::params;
use tauri::State;

use crate::db::DbState;
use crate::types::CommandError;

#[tauri::command]
pub fn seed_mock_data(state: State<DbState>) -> Result<(), CommandError> {
    log::info!("seed_mock_data: seeding database with mock data");
    let conn = state.0.lock().unwrap();
    let tx = conn.unchecked_transaction().map_err(|e| {
        log::error!("seed_mock_data: failed to begin transaction: {e}");
        CommandError::from(e)
    })?;

    // Workspace
    log::debug!("seed_mock_data: inserting workspace");
    tx.execute(
        "INSERT OR REPLACE INTO workspaces(id, display_name, migration_repo_path, created_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            "mock-ws-1",
            "Demo Migration",
            "/tmp/vibedata-migration",
            "2026-01-01T00:00:00Z",
        ],
    )
    .map_err(|e| {
        log::error!("seed_mock_data: failed to insert workspace: {e}");
        CommandError::from(e)
    })?;

    // Items: 1 warehouse + 2 pipelines
    log::debug!("seed_mock_data: inserting items");
    let items = [
        ("mock-wh-1", "Sales Warehouse", "Warehouse"),
        ("mock-pipe-1", "Load Pipeline (Linear)", "DataPipeline"),
        ("mock-pipe-2", "Load Pipeline (Fan-out)", "DataPipeline"),
    ];
    for (id, display_name, item_type) in &items {
        tx.execute(
            "INSERT OR REPLACE INTO items(id, workspace_id, display_name, item_type)
             VALUES (?1, ?2, ?3, ?4)",
            params![id, "mock-ws-1", display_name, item_type],
        )
        .map_err(|e| {
            log::error!("seed_mock_data: failed to insert item {}: {e}", id);
            CommandError::from(e)
        })?;
    }

    // Schema: dbo on mock-wh-1
    log::debug!("seed_mock_data: inserting warehouse schema");
    tx.execute(
        "INSERT OR REPLACE INTO warehouse_schemas(warehouse_item_id, schema_name)
         VALUES (?1, ?2)",
        params!["mock-wh-1", "dbo"],
    )
    .map_err(|e| {
        log::error!("seed_mock_data: failed to insert schema: {e}");
        CommandError::from(e)
    })?;

    // Tables + procedures
    log::debug!("seed_mock_data: inserting warehouse tables and procedures");
    let tables = [
        ("orders", "sp_load_orders"),
        ("customers", "sp_load_customers"),
        ("products", "sp_load_products"),
        ("returns", "sp_load_returns"),
        ("inventory", "sp_load_inventory"),
    ];
    for (table_name, _proc_name) in &tables {
        tx.execute(
            "INSERT OR REPLACE INTO warehouse_tables(warehouse_item_id, schema_name, table_name)
             VALUES (?1, ?2, ?3)",
            params!["mock-wh-1", "dbo", table_name],
        )
        .map_err(|e| {
            log::error!("seed_mock_data: failed to insert table {}: {e}", table_name);
            CommandError::from(e)
        })?;
    }
    for (_table_name, proc_name) in &tables {
        tx.execute(
            "INSERT OR REPLACE INTO warehouse_procedures(warehouse_item_id, schema_name, procedure_name)
             VALUES (?1, ?2, ?3)",
            params!["mock-wh-1", "dbo", proc_name],
        )
        .map_err(|e| {
            log::error!("seed_mock_data: failed to insert procedure {}: {e}", proc_name);
            CommandError::from(e)
        })?;
    }

    // Candidacy rows
    log::debug!("seed_mock_data: inserting candidacy");
    let candidacy = [
        ("sp_load_orders", "migrate"),
        ("sp_load_customers", "migrate"),
        ("sp_load_products", "review"),
        ("sp_load_returns", "reject"),
        ("sp_load_inventory", "review"),
    ];
    for (proc_name, tier) in &candidacy {
        tx.execute(
            "INSERT OR REPLACE INTO candidacy(warehouse_item_id, schema_name, procedure_name, tier)
             VALUES (?1, ?2, ?3, ?4)",
            params!["mock-wh-1", "dbo", proc_name, tier],
        )
        .map_err(|e| {
            log::error!("seed_mock_data: failed to insert candidacy for {}: {e}", proc_name);
            CommandError::from(e)
        })?;
    }

    // Selected tables
    log::debug!("seed_mock_data: inserting selected tables");
    let selected_tables = [
        ("mock-st-1", "orders"),
        ("mock-st-2", "customers"),
        ("mock-st-3", "products"),
        ("mock-st-4", "returns"),
        ("mock-st-5", "inventory"),
    ];
    for (st_id, table_name) in &selected_tables {
        tx.execute(
            "INSERT OR REPLACE INTO selected_tables(id, workspace_id, warehouse_item_id, schema_name, table_name)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![st_id, "mock-ws-1", "mock-wh-1", "dbo", table_name],
        )
        .map_err(|e| {
            log::error!("seed_mock_data: failed to insert selected_table {}: {e}", st_id);
            CommandError::from(e)
        })?;
    }

    // Table artifacts
    log::debug!("seed_mock_data: inserting table artifacts");
    let artifacts = [
        ("mock-st-1", "sp_load_orders"),
        ("mock-st-2", "sp_load_customers"),
        ("mock-st-3", "sp_load_products"),
        ("mock-st-4", "sp_load_returns"),
        ("mock-st-5", "sp_load_inventory"),
    ];
    for (st_id, proc_name) in &artifacts {
        tx.execute(
            "INSERT OR REPLACE INTO table_artifacts(selected_table_id, warehouse_item_id, schema_name, procedure_name, discovery_status)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![st_id, "mock-wh-1", "dbo", proc_name, "resolved"],
        )
        .map_err(|e| {
            log::error!("seed_mock_data: failed to insert table_artifact {}: {e}", st_id);
            CommandError::from(e)
        })?;
    }

    // Pipeline activities for pipe1 (linear): Load Orders then Load Customers
    log::debug!("seed_mock_data: inserting pipeline activities for pipe1 (linear)");
    tx.execute(
        "INSERT OR REPLACE INTO pipeline_activities(pipeline_item_id, activity_name, activity_type,
          target_warehouse_item_id, target_schema_name, target_procedure_name, depends_on_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            "mock-pipe-1",
            "Load Orders",
            "SqlServerStoredProcedure",
            "mock-wh-1",
            "dbo",
            "sp_load_orders",
            Option::<String>::None,
        ],
    )
    .map_err(|e| {
        log::error!("seed_mock_data: failed to insert Load Orders activity: {e}");
        CommandError::from(e)
    })?;
    tx.execute(
        "INSERT OR REPLACE INTO pipeline_activities(pipeline_item_id, activity_name, activity_type,
          target_warehouse_item_id, target_schema_name, target_procedure_name, depends_on_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            "mock-pipe-1",
            "Load Customers",
            "SqlServerStoredProcedure",
            "mock-wh-1",
            "dbo",
            "sp_load_customers",
            r#"["Load Orders"]"#,
        ],
    )
    .map_err(|e| {
        log::error!("seed_mock_data: failed to insert Load Customers activity: {e}");
        CommandError::from(e)
    })?;

    // Pipeline activities for pipe2 (fan-out): Load Products, Load Returns, Load Inventory — all independent
    log::debug!("seed_mock_data: inserting pipeline activities for pipe2 (fan-out)");
    let fanout_activities = [
        ("Load Products", "sp_load_products"),
        ("Load Returns", "sp_load_returns"),
        ("Load Inventory", "sp_load_inventory"),
    ];
    for (activity_name, proc_name) in &fanout_activities {
        tx.execute(
            "INSERT OR REPLACE INTO pipeline_activities(pipeline_item_id, activity_name, activity_type,
              target_warehouse_item_id, target_schema_name, target_procedure_name)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                "mock-pipe-2",
                activity_name,
                "SqlServerStoredProcedure",
                "mock-wh-1",
                "dbo",
                proc_name,
            ],
        )
        .map_err(|e| {
            log::error!("seed_mock_data: failed to insert {} activity: {e}", activity_name);
            CommandError::from(e)
        })?;
    }

    // Table config for mock-st-1 (orders)
    log::debug!("seed_mock_data: inserting table_config for orders");
    tx.execute(
        "INSERT OR REPLACE INTO table_config(selected_table_id, table_type, load_strategy, grain_columns,
          incremental_column, date_column, snapshot_strategy, pii_columns, confirmed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            "mock-st-1",
            "fact",
            "incremental",
            "order_id",
            "updated_at",
            "order_date",
            "sample_1day",
            "customer_email,customer_name",
            "2026-01-01T00:00:00Z",
        ],
    )
    .map_err(|e| {
        log::error!("seed_mock_data: failed to insert table_config for mock-st-1: {e}");
        CommandError::from(e)
    })?;

    tx.commit().map_err(|e| {
        log::error!("seed_mock_data: failed to commit transaction: {e}");
        CommandError::from(e)
    })?;

    log::info!("seed_mock_data: completed successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    #[test]
    fn seed_inserts_expected_rows() {
        let conn = db::open_in_memory().unwrap();

        // Manually run same inserts to verify the schema accepts them
        conn.execute(
            "INSERT OR REPLACE INTO workspaces(id, display_name, migration_repo_path, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                "mock-ws-1",
                "Demo Migration",
                "/tmp/vibedata-migration",
                "2026-01-01T00:00:00Z",
            ],
        )
        .unwrap();

        let items = [
            ("mock-wh-1", "Sales Warehouse", "Warehouse"),
            ("mock-pipe-1", "Load Pipeline (Linear)", "DataPipeline"),
            ("mock-pipe-2", "Load Pipeline (Fan-out)", "DataPipeline"),
        ];
        for (id, display_name, item_type) in &items {
            conn.execute(
                "INSERT OR REPLACE INTO items(id, workspace_id, display_name, item_type)
                 VALUES (?1, ?2, ?3, ?4)",
                params![id, "mock-ws-1", display_name, item_type],
            )
            .unwrap();
        }

        conn.execute(
            "INSERT OR REPLACE INTO warehouse_schemas(warehouse_item_id, schema_name)
             VALUES (?1, ?2)",
            params!["mock-wh-1", "dbo"],
        )
        .unwrap();

        let tables = [
            ("orders", "sp_load_orders"),
            ("customers", "sp_load_customers"),
            ("products", "sp_load_products"),
            ("returns", "sp_load_returns"),
            ("inventory", "sp_load_inventory"),
        ];
        for (table_name, _) in &tables {
            conn.execute(
                "INSERT OR REPLACE INTO warehouse_tables(warehouse_item_id, schema_name, table_name)
                 VALUES (?1, ?2, ?3)",
                params!["mock-wh-1", "dbo", table_name],
            )
            .unwrap();
        }
        for (_, proc_name) in &tables {
            conn.execute(
                "INSERT OR REPLACE INTO warehouse_procedures(warehouse_item_id, schema_name, procedure_name)
                 VALUES (?1, ?2, ?3)",
                params!["mock-wh-1", "dbo", proc_name],
            )
            .unwrap();
        }

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM warehouse_tables", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 5);

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM warehouse_procedures", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 5);
    }

    #[test]
    fn seed_is_idempotent() {
        let conn = db::open_in_memory().unwrap();

        // Run the full seed twice to verify idempotency
        for _ in 0..2 {
            conn.execute(
                "INSERT OR REPLACE INTO workspaces(id, display_name, migration_repo_path, created_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params!["mock-ws-1", "Demo Migration", "/tmp/vibedata-migration", "2026-01-01T00:00:00Z"],
            )
            .unwrap();
            conn.execute(
                "INSERT OR REPLACE INTO items(id, workspace_id, display_name, item_type)
                 VALUES (?1, ?2, ?3, ?4)",
                params!["mock-wh-1", "mock-ws-1", "Sales Warehouse", "Warehouse"],
            )
            .unwrap();
        }

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM workspaces", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM items WHERE id='mock-wh-1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }
}
