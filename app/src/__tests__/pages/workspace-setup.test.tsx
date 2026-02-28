import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import WorkspaceSetup from '../../routes/workspace-setup';
import { mockInvokeCommand, resetTauriMocks } from '../../test/mocks/tauri';
import { makeWorkspace } from '../../test/fixtures';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue('/selected/path'),
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkspaceSetup />
    </MemoryRouter>
  );
}

describe('WorkspaceSetup', () => {
  beforeEach(() => {
    resetTauriMocks();
    mockNavigate.mockClear();
    mockInvokeCommand('workspace_get', null);
  });

  it('shows validation errors when Apply is clicked on an empty form', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('btn-apply'));
    expect(await screen.findByText('Workspace name is required')).toBeInTheDocument();
    expect(screen.getByText('Migration repo path is required')).toBeInTheDocument();
  });

  it('Apply creates workspace and stays on the page', async () => {
    const user = userEvent.setup();
    const ws = makeWorkspace({ id: 'ws-new', displayName: 'Test WS' });
    mockInvokeCommand('workspace_create', ws);
    renderPage();

    await user.type(screen.getByTestId('input-workspace-name'), 'Test WS');
    await user.type(screen.getByTestId('input-repo-path'), '/tmp/repo');
    await user.click(screen.getByTestId('btn-apply'));

    // Apply should NOT navigate — user stays on the current tab.
    await waitFor(() => expect(mockNavigate).not.toHaveBeenCalled());
  });

  it('loads existing workspace data into form without navigating', async () => {
    const ws = makeWorkspace({ displayName: 'Existing WS', migrationRepoPath: '/existing/path' });
    mockInvokeCommand('workspace_get', ws);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('input-workspace-name')).toHaveValue('Existing WS');
      expect(screen.getByTestId('input-repo-path')).toHaveValue('/existing/path');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('browse button calls dialog open and sets repo path', async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('btn-pick-directory'));
    await waitFor(() => expect(open).toHaveBeenCalledWith({ directory: true, multiple: false }));
    expect(screen.getByTestId('input-repo-path')).toHaveValue('/selected/path');
  });
});
