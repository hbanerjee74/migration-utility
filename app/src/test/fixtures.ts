// Factory functions with optional overrides

export function makeWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    id: "ws-1",
    displayName: "Test Workspace",
    migrationRepoName: "acme/repo",
    migrationRepoPath: "/tmp/repo",
    fabricUrl: null,
    fabricServicePrincipalId: null,
    fabricServicePrincipalSecret: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeCandidacy(overrides: Record<string, unknown> = {}) {
  return {
    warehouseItemId: "item-1",
    schemaName: "dbo",
    procedureName: "proc_1",
    tier: "migrate",
    reasoning: "Simple SELECT",
    overridden: false,
    ...overrides,
  };
}

export function makeTableConfig(overrides: Record<string, unknown> = {}) {
  return {
    selectedTableId: "st-1",
    tableType: "fact",
    loadStrategy: "incremental",
    snapshotStrategy: "sample_1day",
    ...overrides,
  };
}
