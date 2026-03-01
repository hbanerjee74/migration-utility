import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeSurface from '../../routes/home';
import { useWorkflowStore } from '../../stores/workflow-store';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <HomeSurface />
    </MemoryRouter>,
  );
}

describe('HomeSurface', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    useWorkflowStore.setState((s) => ({
      ...s,
      workspaceId: null,
      appPhase: 'setup_required',
      migrationStatus: 'idle',
      scopeStepStatus: {},
    }));
  });

  it('renders setup state when appPhase is setup_required', () => {
    renderPage();
    expect(screen.getByTestId('home-setup-state')).toBeInTheDocument();
    expect(screen.queryByTestId('home-dashboard-state')).not.toBeInTheDocument();
  });

  it('renders dashboard when appPhase is scope_editable', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1', appPhase: 'scope_editable' }));
    renderPage();
    expect(screen.getByTestId('home-dashboard-state')).toBeInTheDocument();
    expect(screen.queryByTestId('home-setup-state')).not.toBeInTheDocument();
  });

  it('renders dashboard when appPhase is running_locked', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1', appPhase: 'running_locked', migrationStatus: 'running' }));
    renderPage();
    expect(screen.getByTestId('home-dashboard-state')).toBeInTheDocument();
  });

  it('"Go to Settings" button navigates to /settings', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('btn-go-to-settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('"Open Monitor" button navigates to /monitor', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1', appPhase: 'scope_editable' }));
    renderPage();
    fireEvent.click(screen.getByTestId('btn-open-monitor'));
    expect(mockNavigate).toHaveBeenCalledWith('/monitor');
  });
});
