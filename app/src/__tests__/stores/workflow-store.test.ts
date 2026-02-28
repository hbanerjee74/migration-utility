import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '@/stores/workflow-store';

describe('useWorkflowStore', () => {
  beforeEach(() => {
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

  it('has correct initial state', () => {
    const { currentStep, completedSteps, stepStatus, workspaceId } = useWorkflowStore.getState();
    expect(currentStep).toBe('workspace');
    expect(completedSteps).toHaveLength(0);
    expect(stepStatus).toEqual({});
    expect(workspaceId).toBeNull();
  });

  it('advanceTo updates currentStep', () => {
    useWorkflowStore.getState().advanceTo('scope');
    expect(useWorkflowStore.getState().currentStep).toBe('scope');
  });

  it('markComplete adds step to completedSteps and sets status to applied', () => {
    useWorkflowStore.getState().markComplete('workspace');
    const { completedSteps, stepStatus } = useWorkflowStore.getState();
    expect(completedSteps).toContain('workspace');
    expect(stepStatus.workspace).toBe('applied');
  });

  it('markComplete is idempotent', () => {
    useWorkflowStore.getState().markComplete('workspace');
    useWorkflowStore.getState().markComplete('workspace');
    expect(useWorkflowStore.getState().completedSteps).toHaveLength(1);
  });

  it('saveStep sets status to saved and records timestamp', () => {
    useWorkflowStore.getState().saveStep('scope');
    const { stepStatus, stepSavedAt } = useWorkflowStore.getState();
    expect(stepStatus.scope).toBe('saved');
    expect(stepSavedAt.scope).toBeTruthy();
  });

  it('saveStep does not downgrade an applied step', () => {
    useWorkflowStore.getState().applyStep('scope');
    useWorkflowStore.getState().saveStep('scope');
    expect(useWorkflowStore.getState().stepStatus.scope).toBe('applied');
  });

  it('applyStep adds to completedSteps and sets status to applied', () => {
    useWorkflowStore.getState().applyStep('candidacy');
    const { completedSteps, stepStatus } = useWorkflowStore.getState();
    expect(completedSteps).toContain('candidacy');
    expect(stepStatus.candidacy).toBe('applied');
  });

  it('reset restores initial state', () => {
    useWorkflowStore.getState().advanceTo('scope');
    useWorkflowStore.getState().applyStep('workspace');
    useWorkflowStore.getState().saveStep('scope');
    useWorkflowStore.getState().setWorkspaceId('ws-1');
    useWorkflowStore.getState().reset();
    const state = useWorkflowStore.getState();
    expect(state.currentStep).toBe('workspace');
    expect(state.completedSteps).toHaveLength(0);
    expect(state.stepStatus).toEqual({});
    expect(state.stepSavedAt).toEqual({});
    expect(state.workspaceId).toBeNull();
  });
});
