import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '@/stores/workflow-store';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      currentStep: 'workspace',
      completedSteps: [],
      workspaceId: null,
      selectedTableIds: [],
    });
  });

  it('has correct initial state', () => {
    const { currentStep, completedSteps, workspaceId } = useWorkflowStore.getState();
    expect(currentStep).toBe('workspace');
    expect(completedSteps).toHaveLength(0);
    expect(workspaceId).toBeNull();
  });

  it('advanceTo updates currentStep', () => {
    useWorkflowStore.getState().advanceTo('scope');
    expect(useWorkflowStore.getState().currentStep).toBe('scope');
  });

  it('markComplete adds step to completedSteps', () => {
    useWorkflowStore.getState().markComplete('workspace');
    expect(useWorkflowStore.getState().completedSteps).toContain('workspace');
  });

  it('markComplete is idempotent', () => {
    useWorkflowStore.getState().markComplete('workspace');
    useWorkflowStore.getState().markComplete('workspace');
    expect(useWorkflowStore.getState().completedSteps).toHaveLength(1);
  });

  it('reset restores initial state', () => {
    useWorkflowStore.getState().advanceTo('scope');
    useWorkflowStore.getState().markComplete('workspace');
    useWorkflowStore.getState().setWorkspaceId('ws-1');
    useWorkflowStore.getState().reset();
    const state = useWorkflowStore.getState();
    expect(state.currentStep).toBe('workspace');
    expect(state.completedSteps).toHaveLength(0);
    expect(state.workspaceId).toBeNull();
  });
});
