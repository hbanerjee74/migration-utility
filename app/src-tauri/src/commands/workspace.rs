use std::{
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicBool, Ordering},
};

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tiberius::{AuthMethod, Client, Config, EncryptionLevel};
use tokio::net::TcpStream;
use tokio::runtime::Builder as RuntimeBuilder;
use tokio_util::compat::TokioAsyncWriteCompatExt;
use uuid::Uuid;

use crate::db::DbState;
use crate::source_sql::{resolve_source_query, should_log_source_sql, SourceQuery};
use crate::types::{CommandError, WarehouseProcedure, WarehouseSchema, WarehouseTable, Workspace};

static WORKSPACE_APPLY_CANCELLED: AtomicBool = AtomicBool::new(false);

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
    tx.execute("DELETE FROM pipeline_activities", [])
        .map_err(|e| {
            log::error!("workspace_reset_state: failed to clear pipeline_activities: {e}");
            CommandError::from(e)
        })?;
    tx.execute("DELETE FROM warehouse_tables", [])
        .map_err(|e| {
            log::error!("workspace_reset_state: failed to clear warehouse_tables: {e}");
            CommandError::from(e)
        })?;
    tx.execute("DELETE FROM warehouse_procedures", [])
        .map_err(|e| {
            log::error!("workspace_reset_state: failed to clear warehouse_procedures: {e}");
            CommandError::from(e)
        })?;
    tx.execute("DELETE FROM warehouse_schemas", [])
        .map_err(|e| {
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceApplyProgressEvent {
    stage: &'static str,
    percent: u8,
    message: String,
}

#[derive(Clone)]
struct SourceConnectionConfig {
    source_type: String,
    source_server: String,
    source_database: String,
    source_port: u16,
    source_username: String,
    source_password: String,
    source_encrypt: bool,
    source_trust_server_certificate: bool,
}

struct SqlServerInventory {
    schemas: Vec<WarehouseSchema>,
    tables: Vec<WarehouseTable>,
    procedures: Vec<WarehouseProcedure>,
}

fn emit_apply_progress(
    app: &AppHandle,
    stage: &'static str,
    percent: u8,
    message: impl Into<String>,
) {
    let payload = WorkspaceApplyProgressEvent {
        stage,
        percent,
        message: message.into(),
    };
    if let Err(e) = app.emit("workspace-apply-progress", payload) {
        log::warn!("workspace_apply_and_clone: failed to emit progress event: {e}");
    }
}

fn check_apply_cancelled() -> Result<(), CommandError> {
    if WORKSPACE_APPLY_CANCELLED.load(Ordering::SeqCst) {
        return Err(CommandError::Io("Apply cancelled by user".to_string()));
    }
    Ok(())
}

fn require_sql_server_source(
    args: &ApplyWorkspaceArgs,
) -> Result<SourceConnectionConfig, CommandError> {
    if args.source_type.as_deref() != Some("sql_server") {
        return Err(CommandError::Io(
            "Apply currently supports sql_server source type only".to_string(),
        ));
    }
    let source_server = args
        .source_server
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| CommandError::Io("Source server is required".to_string()))?
        .to_string();
    let source_database = args
        .source_database
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| CommandError::Io("Source database is required".to_string()))?
        .to_string();
    let source_port = validate_source_port(
        args.source_port
            .ok_or_else(|| CommandError::Io("Source port is required".to_string()))?,
    )?;
    let source_username = args
        .source_username
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| CommandError::Io("Source username is required".to_string()))?
        .to_string();
    let source_password = args
        .source_password
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| CommandError::Io("Source password is required".to_string()))?
        .to_string();

    Ok(SourceConnectionConfig {
        source_type: "sql_server".to_string(),
        source_server,
        source_database,
        source_port,
        source_username,
        source_password,
        source_encrypt: args.source_encrypt.unwrap_or(true),
        source_trust_server_certificate: args.source_trust_server_certificate.unwrap_or(false),
    })
}

fn build_tiberius_config(cfg: &SourceConnectionConfig) -> Config {
    let mut config = Config::new();
    config.host(cfg.source_server.trim());
    config.port(cfg.source_port);
    config.database(cfg.source_database.trim());
    config.authentication(AuthMethod::sql_server(
        cfg.source_username.trim(),
        cfg.source_password.trim(),
    ));
    config.encryption(if cfg.source_encrypt {
        EncryptionLevel::Required
    } else {
        EncryptionLevel::Off
    });
    if cfg.source_trust_server_certificate {
        config.trust_cert();
    }
    config
}

