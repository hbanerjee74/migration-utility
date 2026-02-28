import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import StepperNav from '@/components/stepper-nav';
import { useWorkflowStore } from '@/stores/workflow-store';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal: () => Promise<typeof import('react-router')>) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderNav() {
  return render(<MemoryRouter><StepperNav /></MemoryRouter>);
}

describe('StepperNav', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    useWorkflowStore.setState((s) => ({
      ...s,
      currentStep: 'workspace',
      completedSteps: [],
      stepStatus: {},
      stepSavedAt: {},
      workspaceId: null,
      selectedTableIds: [],
    }));
  });

  it('renders all 5 steps', () => {
    renderNav();
    expect(screen.getByTestId('step-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('step-scope')).toBeInTheDocument();
    expect(screen.getByTestId('step-candidacy')).toBeInTheDocument();
    expect(screen.getByTestId('step-config')).toBeInTheDocument();
    expect(screen.getByTestId('step-launch')).toBeInTheDocument();
  });

  it('clicking any step navigates to it', async () => {
    renderNav();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('step-scope'));
    expect(mockNavigate).toHaveBeenCalledWith('/scope');
  });

  it('clicking the active step still navigates to it', async () => {
    renderNav();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('step-workspace'));
    expect(mockNavigate).toHaveBeenCalledWith('/workspace');
  });

  it('clicking a step without completing previous steps navigates to it', async () => {
    useWorkflowStore.setState((s) => ({ ...s, currentStep: 'workspace', completedSteps: [] }));
    renderNav();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('step-launch'));
    expect(mockNavigate).toHaveBeenCalledWith('/launch');
  });
});
