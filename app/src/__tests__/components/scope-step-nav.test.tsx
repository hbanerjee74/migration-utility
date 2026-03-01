import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ScopeStepNav from '@/components/scope-step-nav';
import { useWorkflowStore } from '@/stores/workflow-store';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/scope' }),
  };
});

function renderNav() {
  return render(
    <MemoryRouter initialEntries={['/scope']}>
      <ScopeStepNav />
    </MemoryRouter>,
  );
}

describe('ScopeStepNav', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    useWorkflowStore.setState((s) => ({
      ...s,
      currentScopeStep: 'scope',
      scopeStepStatus: {},
      appPhase: 'scope_editable',
    }));
  });

  it('renders all 3 step items', () => {
    renderNav();
    expect(screen.getByTestId('scope-step-scope')).toBeInTheDocument();
    expect(screen.getByTestId('scope-step-candidacy')).toBeInTheDocument();
    expect(screen.getByTestId('scope-step-config')).toBeInTheDocument();
  });

  it('clicking a step navigates to its route', () => {
    renderNav();
    fireEvent.click(screen.getByTestId('scope-step-candidacy'));
    expect(mockNavigate).toHaveBeenCalledWith('/scope/candidacy');
  });

  it('clicking a step updates currentScopeStep in store', () => {
    renderNav();
    fireEvent.click(screen.getByTestId('scope-step-config'));
    expect(useWorkflowStore.getState().currentScopeStep).toBe('config');
  });

  it('step buttons are disabled when appPhase is running_locked', () => {
    useWorkflowStore.setState((s) => ({ ...s, appPhase: 'running_locked' }));
    renderNav();
    expect(screen.getByTestId('scope-step-scope')).toBeDisabled();
    expect(screen.getByTestId('scope-step-candidacy')).toBeDisabled();
    expect(screen.getByTestId('scope-step-config')).toBeDisabled();
  });

  it('shows amber banner when appPhase is running_locked', () => {
    useWorkflowStore.setState((s) => ({ ...s, appPhase: 'running_locked' }));
    renderNav();
    expect(screen.getByText(/Migration running/i)).toBeInTheDocument();
  });
});
