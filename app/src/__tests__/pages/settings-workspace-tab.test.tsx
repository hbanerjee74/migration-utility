import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import WorkspaceTab from '../../routes/settings/workspace-tab';
import { makeWorkspace } from '../../test/fixtures';
import { mockInvoke, mockInvokeCommands, resetTauriMocks } from '../../test/mocks/tauri';
import { useWorkflowStore } from '../../stores/workflow-store';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue('/selected/path'),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/workspace']}>
      <WorkspaceTab />
    </MemoryRouter>,
  );
}

describe('WorkspaceTab (Settings)', () => {
  beforeEach(() => {
    resetTauriMocks();
    mockInvokeCommands({
      workspace_get: null,
      github_list_repos: [],
      workspace_apply_and_clone: makeWorkspace(),
    });
    useWorkflowStore.setState((s) => ({
      ...s,
      migrationStatus: 'idle',
      workspaceId: null,
    }));
  });

  it('renders fabric, migration repo, and working directory cards with explicit apply flow', async () => {
    renderPage();

    expect(screen.getByTestId('settings-panel-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('settings-workspace-fabric-card')).toBeInTheDocument();
    expect(screen.getByTestId('settings-workspace-repo-card')).toBeInTheDocument();
    expect(screen.getByTestId('settings-workspace-working-dir-card')).toBeInTheDocument();
    expect(screen.getByTestId('input-fabric-url')).toBeInTheDocument();
    expect(screen.getByTestId('input-fabric-service-principal-id')).toBeInTheDocument();
    expect(screen.getByTestId('input-fabric-secret')).toBeInTheDocument();
    expect(screen.getByTestId('input-repo-name')).toBeInTheDocument();
    expect(screen.getByTestId('input-repo-path')).toBeInTheDocument();
    expect(screen.getByTestId('btn-apply')).toBeInTheDocument();

    expect(screen.queryByText('Load mock data')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Saved /)).not.toBeInTheDocument();
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
  });

  it('shows validation errors when Apply is clicked on an empty form', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('btn-apply'));

    expect(await screen.findByText('Repo name is required')).toBeInTheDocument();
    expect(screen.getByText('Repo path is required')).toBeInTheDocument();
  });

  it('loads existing workspace repo values from backend', async () => {
    const ws = makeWorkspace({
      migrationRepoName: 'acme/data-platform',
      migrationRepoPath: '/existing/path',
      fabricUrl: 'https://app.fabric.microsoft.com/groups/example',
      fabricServicePrincipalId: 'sp-vibedata-migration',
      fabricServicePrincipalSecret: 'secret-value',
    });
    mockInvokeCommands({
      workspace_get: ws,
      github_list_repos: [],
      workspace_apply_and_clone: ws,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('input-fabric-url')).toHaveValue(
        'https://app.fabric.microsoft.com/groups/example',
      );
      expect(screen.getByTestId('input-fabric-service-principal-id')).toHaveValue(
        'sp-vibedata-migration',
      );
      expect(screen.getByTestId('input-fabric-secret')).toHaveValue('secret-value');
      expect(screen.getByTestId('input-repo-name')).toHaveValue('acme/data-platform');
      expect(screen.getByTestId('input-repo-path')).toHaveValue('/existing/path');
    });
  });

  it('browse button opens directory picker and sets repo path', async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('btn-pick-repo-path'));

    await waitFor(() => expect(open).toHaveBeenCalledWith({ directory: true, multiple: false }));
    expect(screen.getByTestId('input-repo-path')).toHaveValue('/selected/path');
  });

  it('shows and applies repo name autocomplete suggestions', async () => {
    const user = userEvent.setup();
    mockInvokeCommands({
      workspace_get: null,
      workspace_apply_and_clone: makeWorkspace(),
      github_list_repos: [
        { id: 1, fullName: 'acme/data-platform', private: true },
        { id: 2, fullName: 'acme/analytics', private: false },
      ],
    });

    renderPage();

    const repoInput = screen.getByTestId('input-repo-name');
    await user.click(repoInput);
    await user.type(repoInput, 'ac');

    expect(await screen.findByTestId('repo-suggestions')).toBeInTheDocument();
    expect(await screen.findByTestId('repo-suggestion-0')).toHaveTextContent('acme/data-platform');

    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('input-repo-name')).toHaveValue('acme/data-platform');

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('github_list_repos', { query: 'ac', limit: 10 });
    });
  });

  it('disables fields and apply button while migration is running', async () => {
    useWorkflowStore.setState((s) => ({ ...s, migrationStatus: 'running' }));
    renderPage();

    expect(screen.getByTestId('input-repo-name')).toBeDisabled();
    expect(screen.getByTestId('input-repo-path')).toBeDisabled();
    expect(screen.getByTestId('input-fabric-url')).toBeDisabled();
    expect(screen.getByTestId('input-fabric-service-principal-id')).toBeDisabled();
    expect(screen.getByTestId('input-fabric-secret')).toBeDisabled();
    expect(screen.getByTestId('btn-pick-repo-path')).toBeDisabled();
    expect(screen.getByTestId('btn-apply')).toBeDisabled();
    expect(
      screen.getByText('Locked during active migration. Changes are not saved while a migration is running.'),
    ).toBeInTheDocument();
  });
});
