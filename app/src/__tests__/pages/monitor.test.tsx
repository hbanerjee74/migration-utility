import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, beforeEach } from 'vitest';
import MonitorSurface from '../../routes/monitor';
import { useWorkflowStore } from '../../stores/workflow-store';
import { mockInvokeCommands, resetTauriMocks } from '../../test/mocks/tauri';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/monitor']}>
      <MonitorSurface />
    </MemoryRouter>,
  );
}

describe('MonitorSurface', () => {
  beforeEach(() => {
    resetTauriMocks();
    mockInvokeCommands({
      monitor_launch_agent: 'agent output',
    });
    useWorkflowStore.setState((s) => ({ ...s, migrationStatus: 'idle' }));
  });

  it('renders ready state when migrationStatus is idle', () => {
    renderPage();
    expect(screen.getByTestId('monitor-ready-state')).toBeInTheDocument();
    expect(screen.queryByTestId('monitor-running-state')).not.toBeInTheDocument();
  });

  it('renders ready state when migrationStatus is complete', () => {
    useWorkflowStore.setState((s) => ({ ...s, migrationStatus: 'complete' }));
    renderPage();
    expect(screen.getByTestId('monitor-ready-state')).toBeInTheDocument();
    expect(screen.queryByTestId('monitor-running-state')).not.toBeInTheDocument();
  });

  it('Launch Migration button transitions migrationStatus to running', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('btn-launch-migration'));
    await waitFor(() => {
      expect(useWorkflowStore.getState().migrationStatus).toBe('running');
    });
  });

  it('renders running state when migrationStatus is running', () => {
    useWorkflowStore.setState((s) => ({ ...s, migrationStatus: 'running' }));
    renderPage();
    expect(screen.getByTestId('monitor-running-state')).toBeInTheDocument();
    expect(screen.queryByTestId('monitor-ready-state')).not.toBeInTheDocument();
  });

  it('running state shows log stream', () => {
    useWorkflowStore.setState((s) => ({ ...s, migrationStatus: 'running' }));
    renderPage();
    expect(screen.getByTestId('monitor-log-stream')).toBeInTheDocument();
  });

  it('shows agent response in running log stream after launch', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('btn-launch-migration'));
    await waitFor(() => {
      expect(screen.getByTestId('monitor-log-stream')).toHaveTextContent('agent output');
    });
  });
});
