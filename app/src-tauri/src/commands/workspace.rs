use std::{
    path::{Path, PathBuf},
    process::Command,
};

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use tauri::State;
use tiberius::{AuthMethod, Client, Config, EncryptionLevel};
use tokio::net::TcpStream;
use tokio::runtime::Builder as RuntimeBuilder;
use tokio_util::compat::TokioAsyncWriteCompatExt;
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
    pub source_type: Option<String>,
    pub source_server: Option<String>,
    pub source_database: Option<String>,
    pub source_port: Option<i64>,
    pub source_authentication_mode: Option<String>,
    pub source_username: Option<String>,
    pub source_password: Option<String>,
    pub source_encrypt: Option<bool>,
    pub source_trust_server_certificate: Option<bool>,
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
    pub source_type: Option<String>,
    pub source_server: Option<String>,
    pub source_database: Option<String>,
    pub source_port: Option<i64>,
    pub source_authentication_mode: Option<String>,
    pub source_username: Option<String>,
    pub source_password: Option<String>,
    pub source_encrypt: Option<bool>,
    pub source_trust_server_certificate: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestSourceConnectionArgs {
    pub source_type: String,
    pub source_server: String,
    pub source_port: i64,
    pub source_authentication_mode: String,
    pub source_username: String,
    pub source_password: String,
    pub source_encrypt: bool,
    pub source_trust_server_certificate: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverSourceDatabasesArgs {
    pub source_type: String,
    pub source_server: String,
    pub source_port: i64,
    pub source_authentication_mode: String,
    pub source_username: String,
    pub source_password: String,
    pub source_encrypt: bool,
    pub source_trust_server_certificate: bool,
}

fn clear_workspace_state(conn: &Connection) -> Result<(), CommandError> {
    let tx = conn.unchecked_transaction().map_err(|e| {
        log::error!("workspace_reset_state: failed to begin transaction: {e}");
        CommandError::from(e)
    })?;

    // Clear children before parents to satisfy foreign keys.
    tx.execute("DELETE FROM table_config", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear table_config: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM candidacy", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear candidacy: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM table_artifacts", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear table_artifacts: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM selected_tables", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear selected_tables: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM pipeline_activities", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear pipeline_activities: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM warehouse_tables", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear warehouse_tables: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM warehouse_procedures", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear warehouse_procedures: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM warehouse_schemas", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear warehouse_schemas: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM items", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear items: {e}");
        CommandError::from(e)
    })?;
    tx.execute("DELETE FROM workspaces", []).map_err(|e| {
        log::error!("workspace_reset_state: failed to clear workspaces: {e}");
        CommandError::from(e)
    })?;

    tx.commit().map_err(|e| {
        log::error!("workspace_reset_state: failed to commit: {e}");
        CommandError::from(e)
    })?;
    Ok(())
}

fn validate_source_type(source_type: &Option<String>) -> Result<(), CommandError> {
    match source_type.as_deref() {
        Some("sql_server") | Some("fabric_warehouse") | None => Ok(()),
        Some(_) => Err(CommandError::Io(
            "Unsupported source_type. Expected sql_server or fabric_warehouse".to_string(),
        )),
    }
}

fn normalize_repo_full_name(remote_url: &str) -> Option<String> {
    let trimmed = remote_url.trim().trim_end_matches('/');
    let without_git = trimmed.strip_suffix(".git").unwrap_or(trimmed);

    if let Some(after_github) = without_git.split("github.com/").nth(1) {
        return Some(after_github.trim_start_matches('/').to_lowercase());
    }

    if let Some(after_github) = without_git.split("github.com:").nth(1) {
        return Some(after_github.trim_start_matches('/').to_lowercase());
    }

    None
}

fn ensure_existing_repo_matches(repo_name: &str, repo_path: &str) -> Result<(), CommandError> {
    let output = Command::new("git")
        .args(["-C", repo_path, "config", "--get", "remote.origin.url"])
        .output()
        .map_err(CommandError::from)?;
    if !output.status.success() {
        return Err(CommandError::Io(format!(
            "Existing git repo at {repo_path} has no origin remote. Choose an empty directory or the repo path for {repo_name}."
        )));
    }

    let remote_url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let actual = normalize_repo_full_name(&remote_url);
    let expected = repo_name.to_lowercase();
    match actual {
        Some(found) if found == expected => Ok(()),
        Some(found) => Err(CommandError::Io(format!(
            "Selected repo is {repo_name}, but existing path contains {found}. Choose a matching repo path or empty directory."
        ))),
        None => Err(CommandError::Io(format!(
            "Could not parse origin remote '{remote_url}'. Choose an empty directory or matching repo path for {repo_name}."
        ))),
    }
}

