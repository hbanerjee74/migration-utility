import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ConfigStep from '@/routes/scope/config-step';
import { useWorkflowStore } from '@/stores/workflow-store';

const tauriMocks = vi.hoisted(() => ({
  migrationListTableDetails: vi.fn(),
  migrationSaveTableConfig: vi.fn(),
  appSetPhaseFlags: vi.fn(),
  workspaceGet: vi.fn(),
  workspaceApplyStart: vi.fn(),
  workspaceApplyStatus: vi.fn(),
  migrationReconcileScopeState: vi.fn(),
}));

vi.mock('@/lib/tauri', () => tauriMocks);

function renderStep() {
  return render(
    <MemoryRouter initialEntries={['/scope/config']}>
      <ConfigStep />
    </MemoryRouter>,
  );
}

describe('ConfigStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkflowStore.setState((s) => ({
      ...s,
      workspaceId: 'ws-1',
      appPhase: 'scope_editable',
      phaseFacts: { ...s.phaseFacts, scopeFinalized: false },
    }));
    tauriMocks.migrationListTableDetails.mockResolvedValue([
      {
        selectedTableId: 'st-1',
        warehouseItemId: 'wh-1',
        schemaName: 'dbo',
        tableName: 'fact_sales',
        rowCount: 1_250_000,
        tableType: null,
        loadStrategy: null,
        snapshotStrategy: 'sample_1day',
        incrementalColumn: null,
        dateColumn: null,
        grainColumns: null,
        relationshipsJson: null,
        piiColumns: null,
        confirmedAt: null,
        status: 'Missing details',
      },
    ]);
    tauriMocks.migrationSaveTableConfig.mockResolvedValue(undefined);
    tauriMocks.appSetPhaseFlags.mockResolvedValue({
      appPhase: 'plan_editable',
      hasGithubAuth: true,
      hasAnthropicKey: true,
      isSourceApplied: true,
      scopeFinalized: true,
      planFinalized: false,
    });
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
  });

  it('renders selected table details panel', async () => {
    renderStep();
    await screen.findByText('fact_sales');
    expect(screen.getByText(/dbo.fact_sales/i)).toBeInTheDocument();
  });

  it('autosaves when changing table type', async () => {
    renderStep();
    await screen.findByText('fact_sales');
    fireEvent.change(screen.getByLabelText('Table type'), { target: { value: 'fact' } });
    await waitFor(() => {
      expect(tauriMocks.migrationSaveTableConfig).toHaveBeenCalled();
    });
  });

  it('refresh schema runs apply + reconciliation', async () => {
    renderStep();
    await screen.findByText('fact_sales');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh schema' }));
    await waitFor(() => {
      expect(tauriMocks.workspaceApplyStart).toHaveBeenCalled();
      expect(tauriMocks.migrationReconcileScopeState).toHaveBeenCalledWith('ws-1');
    });
  });
});
