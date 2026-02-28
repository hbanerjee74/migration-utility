use tauri::State;

use crate::db::DbState;
use crate::types::AppSettings;

#[tauri::command]
pub fn get_settings(state: State<'_, DbState>) -> Result<AppSettings, String> {
    log::info!("[get_settings]");
    let conn = state.0.lock().map_err(|e| {
        log::error!("[get_settings] Failed to acquire DB lock: {}", e);
        e.to_string()
    })?;
    crate::db::read_settings(&conn)
}

#[tauri::command]
pub fn save_anthropic_api_key(
    state: State<'_, DbState>,
    api_key: Option<String>,
) -> Result<(), String> {
    log::info!("[save_anthropic_api_key]");
    let conn = state.0.lock().map_err(|e| {
        log::error!("[save_anthropic_api_key] Failed to acquire DB lock: {}", e);
        e.to_string()
    })?;
    let mut settings = crate::db::read_settings(&conn)?;
    settings.anthropic_api_key = api_key;
    crate::db::write_settings(&conn, &settings)
}

#[tauri::command]
pub async fn test_api_key(api_key: String) -> Result<bool, String> {
    log::info!("[test_api_key]");
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "model": "claude-haiku-4-5",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "hi"}]
            })
            .to_string(),
        )
        .send()
        .await
        .map_err(|e| {
            log::error!("[test_api_key] network error: {}", e);
            "Network error while validating API key".to_string()
        })?;

    let status = resp.status().as_u16();
    match status {
        400 | 401 => Err("Invalid API key".to_string()),
        403 => Err("API key is disabled".to_string()),
        _ if resp.status().is_success() => Ok(true),
        _ => Err("Failed to validate API key".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use crate::db;
    use crate::types::AppSettings;

    #[test]
    fn settings_roundtrip_persists_anthropic_key() {
        let conn = db::open_in_memory().unwrap();
        let settings = AppSettings {
            anthropic_api_key: Some("sk-ant-test".to_string()),
            ..AppSettings::default()
        };
        db::write_settings(&conn, &settings).unwrap();
        let read = db::read_settings(&conn).unwrap();
        assert_eq!(read.anthropic_api_key.as_deref(), Some("sk-ant-test"));
    }
}