#[tauri::command]
pub fn workspace_create(
    args: CreateWorkspaceArgs,
    state: State<DbState>,
) -> Result<Workspace, CommandError> {
    log::info!("workspace_create: name={}", args.name);
    validate_source_type(&args.source_type)?;
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
        "INSERT INTO workspaces(
            id, display_name, migration_repo_name, migration_repo_path, fabric_url,
            fabric_service_principal_id, fabric_service_principal_secret, source_type,
            source_server, source_database, source_port, source_authentication_mode,
            source_username, source_password, source_encrypt, source_trust_server_certificate,
            created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            id,
            args.name,
            args.migration_repo_name,
            args.migration_repo_path,
            args.fabric_url,
            args.fabric_service_principal_id,
            args.fabric_service_principal_secret,
            args.source_type,
            args.source_server,
            args.source_database,
            args.source_port,
            args.source_authentication_mode,
            args.source_username,
            args.source_password,
            args.source_encrypt,
            args.source_trust_server_certificate,
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
        source_type: args.source_type,
        source_server: args.source_server,
        source_database: args.source_database,
        source_port: args.source_port,
        source_authentication_mode: args.source_authentication_mode,
        source_username: args.source_username,
        source_password: args.source_password,
        source_encrypt: args.source_encrypt,
        source_trust_server_certificate: args.source_trust_server_certificate,
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
    validate_source_type(&args.source_type)?;

    let token = {
        let conn = state.0.lock().unwrap();
        let settings = crate::db::read_settings(&conn).map_err(CommandError::Io)?;
        settings
            .github_oauth_token
            .ok_or_else(|| CommandError::Io("GitHub is not connected".to_string()))?
    };

    if let Err(e) = clone_repo_if_needed(&repo_name, &repo_path, &token) {
        log::error!("workspace_apply_and_clone: failed: {}", e);
        return Err(e);
    }

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
            "UPDATE workspaces SET
                display_name=?1,
                migration_repo_name=?2,
                migration_repo_path=?3,
                fabric_url=?4,
                fabric_service_principal_id=?5,
                fabric_service_principal_secret=?6,
                source_type=?7,
                source_server=?8,
                source_database=?9,
                source_port=?10,
                source_authentication_mode=?11,
                source_username=?12,
                source_password=?13,
                source_encrypt=?14,
                source_trust_server_certificate=?15
             WHERE id=?16",
            params![
                args.name,
                repo_name,
                repo_path,
                args.fabric_url,
                args.fabric_service_principal_id,
                args.fabric_service_principal_secret,
                args.source_type,
                args.source_server,
                args.source_database,
                args.source_port,
                args.source_authentication_mode,
                args.source_username,
                args.source_password,
                args.source_encrypt,
                args.source_trust_server_certificate,
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
            source_type: args.source_type,
            source_server: args.source_server,
            source_database: args.source_database,
            source_port: args.source_port,
            source_authentication_mode: args.source_authentication_mode,
            source_username: args.source_username,
            source_password: args.source_password,
            source_encrypt: args.source_encrypt,
            source_trust_server_certificate: args.source_trust_server_certificate,
            created_at,
        }
    } else {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO workspaces(
                id, display_name, migration_repo_name, migration_repo_path, fabric_url,
                fabric_service_principal_id, fabric_service_principal_secret, source_type,
                source_server, source_database, source_port, source_authentication_mode,
                source_username, source_password, source_encrypt, source_trust_server_certificate,
                created_at
              ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                id,
                args.name,
                repo_name,
                repo_path,
                args.fabric_url,
                args.fabric_service_principal_id,
                args.fabric_service_principal_secret,
                args.source_type,
                args.source_server,
                args.source_database,
                args.source_port,
                args.source_authentication_mode,
                args.source_username,
                args.source_password,
                args.source_encrypt,
                args.source_trust_server_certificate,
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
            source_type: args.source_type,
            source_server: args.source_server,
            source_database: args.source_database,
            source_port: args.source_port,
            source_authentication_mode: args.source_authentication_mode,
            source_username: args.source_username,
            source_password: args.source_password,
            source_encrypt: args.source_encrypt,
            source_trust_server_certificate: args.source_trust_server_certificate,
            created_at,
        }
    };

    Ok(workspace)
}

