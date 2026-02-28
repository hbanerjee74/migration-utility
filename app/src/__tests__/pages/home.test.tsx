import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeSurface from '../../routes/home';
import { useWorkflowStore } from '../../stores/workflow-store';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage(initialPath = '/home') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/home" element={<HomeSurface />} />
        <Route path="/settings/workspace" element={<div data-testid="settings-workspace" />} />
      </Routes>
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

  it('redirects to /settings/workspace when workspaceId is null', () => {
    renderPage();
    expect(screen.getByTestId('settings-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('home-ready-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-active-state')).not.toBeInTheDocument();
  });

  it('renders ready state when workspaceId is set and migrationStatus is idle', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1' }));
    renderPage();
    expect(screen.getByTestId('home-ready-state')).toBeInTheDocument();
  });

  it('renders active state when migrationStatus is running', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1', migrationStatus: 'running' }));
    renderPage();
    expect(screen.getByTestId('home-active-state')).toBeInTheDocument();
    expect(screen.queryByTestId('home-ready-state')).not.toBeInTheDocument();
  });

  it('"Open Monitor" button navigates to /monitor', () => {
    useWorkflowStore.setState((s) => ({ ...s, workspaceId: 'ws-1', migrationStatus: 'running' }));
    renderPage();
    fireEvent.click(screen.getByTestId('btn-open-monitor'));
    expect(mockNavigate).toHaveBeenCalledWith('/monitor');
  });
});
