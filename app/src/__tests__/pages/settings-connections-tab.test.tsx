import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import ConnectionsTab from '../../routes/settings/connections-tab';
import { mockInvokeCommands, resetTauriMocks } from '../../test/mocks/tauri';
import { useAuthStore } from '@/stores/auth-store';

const MOCK_USER = {
  login: 'octocat',
  avatar_url: 'https://github.com/octocat.png',
  email: 'octocat@github.com',
};

function renderTab() {
  return render(
    <MemoryRouter>
      <ConnectionsTab />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetTauriMocks();
  useAuthStore.setState({ user: null, isLoggedIn: false, isLoading: false });
});

describe('ConnectionsTab — GitHub card', () => {
  it('shows Sign in button when not connected', async () => {
    mockInvokeCommands({ github_get_user: null });
    renderTab();
    await waitFor(() => {
      expect(screen.getByTestId('btn-connect-github')).toBeVisible();
    });
    expect(screen.getByText('Not connected')).toBeVisible();
  });

  it('shows github URL and Disconnect when connected', async () => {
    mockInvokeCommands({ github_get_user: MOCK_USER });
    renderTab();
    await waitFor(() => {
      expect(screen.getByText('github.com/octocat')).toBeVisible();
    });
    expect(screen.getByTestId('btn-disconnect-github')).toBeVisible();
  });

  it('Disconnect button is disabled when migration is running', async () => {
    useAuthStore.setState({ user: MOCK_USER, isLoggedIn: true, isLoading: false });
    mockInvokeCommands({ github_get_user: MOCK_USER });
    const { useWorkflowStore } = await import('@/stores/workflow-store');
    useWorkflowStore.setState((s) => ({ ...s, migrationStatus: 'running' }));
    renderTab();
    await waitFor(() => {
      expect(screen.getByTestId('btn-disconnect-github')).toBeDisabled();
    });
    useWorkflowStore.setState((s) => ({ ...s, migrationStatus: 'idle' }));
  });

  it('Anthropic key input and Update button are present', async () => {
    mockInvokeCommands({ github_get_user: null });
    renderTab();
    await waitFor(() => {
      expect(screen.getByTestId('input-anthropic-key')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-update-anthropic-key')).toBeInTheDocument();
  });
});
