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
      migrationStatus: 'idle',
      scopeStepStatus: {},
    }));
  });

  it('renders setup state when workspaceId is null', () => {
    renderPage();
    expect(screen.getByTestId('home-setup-state')).toBeInTheDocument();
    expect(screen.queryByTestId('home-dashboard-state')).not.toBeInTheDocument();
  });

  it('renders dashboard when workspaceId is set', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1' }));
    renderPage();
    expect(screen.getByTestId('home-dashboard-state')).toBeInTheDocument();
    expect(screen.queryByTestId('home-setup-state')).not.toBeInTheDocument();
  });

  it('renders dashboard when migrationStatus is running', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1', migrationStatus: 'running' }));
    renderPage();
    expect(screen.getByTestId('home-dashboard-state')).toBeInTheDocument();
  });

  it('"Go to Settings" button navigates to /settings', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('btn-go-to-settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('"Open Monitor" button navigates to /monitor', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1' }));
    renderPage();
    fireEvent.click(screen.getByTestId('btn-open-monitor'));
    expect(mockNavigate).toHaveBeenCalledWith('/monitor');
  });
});
