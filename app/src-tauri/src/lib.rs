mod agent_sources;
mod commands;
mod db;
mod logging;
mod types;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(logging::build_log_plugin().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            logging::truncate_log_file(app.handle());
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
            agent_sources::deploy_on_startup(&app.handle()).map_err(|e| {
                log::error!("agent_sources deploy failed on startup: {e}");
                e
            })?;
            app.manage(commands::agent::SidecarManager::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::agent::monitor_launch_agent,
            commands::app_info::set_log_level,
            commands::app_info::get_log_file_path,
            commands::app_info::get_data_dir_path,
            commands::settings::get_settings,
            commands::settings::save_anthropic_api_key,
            commands::settings::test_api_key,
            commands::workspace::workspace_create,
            commands::workspace::workspace_apply_and_clone,
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
            commands::github_auth::github_start_device_flow,
            commands::github_auth::github_poll_for_token,
            commands::github_auth::github_get_user,
            commands::github_auth::github_logout,
            commands::github_auth::github_list_repos,
            #[cfg(debug_assertions)]
            commands::seed::seed_mock_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
