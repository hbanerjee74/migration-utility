SELECT
  s.name AS schema_name,
  p.name AS procedure_name,
  CAST(p.object_id AS BIGINT) AS object_id_local,
  m.definition AS sql_body
FROM sys.procedures AS p
INNER JOIN sys.schemas AS s ON s.schema_id = p.schema_id
LEFT JOIN sys.sql_modules AS m ON m.object_id = p.object_id
WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY s.name, p.name;
