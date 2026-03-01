SELECT
  s.name AS schema_name,
  t.name AS table_name,
  CAST(t.object_id AS BIGINT) AS object_id_local
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY s.name, t.name;
