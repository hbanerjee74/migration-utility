mod commands;
mod db;
mod types;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            let db_path = app
                .path()
                .app_data_dir()
                .expect("no app data dir")
                .join("migration-utility.db");
            let conn = db::open(&db_path).map_err(|e| {
                log::error!("db::open failed: {e}");
                e
            })?;
            app.manage(db::DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::workspace::workspace_create,
            commands::workspace::workspace_get,
            commands::fabric::fabric_upsert_items,
            commands::fabric::fabric_upsert_schemas,
            commands::fabric::fabric_upsert_tables,
            commands::fabric::fabric_upsert_procedures,
            commands::fabric::fabric_upsert_pipeline_activities,
            commands::migration::migration_save_selected_tables,
            commands::migration::migration_save_table_artifact,
            commands::migration::migration_save_candidacy,
            commands::migration::migration_override_candidacy,
            commands::migration::migration_list_candidacy,
            commands::migration::migration_save_table_config,
            commands::migration::migration_get_table_config,
            commands::plan::plan_serialize,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