fn fetch_sql_server_inventory(
    cfg: &SourceConnectionConfig,
    app: &AppHandle,
) -> Result<SqlServerInventory, CommandError> {
    let runtime = RuntimeBuilder::new_current_thread()
        .enable_io()
        .enable_time()
        .build()
        .map_err(|e| CommandError::Io(format!("Failed to create async runtime: {e}")))?;

    let config = build_tiberius_config(cfg);
    runtime.block_on(async move {
        check_apply_cancelled()?;
        let tcp = TcpStream::connect(config.get_addr()).await.map_err(|e| {
            log::error!("workspace_apply_and_clone: failed to connect tcp: {e}");
            CommandError::Io(format!("Could not connect to source endpoint: {e}"))
        })?;
        tcp.set_nodelay(true).map_err(|e| {
            log::error!("workspace_apply_and_clone: failed to set nodelay: {e}");
            CommandError::Io(format!("Could not configure socket: {e}"))
        })?;

        let mut client = Client::connect(config, tcp.compat_write())
            .await
            .map_err(|e| {
                log::error!("workspace_apply_and_clone: failed to authenticate: {e}");
                CommandError::Io(format!("Connection test failed: {e}"))
            })?;

        check_apply_cancelled()?;
        emit_apply_progress(app, "importing_schemas", 50, "Importing source schemas...");
        let schemas_query = resolve_source_query(&cfg.source_type, SourceQuery::DiscoverSchemas)?;
        if should_log_source_sql() {
            log::debug!(
                "workspace_apply_and_clone: executing query={} source_type={} sql={}",
                SourceQuery::DiscoverSchemas.name(),
                cfg.source_type,
                schemas_query.trim()
            );
        }
        let schema_rows = client
            .simple_query(schemas_query)
            .await
            .map_err(|e| {
                log::error!("workspace_apply_and_clone: schema query failed: {e}");
                CommandError::Io(format!("Schema discovery failed: {e}"))
            })?
            .into_first_result()
            .await
            .map_err(|e| {
                log::error!("workspace_apply_and_clone: schema result parse failed: {e}");
                CommandError::Io(format!("Schema discovery failed: {e}"))
            })?;

        let mut schemas: Vec<WarehouseSchema> = Vec::with_capacity(schema_rows.len());
        for row in schema_rows {
            check_apply_cancelled()?;
            let schema_name = row
                .get::<&str, _>(1)
                .ok_or_else(|| {
                    CommandError::Io("Schema discovery returned invalid data".to_string())
                })?
                .to_string();
            schemas.push(WarehouseSchema {
                warehouse_item_id: String::new(),
                schema_name,
                schema_id_local: row.get::<i64, _>(0),
            });
        }

        check_apply_cancelled()?;
        emit_apply_progress(app, "importing_tables", 65, "Importing source tables...");
        let tables_query = resolve_source_query(&cfg.source_type, SourceQuery::DiscoverTables)?;
        if should_log_source_sql() {
            log::debug!(
                "workspace_apply_and_clone: executing query={} source_type={} sql={}",
                SourceQuery::DiscoverTables.name(),
                cfg.source_type,
                tables_query.trim()
            );
        }
        let table_rows = client
            .simple_query(tables_query)
            .await
            .map_err(|e| {
                log::error!("workspace_apply_and_clone: table query failed: {e}");
                CommandError::Io(format!("Table discovery failed: {e}"))
            })?
            .into_first_result()
            .await
            .map_err(|e| {
                log::error!("workspace_apply_and_clone: table result parse failed: {e}");
                CommandError::Io(format!("Table discovery failed: {e}"))
            })?;

        let mut tables: Vec<WarehouseTable> = Vec::with_capacity(table_rows.len());
        for row in table_rows {
            check_apply_cancelled()?;
            let schema_name = row
                .get::<&str, _>(0)
                .ok_or_else(|| {
                    CommandError::Io("Table discovery returned invalid schema".to_string())
                })?
                .to_string();
            let table_name = row
                .get::<&str, _>(1)
                .ok_or_else(|| {
                    CommandError::Io("Table discovery returned invalid table".to_string())
                })?
                .to_string();
            tables.push(WarehouseTable {
                warehouse_item_id: String::new(),
                schema_name,
                table_name,
                object_id_local: row.get::<i64, _>(2),
            });
        }

        check_apply_cancelled()?;
        emit_apply_progress(
            app,
            "importing_procedures",
            80,
            "Importing source procedures...",
        );
        let procedures_query =
            resolve_source_query(&cfg.source_type, SourceQuery::DiscoverProcedures)?;
        if should_log_source_sql() {
            log::debug!(
                "workspace_apply_and_clone: executing query={} source_type={} sql={}",
                SourceQuery::DiscoverProcedures.name(),
                cfg.source_type,
                procedures_query.trim()
            );
        }
        let procedure_rows = client
            .simple_query(procedures_query)
            .await
            .map_err(|e| {
                log::error!("workspace_apply_and_clone: procedure query failed: {e}");
                CommandError::Io(format!("Procedure discovery failed: {e}"))
            })?
            .into_first_result()
            .await
            .map_err(|e| {
                log::error!("workspace_apply_and_clone: procedure result parse failed: {e}");
                CommandError::Io(format!("Procedure discovery failed: {e}"))
            })?;

        let mut procedures: Vec<WarehouseProcedure> = Vec::with_capacity(procedure_rows.len());
        for row in procedure_rows {
            check_apply_cancelled()?;
            let schema_name = row
                .get::<&str, _>(0)
                .ok_or_else(|| {
                    CommandError::Io("Procedure discovery returned invalid schema".to_string())
                })?
                .to_string();
            let procedure_name = row
                .get::<&str, _>(1)
                .ok_or_else(|| {
                    CommandError::Io("Procedure discovery returned invalid procedure".to_string())
                })?
                .to_string();
            procedures.push(WarehouseProcedure {
                warehouse_item_id: String::new(),
                schema_name,
                procedure_name,
                object_id_local: row.get::<i64, _>(2),
                sql_body: row.get::<&str, _>(3).map(|v| v.to_string()),
            });
        }

        Ok(SqlServerInventory {
            schemas,
            tables,
            procedures,
        })
    })
}

