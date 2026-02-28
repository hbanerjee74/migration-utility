# AdventureWorks on Docker (macOS)

This setup runs Microsoft SQL Server in Docker with persistent storage, then restores AdventureWorks.

## 1) Prerequisites

- Docker Desktop installed and running.
- SQL Server image available locally:
  - `mcr.microsoft.com/mssql/server:2022-latest`

## 2) Start SQL Server container

```bash
docker run --name aw-sql \
  -e ACCEPT_EULA=Y \
  -e MSSQL_SA_PASSWORD='YourStrong!Passw0rd' \
  -e MSSQL_PID=Developer \
  -p 1433:1433 \
  -v aw-sql-data:/var/opt/mssql \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

Set restart policy once so it comes back automatically with Docker Desktop:

```bash
docker update --restart unless-stopped aw-sql
```

## 3) Download AdventureWorks backup

```bash
mkdir -p ~/adventureworks
cd ~/adventureworks
curl -L -o AdventureWorks2022.bak \
  https://github.com/microsoft/sql-server-samples/releases/download/adventureworks/AdventureWorks2022.bak
```

## 4) Copy backup into container

```bash
docker exec aw-sql mkdir -p /var/opt/mssql/backup
docker cp AdventureWorks2022.bak aw-sql:/var/opt/mssql/backup/AdventureWorks2022.bak
```

## 5) Read logical file names from backup

```bash
docker exec -it aw-sql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -Q "RESTORE FILELISTONLY FROM DISK = N'/var/opt/mssql/backup/AdventureWorks2022.bak';"
```

If `sqlcmd` is not found at that path, try:

```bash
/opt/mssql-tools/bin/sqlcmd
```

## 6) Restore AdventureWorks

Replace `<DATA_LOGICAL_NAME>` and `<LOG_LOGICAL_NAME>` using the `FILELISTONLY` output.

```bash
docker exec -it aw-sql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -Q "RESTORE DATABASE AdventureWorks2022
      FROM DISK = N'/var/opt/mssql/backup/AdventureWorks2022.bak'
      WITH MOVE N'<DATA_LOGICAL_NAME>' TO N'/var/opt/mssql/data/AdventureWorks2022.mdf',
           MOVE N'<LOG_LOGICAL_NAME>'  TO N'/var/opt/mssql/data/AdventureWorks2022_log.ldf',
           REPLACE, STATS=10;"
```

## 7) Verify restore

```bash
docker exec -it aw-sql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -Q "SELECT name FROM sys.databases WHERE name = 'AdventureWorks2022';"
```

## 8) Daily workflow

- Start container: `docker start aw-sql`
- Stop container: `docker stop aw-sql`
- Check health/logs: `docker logs -f aw-sql`
- Connect from VS Code:
  - Server: `localhost,1433`
  - User: `sa`
  - Password: your `MSSQL_SA_PASSWORD`
  - Trust server certificate: enabled

## Troubleshooting

- `Conflict. The container name "/aw-sql" is already in use`:
  - Container already exists; use `docker start aw-sql` instead of `docker run`.
- `Login failed for user 'sa'`:
  - Usually a password mismatch with existing persisted data.
  - For a clean reset:

```bash
docker rm -f aw-sql
docker volume rm aw-sql-data
```
