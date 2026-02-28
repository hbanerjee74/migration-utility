use std::{
    path::{Path, PathBuf},
    process::Command,
};

use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

use crate::db::DbState;
use crate::types::{CommandError, Workspace};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceArgs {
    pub name: String,
    pub migration_repo_name: Option<String>,
    pub migration_repo_path: String,
    pub fabric_url: Option<String>,
    pub fabric_service_principal_id: Option<String>,
    pub fabric_service_principal_secret: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyWorkspaceArgs {
    pub name: String,
    pub migration_repo_name: String,
    pub migration_repo_path: String,
    pub fabric_url: Option<String>,
    pub fabric_service_principal_id: Option<String>,
    pub fabric_service_principal_secret: Option<String>,
}

#[tauri::command]
pub fn workspace_create(
    args: CreateWorkspaceArgs,
    state: State<DbState>,
) -> Result<Workspace, CommandError> {
    log::info!("workspace_create: name={}", args.name);
    if !Path::new(&args.migration_repo_path).is_dir() {
        log::error!(
            "workspace_create: migration_repo_path does not exist: {}",
            args.migration_repo_path
        );
        return Err(CommandError::Io(format!(
            "Migration repo path does not exist or is not a directory: {}",
            args.migration_repo_path
        )));
    }
    let conn = state.0.lock().unwrap();
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO workspaces(id, display_name, migration_repo_name, migration_repo_path, fabric_url, fabric_service_principal_id, fabric_service_principal_secret, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            args.name,
            args.migration_repo_name,
            args.migration_repo_path,
            args.fabric_url,
            args.fabric_service_principal_id,
            args.fabric_service_principal_secret,
            created_at
        ],
    )
    .map_err(|e| {
        log::error!("workspace_create: failed: {e}");
        CommandError::from(e)
    })?;
    Ok(Workspace {
        id,
        display_name: args.name,
        migration_repo_name: args.migration_repo_name,
        migration_repo_path: args.migration_repo_path,
        fabric_url: args.fabric_url,
        fabric_service_principal_id: args.fabric_service_principal_id,
        fabric_service_principal_secret: args.fabric_service_principal_secret,
        created_at,
    })
}

#[tauri::command]
pub fn workspace_apply_and_clone(
    args: ApplyWorkspaceArgs,
    state: State<DbState>,
) -> Result<Workspace, CommandError> {
    log::info!(
        "workspace_apply_and_clone: name={} repo={}",
        args.name,
        args.migration_repo_name
    );

    let repo_name = args.migration_repo_name.trim().to_string();
    let repo_path = args.migration_repo_path.trim().to_string();
    if repo_name.is_empty() {
        return Err(CommandError::Io(
            "Migration repo name is required".to_string(),
        ));
    }
    if !repo_name.contains('/') {
        return Err(CommandError::Io(
            "Migration repo name must be in owner/repo format".to_string(),
        ));
    }
    if repo_path.is_empty() {
        return Err(CommandError::Io(
            "Migration repo path is required".to_string(),
        ));
    }

    let token = {
        let conn = state.0.lock().unwrap();
        let settings = crate::db::read_settings(&conn).map_err(CommandError::Io)?;
        settings
            .github_oauth_token
            .ok_or_else(|| CommandError::Io("GitHub is not connected".to_string()))?
    };

    clone_repo_if_needed(&repo_name, &repo_path, &token)?;

    let conn = state.0.lock().unwrap();
    let existing: Option<(String, String)> = conn
        .query_row(
            "SELECT id, created_at FROM workspaces ORDER BY created_at DESC LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(CommandError::from)?;

    let workspace = if let Some((id, created_at)) = existing {
        conn.execute(
            "UPDATE workspaces SET display_name=?1, migration_repo_name=?2, migration_repo_path=?3, fabric_url=?4, fabric_service_principal_id=?5, fabric_service_principal_secret=?6 WHERE id=?7",
            params![
                args.name,
                repo_name,
                repo_path,
                args.fabric_url,
                args.fabric_service_principal_id,
                args.fabric_service_principal_secret,
                id
            ],
        )
        .map_err(|e| {
            log::error!("workspace_apply_and_clone: failed to update workspace: {e}");
            CommandError::from(e)
        })?;

        Workspace {
            id,
            display_name: args.name,
            migration_repo_name: Some(repo_name),
            migration_repo_path: repo_path,
            fabric_url: args.fabric_url,
            fabric_service_principal_id: args.fabric_service_principal_id,
            fabric_service_principal_secret: args.fabric_service_principal_secret,
            created_at,
        }
    } else {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO workspaces(id, display_name, migration_repo_name, migration_repo_path, fabric_url, fabric_service_principal_id, fabric_service_principal_secret, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                args.name,
                repo_name,
                repo_path,
                args.fabric_url,
                args.fabric_service_principal_id,
                args.fabric_service_principal_secret,
                created_at
            ],
        )
        .map_err(|e| {
            log::error!("workspace_apply_and_clone: failed to create workspace: {e}");
            CommandError::from(e)
        })?;

        Workspace {
            id,
            display_name: args.name,
            migration_repo_name: Some(repo_name),
            migration_repo_path: repo_path,
            fabric_url: args.fabric_url,
            fabric_service_principal_id: args.fabric_service_principal_id,
            fabric_service_principal_secret: args.fabric_service_principal_secret,
            created_at,
        }
    };

    Ok(workspace)
}