fn upsert_workspace(
    conn: &Connection,
    args: &ApplyWorkspaceArgs,
    repo_name: &str,
    repo_path: &str,
) -> Result<Workspace, CommandError> {
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
            display_name: args.name.clone(),
            migration_repo_name: Some(repo_name.to_string()),
            migration_repo_path: repo_path.to_string(),
            fabric_url: args.fabric_url.clone(),
            fabric_service_principal_id: args.fabric_service_principal_id.clone(),
            fabric_service_principal_secret: args.fabric_service_principal_secret.clone(),
            source_type: args.source_type.clone(),
            source_server: args.source_server.clone(),
            source_database: args.source_database.clone(),
            source_port: args.source_port,
            source_authentication_mode: args.source_authentication_mode.clone(),
            source_username: args.source_username.clone(),
            source_password: args.source_password.clone(),
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
            display_name: args.name.clone(),
            migration_repo_name: Some(repo_name.to_string()),
            migration_repo_path: repo_path.to_string(),
            fabric_url: args.fabric_url.clone(),
            fabric_service_principal_id: args.fabric_service_principal_id.clone(),
            fabric_service_principal_secret: args.fabric_service_principal_secret.clone(),
            source_type: args.source_type.clone(),
            source_server: args.source_server.clone(),
            source_database: args.source_database.clone(),
            source_port: args.source_port,
            source_authentication_mode: args.source_authentication_mode.clone(),
            source_username: args.source_username.clone(),
            source_password: args.source_password.clone(),
            source_encrypt: args.source_encrypt,
            source_trust_server_certificate: args.source_trust_server_certificate,
            created_at,
        }
    };

    Ok(workspace)
}

