use std::path::Path;

use rusqlite::params;
use serde::Deserialize;
use tauri::State;

use crate::db::DbState;
use crate::types::{CommandError, Workspace};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceArgs {
    pub name: String,
    pub migration_repo_path: String,
    pub fabric_url: Option<String>,
}

#[tauri::command]
pub fn workspace_create(
    args: CreateWorkspaceArgs,
    state: State<DbState>,
) -> Result<Workspace, CommandError> {
    log::info!("workspace_create: name={}", args.name);
    if !Path::new(&args.migration_repo_path).is_dir() {
        log::error!("workspace_create: migration_repo_path does not exist: {}", args.migration_repo_path);
        return Err(CommandError::Io(format!(
            "Migration repo path does not exist or is not a directory: {}",
            args.migration_repo_path
        )));
    }
    let conn = state.0.lock().unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO workspaces(id, display_name, migration_repo_path, fabric_url, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, args.name, args.migration_repo_path, args.fabric_url, created_at],
    )
    .map_err(|e| {
        log::error!("workspace_create: failed: {e}");
        CommandError::from(e)
    })?;
    Ok(Workspace {
        id,
        display_name: args.name,
        migration_repo_path: args.migration_repo_path,
        fabric_url: args.fabric_url,
        created_at,
    })
}

#[tauri::command]
pub fn workspace_get(state: State<DbState>) -> Result<Option<Workspace>, CommandError> {
    log::info!("workspace_get");
    let conn = state.0.lock().unwrap();
    let result = conn.query_row(
        "SELECT id, display_name, migration_repo_path, fabric_url, created_at FROM workspaces LIMIT 1",
        [],
        |row| {
            Ok(Workspace {
                id: row.get(0)?,
                display_name: row.get(1)?,
                migration_repo_path: row.get(2)?,
                fabric_url: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    );
    match result {
        Ok(w) => Ok(Some(w)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => {
            log::error!("workspace_get: failed: {e}");
            Err(CommandError::from(e))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use rusqlite::OptionalExtension;

    #[test]
    fn create_and_get_workspace() {
        let conn = db::open_in_memory().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO workspaces(id, display_name, migration_repo_path, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![id, "Test", std::env::temp_dir().to_str().unwrap(), "2026-01-01T00:00:00Z"],
        )
        .unwrap();
        let w: Workspace = conn
            .query_row(
                "SELECT id, display_name, migration_repo_path, fabric_url, created_at FROM workspaces WHERE id=?1",
                rusqlite::params![id],
                |row| {
                    Ok(Workspace {
                        id: row.get(0)?,
                        display_name: row.get(1)?,
                        migration_repo_path: row.get(2)?,
                        fabric_url: row.get(3)?,
                        created_at: row.get(4)?,
                    })
                },
            )
            .unwrap();
        assert_eq!(w.display_name, "Test");
    }

    #[test]
    fn get_returns_none_when_empty() {
        let conn = db::open_in_memory().unwrap();
        let result: Option<Workspace> = conn
            .query_row(
                "SELECT id, display_name, migration_repo_path, fabric_url, created_at FROM workspaces LIMIT 1",
                [],
                |row| {
                    Ok(Workspace {
                        id: row.get(0)?,
                        display_name: row.get(1)?,
                        migration_repo_path: row.get(2)?,
                        fabric_url: row.get(3)?,
                        created_at: row.get(4)?,
                    })
                },
            )
            .optional()
            .unwrap();
        assert!(result.is_none());
    }
}
