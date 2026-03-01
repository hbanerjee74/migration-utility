# DW Samples on Docker (macOS)

This setup runs Microsoft SQL Server in Docker with persistent storage, then restores:

- `AdventureWorksDW2022`
- `WideWorldImportersDW`

## Developer test workflow

Use this split for local development in this repo.

### One-time setup (per machine)

- Install and start Docker Desktop.
- Pull image (if not already present):

```bash
docker pull mcr.microsoft.com/mssql/server:2022-latest
```

- Create the container once (name is expected by the helper scripts):

```bash
docker run --name aw-sql \
  -e ACCEPT_EULA=Y \
  -e MSSQL_SA_PASSWORD='YourStrong!Passw0rd' \
  -e MSSQL_PID=Developer \
  -p 1433:1433 \
  -v aw-sql-data:/var/opt/mssql \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

- Set restart policy once:

```bash
docker update --restart unless-stopped aw-sql
```

- Restore sample DW databases once:

```bash
cd /Users/hbanerjee/src/migration-utility
SA_PASSWORD='YourStrong!Passw0rd' ./scripts/restore-dw-samples.sh
```

### Each new coding session

- Start SQL Server:

```bash
docker start aw-sql
```

- Verify container is ready:

```bash
docker logs --tail 50 aw-sql
```

- Run the normal Rust tests you changed (example):

```bash
cargo test --manifest-path app/src-tauri/Cargo.toml source_sql
```

- Run real SQL Server integration tests (ignored by default) against `WideWorldImportersDW`:

```bash
MIGRATION_TEST_SQL_SERVER_HOST=127.0.0.1 \
MIGRATION_TEST_SQL_SERVER_PORT=1433 \
MIGRATION_TEST_SQL_SERVER_USER=sa \
MIGRATION_TEST_SQL_SERVER_PASSWORD='YourStrong!Passw0rd' \
MIGRATION_TEST_SQL_SERVER_DATABASE=WideWorldImportersDW \
cargo test --manifest-path app/src-tauri/Cargo.toml source_sql -- --ignored
```

- Stop container when done (optional):

```bash
docker stop aw-sql
```

## 1) Prerequisites

- Docker Desktop installed and running.
- SQL Server image available locally:
  - `mcr.microsoft.com/mssql/server:2022-latest`

If the image is missing, import it from Microsoft Container Registry:

```bash
docker pull mcr.microsoft.com/mssql/server:2022-latest
```

Confirm it exists locally:

```bash
docker images mcr.microsoft.com/mssql/server:2022-latest
```

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

## 3) Restore missing DW samples (recommended)

```bash
cd /Users/hbanerjee/src/migration-utility
SA_PASSWORD='YourStrong!Passw0rd' ./scripts/restore-dw-samples.sh
```

Script behavior:

- Downloads backups to `/tmp/sql-backups` by default.
- Restores only missing databases.
- Cleans local downloaded backups after run by default.
- Uses SQL Server host/port from:
  - `SQL_SERVER_HOST` (default `localhost`)
  - `SQL_SERVER_PORT` (default `1433`)

Optional overrides:

- `CONTAINER_NAME` (default `aw-sql`)
- `BACKUP_DIR` (default `/tmp/sql-backups`)
- `KEEP_BACKUPS=1` to keep local `.bak` files

## 4) Daily workflow

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