fn persist_sql_server_inventory(
    conn: &Connection,
    workspace_id: &str,
    source_database: &str,
    inventory: SqlServerInventory,
) -> Result<(), CommandError> {
    let tx = conn.unchecked_transaction().map_err(|e| {
        log::error!("workspace_apply_and_clone: failed to begin inventory transaction: {e}");
        CommandError::from(e)
    })?;

    let source_item_id = format!("source-db-{workspace_id}");

    tx.execute(
        "INSERT OR REPLACE INTO items(id, workspace_id, display_name, description, folder_id, item_type, connection_string, collation_type)
         VALUES (?1, ?2, ?3, ?4, NULL, 'Warehouse', NULL, NULL)",
        params![
            source_item_id,
            workspace_id,
            source_database,
            Some(format!("SQL Server source database {source_database}"))
        ],
    )
    .map_err(|e| {
        log::error!("workspace_apply_and_clone: failed to upsert source item: {e}");
        CommandError::from(e)
    })?;

    tx.execute(
        "DELETE FROM warehouse_tables WHERE warehouse_item_id=?1",
        params![source_item_id],
    )
    .map_err(|e| {
        log::error!("workspace_apply_and_clone: failed to clear source tables: {e}");
        CommandError::from(e)
    })?;
    tx.execute(
        "DELETE FROM warehouse_procedures WHERE warehouse_item_id=?1",
        params![source_item_id],
    )
    .map_err(|e| {
        log::error!("workspace_apply_and_clone: failed to clear source procedures: {e}");
        CommandError::from(e)
    })?;
    tx.execute(
        "DELETE FROM warehouse_schemas WHERE warehouse_item_id=?1",
        params![source_item_id],
    )
    .map_err(|e| {
        log::error!("workspace_apply_and_clone: failed to clear source schemas: {e}");
        CommandError::from(e)
    })?;

    for mut schema in inventory.schemas {
        check_apply_cancelled()?;
        schema.warehouse_item_id = source_item_id.clone();
        tx.execute(
            "INSERT OR REPLACE INTO warehouse_schemas(warehouse_item_id, schema_name, schema_id_local)
             VALUES (?1, ?2, ?3)",
            params![schema.warehouse_item_id, schema.schema_name, schema.schema_id_local],
        )
        .map_err(|e| {
            log::error!("workspace_apply_and_clone: failed to upsert schema: {e}");
            CommandError::from(e)
        })?;
    }
    for mut table in inventory.tables {
        check_apply_cancelled()?;
        table.warehouse_item_id = source_item_id.clone();
        tx.execute(
            "INSERT OR REPLACE INTO warehouse_tables(warehouse_item_id, schema_name, table_name, object_id_local)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                table.warehouse_item_id,
                table.schema_name,
                table.table_name,
                table.object_id_local
            ],
        )
        .map_err(|e| {
            log::error!("workspace_apply_and_clone: failed to upsert table: {e}");
            CommandError::from(e)
        })?;
    }
    for mut procedure in inventory.procedures {
        check_apply_cancelled()?;
        procedure.warehouse_item_id = source_item_id.clone();
        tx.execute(
            "INSERT OR REPLACE INTO warehouse_procedures(warehouse_item_id, schema_name, procedure_name, object_id_local, sql_body)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                procedure.warehouse_item_id,
                procedure.schema_name,
                procedure.procedure_name,
                procedure.object_id_local,
                procedure.sql_body
            ],
        )
        .map_err(|e| {
            log::error!("workspace_apply_and_clone: failed to upsert procedure: {e}");
            CommandError::from(e)
        })?;
    }

    tx.commit().map_err(|e| {
        log::error!("workspace_apply_and_clone: failed to commit source inventory: {e}");
        CommandError::from(e)
    })?;
    Ok(())
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
    app: AppHandle,
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
    let source_cfg = require_sql_server_source(&args)?;
    WORKSPACE_APPLY_CANCELLED.store(false, Ordering::SeqCst);

    let token = {
        let conn = state.0.lock().unwrap();
        let settings = crate::db::read_settings(&conn).map_err(CommandError::Io)?;
        settings
            .github_oauth_token
            .ok_or_else(|| CommandError::Io("GitHub is not connected".to_string()))?
    };

    emit_apply_progress(
        &app,
        "validating_source_access",
        15,
        "Validating source connectivity and access...",
    );
    let inventory = fetch_sql_server_inventory(&source_cfg, &app)?;
    check_apply_cancelled()?;

    emit_apply_progress(
        &app,
        "verifying_repo",
        35,
        "Verifying migration repository...",
    );
    if let Err(e) = clone_repo_if_needed(&repo_name, &repo_path, &token) {
        log::error!("workspace_apply_and_clone: failed: {}", e);
        return Err(e);
    }
    check_apply_cancelled()?;

    emit_apply_progress(
        &app,
        "persisting_workspace",
        90,
        "Persisting source settings...",
    );
    let conn = state.0.lock().unwrap();
    let workspace = upsert_workspace(&conn, &args, &repo_name, &repo_path)?;
    check_apply_cancelled()?;
    emit_apply_progress(
        &app,
        "importing_source_metadata",
        95,
        "Writing source metadata to local workspace...",
    );
    persist_sql_server_inventory(
        &conn,
        &workspace.id,
        source_cfg.source_database.as_str(),
        inventory,
    )?;

    emit_apply_progress(&app, "completed", 100, "Apply completed.");
    WORKSPACE_APPLY_CANCELLED.store(false, Ordering::SeqCst);
    Ok(workspace)
}