fn clone_repo_if_needed(repo_name: &str, repo_path: &str, token: &str) -> Result<(), CommandError> {
    let target = PathBuf::from(repo_path);
    let git_dir = target.join(".git");

    if git_dir.is_dir() {
        log::info!(
            "workspace_apply_and_clone: repo already exists at {}",
            target.display()
        );
        return Ok(());
    }

    if target.exists() {
        if !target.is_dir() {
            return Err(CommandError::Io(format!(
                "Migration repo path is not a directory: {}",
                target.display()
            )));
        }
        let mut entries = std::fs::read_dir(&target).map_err(CommandError::from)?;
        if entries.next().is_some() {
            return Err(CommandError::Io(format!(
                "Migration repo path is not empty and not a git repo: {}",
                target.display()
            )));
        }
    } else {
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(CommandError::from)?;
        }
    }

    let clone_url = format!(
        "https://x-access-token:{}@github.com/{}.git",
        token, repo_name
    );
    let output = Command::new("git")
        .args(["clone", "--depth", "1", &clone_url, repo_path])
        .output()
        .map_err(|e| {
            log::error!("workspace_apply_and_clone: failed to spawn git clone: {e}");
            CommandError::Git(e.to_string())
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        log::error!("workspace_apply_and_clone: git clone failed: {}", stderr);
        return Err(CommandError::Git(if stderr.is_empty() {
            "git clone failed".to_string()
        } else {
            stderr
        }));
    }

    Ok(())
}

#[tauri::command]
pub fn workspace_get(state: State<DbState>) -> Result<Option<Workspace>, CommandError> {
    log::info!("workspace_get");
    let conn = state.0.lock().unwrap();
    let result = conn.query_row(
        "SELECT id, display_name, migration_repo_name, migration_repo_path, fabric_url, fabric_service_principal_id, fabric_service_principal_secret, created_at FROM workspaces ORDER BY created_at DESC LIMIT 1",
        [],
        |row| {
            Ok(Workspace {
                id: row.get(0)?,
                display_name: row.get(1)?,
                migration_repo_name: row.get(2)?,
                migration_repo_path: row.get(3)?,
                fabric_url: row.get(4)?,
                fabric_service_principal_id: row.get(5)?,
                fabric_service_principal_secret: row.get(6)?,
                created_at: row.get(7)?,
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

    #[test]
    fn create_and_get_workspace() {
        let conn = db::open_in_memory().unwrap();
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO workspaces(id, display_name, migration_repo_name, migration_repo_path, fabric_service_principal_id, fabric_service_principal_secret, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                id,
                "Test",
                Some("acme/repo"),
                std::env::temp_dir().to_str().unwrap(),
                Some("sp-id"),
                Some("sp-secret"),
                "2026-01-01T00:00:00Z"
            ],
        )
        .unwrap();
        let w: Workspace = conn
            .query_row(
                "SELECT id, display_name, migration_repo_name, migration_repo_path, fabric_url, fabric_service_principal_id, fabric_service_principal_secret, created_at FROM workspaces WHERE id=?1",
                rusqlite::params![id],
                |row| {
                    Ok(Workspace {
                        id: row.get(0)?,
                        display_name: row.get(1)?,
                        migration_repo_name: row.get(2)?,
                        migration_repo_path: row.get(3)?,
                        fabric_url: row.get(4)?,
                        fabric_service_principal_id: row.get(5)?,
                        fabric_service_principal_secret: row.get(6)?,
                        created_at: row.get(7)?,
                    })
                },
            )
            .unwrap();
        assert_eq!(w.display_name, "Test");
        assert_eq!(w.migration_repo_name.as_deref(), Some("acme/repo"));
    }

    #[test]
    fn get_returns_none_when_empty() {
        let conn = db::open_in_memory().unwrap();
        let result: Option<Workspace> = conn
            .query_row(
                "SELECT id, display_name, migration_repo_name, migration_repo_path, fabric_url, fabric_service_principal_id, fabric_service_principal_secret, created_at FROM workspaces LIMIT 1",
                [],
                |row| {
                    Ok(Workspace {
                        id: row.get(0)?,
                        display_name: row.get(1)?,
                        migration_repo_name: row.get(2)?,
                        migration_repo_path: row.get(3)?,
                        fabric_url: row.get(4)?,
                        fabric_service_principal_id: row.get(5)?,
                        fabric_service_principal_secret: row.get(6)?,
                        created_at: row.get(7)?,
                    })
                },
            )
            .optional()
            .unwrap();
        assert!(result.is_none());
    }
}