fn clone_repo_if_needed(repo_name: &str, repo_path: &str, token: &str) -> Result<(), CommandError> {
    let target = PathBuf::from(repo_path);
    let git_dir = target.join(".git");

    if git_dir.is_dir() {
        ensure_existing_repo_matches(repo_name, repo_path)?;
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
    } else if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(CommandError::from)?;
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
        let safe_stderr = redact_clone_error(&stderr, token, repo_name);
        log::error!("workspace_apply_and_clone: git clone failed: {}", safe_stderr);
        return Err(CommandError::Git(if stderr.is_empty() {
            "git clone failed".to_string()
        } else {
            safe_stderr
        }));
    }

    Ok(())
}

fn redact_clone_error(stderr: &str, token: &str, repo_name: &str) -> String {
    if stderr.is_empty() {
        return String::new();
    }

    let raw_url = format!(
        "https://x-access-token:{}@github.com/{}.git",
        token, repo_name
    );
    let safe_url = format!("https://x-access-token:***@github.com/{}.git", repo_name);
    stderr.replace(token, "***").replace(&raw_url, &safe_url)
}

fn validate_source_port(port: i64) -> Result<u16, CommandError> {
    if !(1..=65535).contains(&port) {
        return Err(CommandError::Io(
            "Source port must be between 1 and 65535".to_string(),
        ));
    }
    Ok(port as u16)
}

#[tauri::command]
pub fn workspace_test_source_connection(args: TestSourceConnectionArgs) -> Result<String, CommandError> {
    log::info!(
        "workspace_test_source_connection: source_type={} server={} port={} auth_mode={}",
        args.source_type,
        args.source_server,
        args.source_port,
        args.source_authentication_mode
    );

    if args.source_server.trim().is_empty() {
        log::error!("workspace_test_source_connection: failed: source server is required");
        return Err(CommandError::Io("Source server is required".to_string()));
    }
    let source_port = validate_source_port(args.source_port).inspect_err(|_e| {
        log::error!(
            "workspace_test_source_connection: failed: invalid source port {}",
            args.source_port
        );
    })?;
    if args.source_username.trim().is_empty() {
        log::error!("workspace_test_source_connection: failed: source username is required");
        return Err(CommandError::Io("Source username is required".to_string()));
    }
    if args.source_password.trim().is_empty() {
        log::error!("workspace_test_source_connection: failed: source password is required");
        return Err(CommandError::Io("Source password is required".to_string()));
    }
    if args.source_type != "sql_server" && args.source_type != "fabric_warehouse" {
        log::error!("workspace_test_source_connection: failed: unsupported source type");
        return Err(CommandError::Io(
            "Unsupported source type. Expected sql_server or fabric_warehouse".to_string(),
        ));
    }

    let mut config = Config::new();
    config.host(args.source_server.trim());
    config.port(source_port);
    // Authenticate against master first so we can return a precise DB-access error.
    // Some SQL Server setups fail login when an unavailable DB is requested directly.
    config.database("master");
    config.authentication(AuthMethod::sql_server(
        args.source_username.trim(),
        args.source_password.trim(),
    ));
    config.encryption(if args.source_encrypt {
        EncryptionLevel::Required
    } else {
        EncryptionLevel::Off
    });
    if args.source_trust_server_certificate {
        config.trust_cert();
    }

    let runtime = RuntimeBuilder::new_current_thread()
        .enable_io()
        .enable_time()
        .build()
        .map_err(|e| CommandError::Io(format!("Failed to create async runtime: {e}")))?;

    runtime.block_on(async move {
        let tcp = TcpStream::connect(config.get_addr()).await.map_err(|e| {
            log::error!("workspace_test_source_connection: failed to connect tcp: {e}");
            CommandError::Io(format!("Could not connect to source endpoint: {e}"))
        })?;
        tcp.set_nodelay(true).map_err(|e| {
            log::error!("workspace_test_source_connection: failed to set nodelay: {e}");
            CommandError::Io(format!("Could not configure socket: {e}"))
        })?;

        let _client = Client::connect(config, tcp.compat_write()).await.map_err(|e| {
            log::error!("workspace_test_source_connection: failed to authenticate: {e}");
            CommandError::Io(format!("Connection test failed: {e}"))
        })?;

        Ok::<(), CommandError>(())
    })?;

    Ok("Connection successful".to_string())
}