#[tauri::command]
pub fn workspace_cancel_apply() -> Result<(), CommandError> {
    log::info!("workspace_cancel_apply");
    WORKSPACE_APPLY_CANCELLED.store(true, Ordering::SeqCst);
    Ok(())
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
        log::error!(
            "workspace_apply_and_clone: git clone failed: {}",
            safe_stderr
        );
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
pub fn workspace_test_source_connection(
    args: TestSourceConnectionArgs,
) -> Result<String, CommandError> {
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

        let _client = Client::connect(config, tcp.compat_write())
            .await
            .map_err(|e| {
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

        let mut client = Client::connect(config, tcp.compat_write())
            .await
            .map_err(|e| {
                log::error!("workspace_discover_source_databases: failed to authenticate: {e}");
                CommandError::Io(format!("Database discovery failed: {e}"))
            })?;

        let query = resolve_source_query(&args.source_type, SourceQuery::DiscoverDatabases)?;
        if should_log_source_sql() {
            log::debug!(
                "workspace_discover_source_databases: executing query={} source_type={} sql={}",
                SourceQuery::DiscoverDatabases.name(),
                args.source_type,
                query.trim()
            );
        }

        let rows = client
            .simple_query(query)
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
            normalize_repo_full_name(
                "https://x-access-token:abc@github.com/acme/data-platform.git"
            )
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

    #[test]
    fn require_sql_server_source_rejects_missing_database() {
        let args = ApplyWorkspaceArgs {
            name: "Workspace".to_string(),
            migration_repo_name: "acme/repo".to_string(),
            migration_repo_path: "/tmp/repo".to_string(),
            fabric_url: None,
            fabric_service_principal_id: None,
            fabric_service_principal_secret: None,
            source_type: Some("sql_server".to_string()),
            source_server: Some("localhost".to_string()),
            source_database: None,
            source_port: Some(1433),
            source_authentication_mode: Some("sql_password".to_string()),
            source_username: Some("sa".to_string()),
            source_password: Some("secret".to_string()),
            source_encrypt: Some(true),
            source_trust_server_certificate: Some(false),
        };

        assert!(require_sql_server_source(&args).is_err());
    }

    #[test]
    fn persist_sql_server_inventory_replaces_existing_rows() {
        let conn = db::open_in_memory().unwrap();
        conn.execute(
            "INSERT INTO workspaces(id, display_name, migration_repo_path, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["ws-1", "Workspace", "/tmp/repo", "2026-01-01T00:00:00Z"],
        )
        .unwrap();

        let first = SqlServerInventory {
            schemas: vec![WarehouseSchema {
                warehouse_item_id: String::new(),
                schema_name: "sales".to_string(),
                schema_id_local: Some(1),
            }],
            tables: vec![WarehouseTable {
                warehouse_item_id: String::new(),
                schema_name: "sales".to_string(),
                table_name: "orders".to_string(),
                object_id_local: Some(10),
            }],
            procedures: vec![WarehouseProcedure {
                warehouse_item_id: String::new(),
                schema_name: "sales".to_string(),
                procedure_name: "sp_orders".to_string(),
                object_id_local: Some(100),
                sql_body: Some("SELECT 1".to_string()),
            }],
        };
        persist_sql_server_inventory(&conn, "ws-1", "AdventureWorks", first).unwrap();

        let second = SqlServerInventory {
            schemas: vec![WarehouseSchema {
                warehouse_item_id: String::new(),
                schema_name: "finance".to_string(),
                schema_id_local: Some(2),
            }],
            tables: vec![],
            procedures: vec![],
        };
        persist_sql_server_inventory(&conn, "ws-1", "AdventureWorks", second).unwrap();

        let schema_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM warehouse_schemas", [], |row| {
                row.get(0)
            })
            .unwrap();
        let table_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM warehouse_tables", [], |row| {
                row.get(0)
            })
            .unwrap();
        let procedure_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM warehouse_procedures", [], |row| {
                row.get(0)
            })
            .unwrap();
        let schema_name: String = conn
            .query_row(
                "SELECT schema_name FROM warehouse_schemas LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(schema_count, 1);
        assert_eq!(table_count, 0);
        assert_eq!(procedure_count, 0);
        assert_eq!(schema_name, "finance");
    }
}
