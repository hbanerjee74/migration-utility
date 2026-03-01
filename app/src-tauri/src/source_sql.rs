use crate::types::CommandError;

#[derive(Clone, Copy, Debug)]
pub enum SourceQuery {
    DiscoverDatabases,
}

impl SourceQuery {
    pub fn name(self) -> &'static str {
        match self {
            SourceQuery::DiscoverDatabases => "discover_databases",
        }
    }
}

pub fn resolve_source_query(source_type: &str, query: SourceQuery) -> Result<&'static str, CommandError> {
    match (source_type, query) {
        ("sql_server", SourceQuery::DiscoverDatabases) => Ok(include_str!(
            "../sql/source/sql_server/discover_databases.sql"
        )),
        ("fabric_warehouse", SourceQuery::DiscoverDatabases) => Ok(include_str!(
            "../sql/source/fabric_warehouse/discover_databases.sql"
        )),
        _ => Err(CommandError::Io(format!(
            "Unsupported source query lookup: source_type={source_type}, query={}",
            query.name()
        ))),
    }
}

pub fn should_log_source_sql() -> bool {
    std::env::var("MIGRATION_DEBUG_SQL")
        .ok()
        .map(|v| {
            let normalized = v.trim().to_ascii_lowercase();
            normalized == "1" || normalized == "true" || normalized == "yes" || normalized == "on"
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_discover_db_for_sql_server() {
        let sql = resolve_source_query("sql_server", SourceQuery::DiscoverDatabases).unwrap();
        assert!(sql.contains("sys.databases"));
    }

    #[test]
    fn resolves_discover_db_for_fabric_warehouse() {
        let sql = resolve_source_query("fabric_warehouse", SourceQuery::DiscoverDatabases).unwrap();
        assert!(sql.contains("sys.databases"));
    }

    #[test]
    fn rejects_unsupported_source_type() {
        let err = resolve_source_query("postgres", SourceQuery::DiscoverDatabases).unwrap_err();
        match err {
            CommandError::Io(msg) => assert!(msg.contains("Unsupported source query lookup")),
            _ => panic!("expected io error"),
        }
    }
}
