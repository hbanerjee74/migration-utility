SELECT name
FROM sys.databases
WHERE HAS_DBACCESS(name)=1
ORDER BY name;
