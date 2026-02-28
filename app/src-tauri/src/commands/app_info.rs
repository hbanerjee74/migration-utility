use tauri::AppHandle;

/// Set the global log level for Rust backend and frontend (via Tauri log plugin).
#[tauri::command]
pub fn set_log_level(level: String) -> Result<(), String> {
    log::info!("[set_log_level] level={}", level);
    crate::logging::set_log_level(&level);
    Ok(())
}

/// Return the absolute path to the app log file for display in settings.
#[tauri::command]
pub fn get_log_file_path(app: AppHandle) -> Result<String, String> {
    log::info!("[get_log_file_path]");
    crate::logging::get_log_file_path(&app)
}

/// Return the app data directory path (where the SQLite database lives).
#[tauri::command]
pub fn get_data_dir_path(app: AppHandle) -> Result<String, String> {
    log::info!("[get_data_dir_path]");
    use tauri::Manager;
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    data_dir
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Data dir path contains invalid UTF-8".to_string())
}