#[tauri::command]
pub fn workspace_discover_source_databases(
    args: DiscoverSourceDatabasesArgs,
) -> Result<Vec<String>, CommandError> {
    log::info!(
        "workspace_discover_source_databases: source_type={} server={} port={} auth_mode={}",
        args.source_type,
        args.source_server,
        args.source_port,
        args.source_authentication_mode
    );

    if args.source_server.trim().is_empty() {
        log::error!("workspace_discover_source_databases: failed: source server is required");
        return Err(CommandError::Io("Source server is required".to_string()));
    }
    let source_port = validate_source_port(args.source_port).inspect_err(|_e| {
        log::error!(
            "workspace_discover_source_databases: failed: invalid source port {}",
            args.source_port
        );
    })?;
    if args.source_username.trim().is_empty() {
        log::error!("workspace_discover_source_databases: failed: source username is required");
        return Err(CommandError::Io("Source username is required".to_string()));
    }
    if args.source_password.trim().is_empty() {
        log::error!("workspace_discover_source_databases: failed: source password is required");
        return Err(CommandError::Io("Source password is required".to_string()));
    }
    if args.source_type != "sql_server" && args.source_type != "fabric_warehouse" {
        log::error!("workspace_discover_source_databases: failed: unsupported source type");
        return Err(CommandError::Io(
            "Unsupported source type. Expected sql_server or fabric_warehouse".to_string(),
        ));
    }

    let mut config = Config::new();
    config.host(args.source_server.trim());
    config.port(source_port);
    config.database("master");
    config.authentication(AuthMethod::sql_server(
        args.source_username.trim(),
        args.source_password.trim(),
    ));
    config.encryption(if args.source_encrypt {
        EncryptionLevel::Required
    } else {
        EncryptionLevel::Off
    });
    if args.source_trust_server_certificate {
        config.trust_cert();
    }

    let runtime = RuntimeBuilder::new_current_thread()
        .enable_io()
        .enable_time()
        .build()
        .map_err(|e| CommandError::Io(format!("Failed to create async runtime: {e}")))?;

    runtime.block_on(async move {
        let tcp = TcpStream::connect(config.get_addr()).await.map_err(|e| {
            log::error!("workspace_discover_source_databases: failed to connect tcp: {e}");
            CommandError::Io(format!("Could not connect to source endpoint: {e}"))
        })?;
        tcp.set_nodelay(true).map_err(|e| {
            log::error!("workspace_discover_source_databases: failed to set nodelay: {e}");
            CommandError::Io(format!("Could not configure socket: {e}"))
        })?;

        let mut client = Client::connect(config, tcp.compat_write()).await.map_err(|e| {
            log::error!("workspace_discover_source_databases: failed to authenticate: {e}");
            CommandError::Io(format!("Database discovery failed: {e}"))
        })?;

        let rows = client
            .simple_query(
                "SELECT name FROM sys.databases WHERE HAS_DBACCESS(name)=1 ORDER BY name",
            )
            .await
            .map_err(|e| {
                log::error!("workspace_discover_source_databases: query failed: {e}");
                CommandError::Io(format!("Database discovery failed: {e}"))
            })?
            .into_first_result()
            .await
            .map_err(|e| {
                log::error!("workspace_discover_source_databases: result parse failed: {e}");
                CommandError::Io(format!("Database discovery failed: {e}"))
            })?;

        let names: Vec<String> = rows
            .into_iter()
            .filter_map(|row| row.get::<&str, _>(0).map(|name| name.to_string()))
            .collect();

        Ok::<Vec<String>, CommandError>(names)
    })
}

