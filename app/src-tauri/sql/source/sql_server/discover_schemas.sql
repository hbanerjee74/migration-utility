SELECT
  CAST(s.schema_id AS BIGINT) AS schema_id_local,
  s.name AS schema_name
FROM sys.schemas AS s
WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY s.name;
