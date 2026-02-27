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
    // Default: no existing workspace
    mockInvokeCommand('workspace_get', null);
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('btn-submit'));
    expect(await screen.findByText('Workspace name is required')).toBeInTheDocument();
    expect(screen.getByText('Migration repo path is required')).toBeInTheDocument();
  });

  it('calls workspace_create and navigates to /scope on valid submit', async () => {
    const user = userEvent.setup();
    const ws = makeWorkspace({ id: 'ws-new', displayName: 'Test WS' });
    mockInvokeCommand('workspace_create', ws);
    renderPage();

    await user.type(screen.getByTestId('input-workspace-name'), 'Test WS');
    await user.type(screen.getByTestId('input-repo-path'), '/tmp/repo');
    await user.click(screen.getByTestId('btn-submit'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/scope'));
  });

  it('redirects to /scope when workspace already exists', async () => {
    mockInvokeCommand('workspace_get', makeWorkspace());
    renderPage();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/scope'));
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