#[tauri::command]
pub fn workspace_reset_state(state: State<DbState>) -> Result<(), CommandError> {
    log::info!("workspace_reset_state");
    let conn = state.0.lock().unwrap();
    clear_workspace_state(&conn)
}

#[tauri::command]
pub fn workspace_get(state: State<DbState>) -> Result<Option<Workspace>, CommandError> {
    log::info!("workspace_get");
    let conn = state.0.lock().unwrap();
    let result = conn.query_row(
        "SELECT
            id, display_name, migration_repo_name, migration_repo_path, fabric_url,
            fabric_service_principal_id, fabric_service_principal_secret, source_type,
            source_server, source_database, source_port, source_authentication_mode,
            source_username, source_password, source_encrypt, source_trust_server_certificate,
            created_at
         FROM workspaces
         ORDER BY created_at DESC LIMIT 1",
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
                source_type: row.get(7)?,
                source_server: row.get(8)?,
                source_database: row.get(9)?,
                source_port: row.get(10)?,
                source_authentication_mode: row.get(11)?,
                source_username: row.get(12)?,
                source_password: row.get(13)?,
                source_encrypt: row.get(14)?,
                source_trust_server_certificate: row.get(15)?,
                created_at: row.get(16)?,
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
            "INSERT INTO workspaces(
                id, display_name, migration_repo_name, migration_repo_path, fabric_service_principal_id,
                fabric_service_principal_secret, source_type, source_server, source_database, source_port,
                source_authentication_mode, source_username, source_password, source_encrypt,
                source_trust_server_certificate, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            rusqlite::params![
                id,
                "Test",
                Some("acme/repo"),
                std::env::temp_dir().to_str().unwrap(),
                Some("sp-id"),
                Some("sp-secret"),
                Some("sql_server"),
                Some("sql.local"),
                Some("warehouse"),
                Some(1433),
                Some("sql_password"),
                Some("sa"),
                Some("secret"),
                Some(true),
                Some(false),
                "2026-01-01T00:00:00Z"
            ],
        )
        .unwrap();
        let w: Workspace = conn
            .query_row(
                "SELECT
                    id, display_name, migration_repo_name, migration_repo_path, fabric_url,
                    fabric_service_principal_id, fabric_service_principal_secret, source_type,
                    source_server, source_database, source_port, source_authentication_mode,
                    source_username, source_password, source_encrypt, source_trust_server_certificate,
                    created_at
                 FROM workspaces WHERE id=?1",
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
                        source_type: row.get(7)?,
                        source_server: row.get(8)?,
                        source_database: row.get(9)?,
                        source_port: row.get(10)?,
                        source_authentication_mode: row.get(11)?,
                        source_username: row.get(12)?,
                        source_password: row.get(13)?,
                        source_encrypt: row.get(14)?,
                        source_trust_server_certificate: row.get(15)?,
                        created_at: row.get(16)?,
                    })
                },
            )
            .unwrap();
        assert_eq!(w.display_name, "Test");
        assert_eq!(w.migration_repo_name.as_deref(), Some("acme/repo"));
        assert_eq!(w.source_type.as_deref(), Some("sql_server"));
    }

    #[test]
    fn get_returns_none_when_empty() {
        let conn = db::open_in_memory().unwrap();
        let result: Option<Workspace> = conn
            .query_row(
                "SELECT
                    id, display_name, migration_repo_name, migration_repo_path, fabric_url,
                    fabric_service_principal_id, fabric_service_principal_secret, source_type,
                    source_server, source_database, source_port, source_authentication_mode,
                    source_username, source_password, source_encrypt, source_trust_server_certificate,
                    created_at
                 FROM workspaces LIMIT 1",
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
                        source_type: row.get(7)?,
                        source_server: row.get(8)?,
                        source_database: row.get(9)?,
                        source_port: row.get(10)?,
                        source_authentication_mode: row.get(11)?,
                        source_username: row.get(12)?,
                        source_password: row.get(13)?,
                        source_encrypt: row.get(14)?,
                        source_trust_server_certificate: row.get(15)?,
                        created_at: row.get(16)?,
                    })
                },
            )
            .optional()
            .unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn normalize_repo_full_name_handles_common_remote_formats() {
        assert_eq!(
            normalize_repo_full_name("https://github.com/acme/data-platform.git").as_deref(),
            Some("acme/data-platform")
        );
        assert_eq!(
            normalize_repo_full_name("git@github.com:acme/data-platform.git").as_deref(),
            Some("acme/data-platform")
        );
        assert_eq!(
            normalize_repo_full_name("https://x-access-token:abc@github.com/acme/data-platform.git")
                .as_deref(),
            Some("acme/data-platform")
        );
    }

    #[test]
    fn redact_clone_error_masks_token_and_url() {
        let token = "gho_test_secret";
        let repo = "acme/data-platform";
        let stderr = format!(
            "fatal: could not read from remote repository https://x-access-token:{}@github.com/{}.git",
            token, repo
        );
        let redacted = redact_clone_error(&stderr, token, repo);
        assert!(!redacted.contains(token));
        assert!(redacted.contains("https://x-access-token:***@github.com/acme/data-platform.git"));
    }

    #[test]
    fn validate_source_port_enforces_bounds() {
        assert_eq!(validate_source_port(1).unwrap(), 1);
        assert_eq!(validate_source_port(65535).unwrap(), 65535);
        assert!(validate_source_port(0).is_err());
        assert!(validate_source_port(65536).is_err());
        assert!(validate_source_port(-1).is_err());
    }

    #[test]
    fn test_source_connection_validates_required_fields() {
        let args = TestSourceConnectionArgs {
            source_type: "sql_server".to_string(),
            source_server: "".to_string(),
            source_port: 1433,
            source_authentication_mode: "sql_password".to_string(),
            source_username: "sa".to_string(),
            source_password: "secret".to_string(),
            source_encrypt: true,
            source_trust_server_certificate: false,
        };
        assert!(workspace_test_source_connection(args).is_err());

        let args = TestSourceConnectionArgs {
            source_type: "bad".to_string(),
            source_server: "localhost".to_string(),
            source_port: 1433,
            source_authentication_mode: "sql_password".to_string(),
            source_username: "sa".to_string(),
            source_password: "secret".to_string(),
            source_encrypt: true,
            source_trust_server_certificate: false,
        };
        assert!(workspace_test_source_connection(args).is_err());

        let args = TestSourceConnectionArgs {
            source_type: "sql_server".to_string(),
            source_server: "localhost".to_string(),
            source_port: 65536,
            source_authentication_mode: "sql_password".to_string(),
            source_username: "sa".to_string(),
            source_password: "secret".to_string(),
            source_encrypt: true,
            source_trust_server_certificate: false,
        };
        assert!(workspace_test_source_connection(args).is_err());
    }

    #[test]
    fn discover_source_databases_validates_port_bounds() {
        let args = DiscoverSourceDatabasesArgs {
            source_type: "sql_server".to_string(),
            source_server: "localhost".to_string(),
            source_port: 0,
            source_authentication_mode: "sql_password".to_string(),
            source_username: "sa".to_string(),
            source_password: "secret".to_string(),
            source_encrypt: true,
            source_trust_server_certificate: false,
        };
        assert!(workspace_discover_source_databases(args).is_err());

        let args = DiscoverSourceDatabasesArgs {
            source_type: "sql_server".to_string(),
            source_server: "localhost".to_string(),
            source_port: 65536,
            source_authentication_mode: "sql_password".to_string(),
            source_username: "sa".to_string(),
            source_password: "secret".to_string(),
            source_encrypt: true,
            source_trust_server_certificate: false,
        };
        assert!(workspace_discover_source_databases(args).is_err());
    }

    #[test]
    fn clear_workspace_state_deletes_workspace_and_children() {
        let conn = db::open_in_memory().unwrap();
        conn.execute(
            "INSERT INTO workspaces(id, display_name, migration_repo_path, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["ws-1", "Workspace", "/tmp/repo", "2026-01-01T00:00:00Z"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items(id, workspace_id, display_name, item_type) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["item-1", "ws-1", "Warehouse", "Warehouse"],
        )
        .unwrap();

        clear_workspace_state(&conn).unwrap();

        let workspaces: i64 = conn
            .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
            .unwrap();
        let items: i64 = conn
            .query_row("SELECT COUNT(*) FROM items", [], |row| row.get(0))
            .unwrap();
        assert_eq!(workspaces, 0);
        assert_eq!(items, 0);
    }
}
