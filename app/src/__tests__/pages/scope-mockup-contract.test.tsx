import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import ScopeStep from '@/routes/scope/scope-step';
import ConfigStep from '@/routes/scope/config-step';
import { useWorkflowStore } from '@/stores/workflow-store';

const tauriMocks = vi.hoisted(() => ({
  migrationListScopeInventory: vi.fn(),
  migrationAddTablesToSelection: vi.fn(),
  migrationSetTableSelected: vi.fn(),
  migrationResetSelectedTables: vi.fn(),
  workspaceGet: vi.fn(),
  workspaceApplyStart: vi.fn(),
  workspaceApplyStatus: vi.fn(),
  migrationReconcileScopeState: vi.fn(),
  appSetPhaseFlags: vi.fn(),
  migrationListTableDetails: vi.fn(),
  migrationSaveTableConfig: vi.fn(),
}));

vi.mock('@/lib/tauri', () => tauriMocks);

function renderScopeSelect() {
  return render(
    <MemoryRouter initialEntries={['/scope']}>
      <Routes>
        <Route path="/scope" element={<ScopeStep />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderScopeDetails() {
  return render(
    <MemoryRouter initialEntries={['/scope/config']}>
      <Routes>
        <Route path="/scope/config" element={<ConfigStep />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Scope UI mockup contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkflowStore.setState((s) => ({
      ...s,
      workspaceId: 'ws-1',
      appPhase: 'scope_editable',
      phaseFacts: { ...s.phaseFacts, scopeFinalized: false },
    }));

    tauriMocks.migrationListScopeInventory.mockResolvedValue([
      { warehouseItemId: 'wh-1', schemaName: 'dbo', tableName: 'fact_sales', isSelected: true },
      { warehouseItemId: 'wh-1', schemaName: 'dbo', tableName: 'dim_customer', isSelected: false },
      { warehouseItemId: 'wh-1', schemaName: 'reporting', tableName: 'gold_summary', isSelected: false },
    ]);
    tauriMocks.migrationAddTablesToSelection.mockResolvedValue(1);
    tauriMocks.migrationSetTableSelected.mockResolvedValue(undefined);
    tauriMocks.migrationResetSelectedTables.mockResolvedValue(1);
    tauriMocks.workspaceGet.mockResolvedValue({
      id: 'ws-1',
      displayName: 'Workspace',
      migrationRepoName: 'acme/repo',
      migrationRepoPath: '/tmp/repo',
      sourceType: 'sql_server',
      sourceServer: 'localhost',
      sourceDatabase: 'master',
      sourcePort: 1433,
      sourceAuthenticationMode: 'sql_password',
      sourceUsername: 'sa',
      sourcePassword: 'secret',
      sourceEncrypt: true,
      sourceTrustServerCertificate: false,
    });
    tauriMocks.workspaceApplyStart.mockResolvedValue('job-1');
    tauriMocks.workspaceApplyStatus.mockResolvedValue({ state: 'succeeded', error: null });
    tauriMocks.migrationReconcileScopeState.mockResolvedValue({ kept: 1, invalidated: 0, removed: 0 });
    tauriMocks.appSetPhaseFlags.mockResolvedValue({
      appPhase: 'plan_editable',
      hasGithubAuth: true,
      hasAnthropicKey: true,
      isSourceApplied: true,
      scopeFinalized: true,
      planFinalized: false,
    });

    tauriMocks.migrationListTableDetails.mockResolvedValue([
      {
        selectedTableId: 'st-1',
        warehouseItemId: 'wh-1',
        schemaName: 'dbo',
        tableName: 'fact_sales',
        tableType: 'fact',
        loadStrategy: 'incremental',
        snapshotStrategy: 'sample_1day',
        incrementalColumn: 'load_date',
        dateColumn: 'sale_date',
        piiColumns: '["customer_email"]',
        confirmedAt: null,
        status: 'Ready',
      },
      {
        selectedTableId: 'st-2',
        warehouseItemId: 'wh-1',
        schemaName: 'dbo',
        tableName: 'dim_customer',
        tableType: null,
        loadStrategy: null,
        snapshotStrategy: 'sample_1day',
        incrementalColumn: null,
        dateColumn: null,
        piiColumns: null,
        confirmedAt: null,
        status: 'Missing details',
      },
    ]);
    tauriMocks.migrationSaveTableConfig.mockResolvedValue(undefined);
  });

  it('matches select-tables mockup contract for header, tab labels, filter ordering, and action labels', async () => {
    renderScopeSelect();
    await screen.findByText('fact_sales');

    expect(screen.getByText(/tables selected/i)).toBeInTheDocument();
    expect(screen.getByText(/scope editable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh schema' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalize Scope' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1. Select Tables' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2. Table Details' })).toBeInTheDocument();

    const filters = screen.getAllByRole('textbox');
    expect(filters[0]).toHaveAttribute('placeholder', 'Search schema...');
    expect(filters[1]).toHaveAttribute('placeholder', 'Search tables...');

    const actionButtons = [
      screen.getByRole('button', { name: 'Add to selection' }),
      screen.getByRole('button', { name: 'Clear filters' }),
      screen.getByRole('button', { name: 'Reset selection' }),
    ];
    expect(actionButtons.map((b) => b.textContent)).toEqual([
      'Add to selection',
      'Clear filters',
      'Reset selection',
    ]);

    const sortButtons = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(sortButtons.some((text) => text.includes('Schema'))).toBe(true);
    expect(sortButtons.some((text) => text.includes('Table'))).toBe(true);
  });

  it('matches table-details mockup contract for summary chips, tab labels, table columns, and detail field labels', async () => {
    renderScopeDetails();
    await screen.findByText('fact_sales');

    expect(screen.getByText(/Scope — Table details capture/i)).toBeInTheDocument();
    expect(screen.getByText(/tables ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs details for/i)).toBeInTheDocument();
    expect(screen.getByText(/Saved/i)).toBeInTheDocument();
    expect(screen.getByText(/Scope editable/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '1. Select Tables' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2. Table Details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh schema' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalize Scope' })).toBeInTheDocument();

    const tableHeader = screen.getByText('Name').closest('div');
    expect(tableHeader).not.toBeNull();
    const headerScope = within(tableHeader as HTMLElement);
    expect(headerScope.getByText('Schema')).toBeInTheDocument();
    expect(headerScope.getByText('Rows')).toBeInTheDocument();
    expect(headerScope.getByText('Status')).toBeInTheDocument();

    expect(screen.getByText('Migration metadata required for build and tests.')).toBeInTheDocument();
    expect(screen.getByLabelText('Table type')).toBeInTheDocument();
    expect(screen.getByLabelText('Load strategy')).toBeInTheDocument();
    expect(screen.getByLabelText('Snapshot strategy')).toBeInTheDocument();
    expect(screen.getByLabelText('Incremental column')).toBeInTheDocument();
    expect(screen.getByLabelText('Canonical date column')).toBeInTheDocument();
    expect(screen.getByLabelText('PII columns (required for fixture masking)')).toBeInTheDocument();
    expect(screen.getByLabelText('PK columns')).toBeInTheDocument();
    expect(screen.getByLabelText('Grain columns')).toBeInTheDocument();
    expect(screen.getByLabelText('Relationships (required for tests)')).toBeInTheDocument();
    expect(screen.getByLabelText('SCD (dimensions only)')).toBeInTheDocument();
  });
});
