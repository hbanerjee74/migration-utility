use std::{path::Path, sync::Mutex};

use rusqlite::Connection;
use thiserror::Error;

use crate::types::AppSettings;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

pub struct DbState(pub Mutex<Connection>);

const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("../migrations/001_initial_schema.sql")),
    (2, include_str!("../migrations/002_add_fabric_url.sql")),
    (3, include_str!("../migrations/003_add_settings.sql")),
    (
        4,
        include_str!("../migrations/004_add_migration_repo_name.sql"),
    ),
    (
        5,
        include_str!("../migrations/005_add_fabric_credentials.sql"),
    ),
];

pub fn open(path: &Path) -> Result<Connection, DbError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    log::info!("db::open: opening database at {}", path.display());
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

#[cfg(test)]
pub(crate) fn open_in_memory() -> Result<Connection, DbError> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
           version    INTEGER PRIMARY KEY,
           applied_at TEXT NOT NULL
         );",
    )?;

    for (version, sql) in MIGRATIONS {
        let already_applied: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM schema_version WHERE version = ?1",
            [version],
            |row| row.get(0),
        )?;

        if !already_applied {
            log::info!("db: applying migration {}", version);
            let tx = conn.unchecked_transaction()?;
            tx.execute_batch(sql)?;
            tx.execute(
                "INSERT INTO schema_version(version, applied_at) VALUES (?1, datetime('now'))",
                [version],
            )?;
            tx.commit()?;
        }
    }
    Ok(())
}

/// Read the persisted app settings from the settings table.
/// Returns defaults if no row exists yet.
pub fn read_settings(conn: &Connection) -> Result<AppSettings, String> {
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let result: Result<String, _> = stmt.query_row(["app_settings"], |row| row.get(0));

    match result {
        Ok(json) => serde_json::from_str(&json).map_err(|e| e.to_string()),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(AppSettings::default()),
        Err(e) => Err(e.to_string()),
    }
}

/// Write app settings to the settings table.
pub fn write_settings(conn: &Connection, settings: &AppSettings) -> Result<(), String> {
    let json = serde_json::to_string(settings).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        ["app_settings", &json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn open_memory() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        run_migrations(&conn).expect("migrations failed");
        conn
    }

    #[test]
    fn fresh_db_has_all_tables() {
        let conn = open_memory();
        let expected = [
            "schema_version",
            "workspaces",
            "items",
            "warehouse_schemas",
            "warehouse_tables",
            "warehouse_procedures",
            "pipeline_activities",
            "selected_tables",
            "table_artifacts",
            "candidacy",
            "table_config",
            "settings",
        ];
        for table in expected {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    [table],
                    |row| row.get(0),
                )
                .expect("query failed");
            assert_eq!(count, 1, "table '{table}' missing");
        }
    }

    #[test]
    fn migrations_are_idempotent() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        // Run twice — second run must be a no-op
        run_migrations(&conn).expect("first run failed");
        run_migrations(&conn).expect("second run failed");
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 5, "schema_version should have exactly 5 rows");
    }

    #[test]
    fn migration_4_adds_migration_repo_name_to_legacy_workspaces() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();

        // Simulate a legacy DB that already ran migrations 1-3.
        conn.execute_batch(
            r#"
            CREATE TABLE schema_version (
              version    INTEGER PRIMARY KEY,
              applied_at TEXT NOT NULL
            );
            CREATE TABLE workspaces (
              id                  TEXT PRIMARY KEY,
              display_name        TEXT NOT NULL,
              migration_repo_path TEXT NOT NULL,
              fabric_url          TEXT,
              created_at          TEXT NOT NULL
            );
            CREATE TABLE settings (
              key   TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            INSERT INTO schema_version(version, applied_at) VALUES (1, datetime('now'));
            INSERT INTO schema_version(version, applied_at) VALUES (2, datetime('now'));
            INSERT INTO schema_version(version, applied_at) VALUES (3, datetime('now'));
            "#,
        )
        .unwrap();

        run_migrations(&conn).expect("migrations failed");

        let column_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('workspaces') WHERE name = 'migration_repo_name'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(column_count, 1, "migration_repo_name column should be added");

        let version_4_applied: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM schema_version WHERE version = 4",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(version_4_applied, 1, "migration 4 should be recorded");
    }

    #[test]
    fn workspace_migration_repo_name_roundtrip() {
        let conn = open_memory();
        conn.execute(
            "INSERT INTO workspaces(id, display_name, migration_repo_name, migration_repo_path, fabric_url, fabric_service_principal_id, fabric_service_principal_secret, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                "ws-1",
                "Migration Workspace",
                "acme/data-platform",
                "/tmp/repo",
                Option::<String>::None,
                Some("sp-id-123"),
                Some("sp-secret-123"),
                "2026-01-01T00:00:00Z"
            ],
        )
        .unwrap();

        let repo_name: Option<String> = conn
            .query_row(
                "SELECT migration_repo_name FROM workspaces WHERE id = ?1",
                ["ws-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(repo_name.as_deref(), Some("acme/data-platform"));

        let sp_id: Option<String> = conn
            .query_row(
                "SELECT fabric_service_principal_id FROM workspaces WHERE id = ?1",
                ["ws-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(sp_id.as_deref(), Some("sp-id-123"));
    }
}
