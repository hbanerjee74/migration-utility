import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import TabNav from '@/components/stepper-nav';
import { useWorkflowStore } from '@/stores/workflow-store';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal: () => Promise<typeof import('react-router')>) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate, useLocation: () => ({ pathname: '/workspace' }) };
});

function renderNav() {
  return render(<MemoryRouter><TabNav /></MemoryRouter>);
}

describe('TabNav', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    useWorkflowStore.setState((s) => ({
      ...s,
      currentStep: 'workspace',
      stepStatus: {},
      stepSavedAt: {},
      workspaceId: null,
      selectedTableIds: [],
    }));
  });

  it('renders all 5 tabs', () => {
    renderNav();
    expect(screen.getByTestId('tab-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('tab-scope')).toBeInTheDocument();
    expect(screen.getByTestId('tab-candidacy')).toBeInTheDocument();
    expect(screen.getByTestId('tab-config')).toBeInTheDocument();
    expect(screen.getByTestId('tab-launch')).toBeInTheDocument();
  });

  it('clicking any tab navigates to it', async () => {
    renderNav();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('tab-scope'));
    expect(mockNavigate).toHaveBeenCalledWith('/scope');
  });

  it('clicking the active tab still navigates to it', async () => {
    renderNav();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('tab-workspace'));
    expect(mockNavigate).toHaveBeenCalledWith('/workspace');
  });

  it('clicking any tab regardless of status navigates to it', async () => {
    // No steps applied — all tabs must still be reachable
    renderNav();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('tab-launch'));
    expect(mockNavigate).toHaveBeenCalledWith('/launch');
  });
});
