ALTER TABLE workspaces ADD COLUMN source_type TEXT
  CHECK(source_type IN ('sql_server', 'fabric_warehouse'));
ALTER TABLE workspaces ADD COLUMN source_server TEXT;
ALTER TABLE workspaces ADD COLUMN source_database TEXT;
ALTER TABLE workspaces ADD COLUMN source_port INTEGER;
ALTER TABLE workspaces ADD COLUMN source_authentication_mode TEXT;
ALTER TABLE workspaces ADD COLUMN source_username TEXT;
ALTER TABLE workspaces ADD COLUMN source_password TEXT;
ALTER TABLE workspaces ADD COLUMN source_encrypt INTEGER;
ALTER TABLE workspaces ADD COLUMN source_trust_server_certificate INTEGER;
