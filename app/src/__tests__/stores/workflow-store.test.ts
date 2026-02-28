import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '@/stores/workflow-store';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.setState((s) => ({
      ...s,
      currentStep: 'workspace',
      stepStatus: {},
      stepSavedAt: {},
      workspaceId: null,
      selectedTableIds: [],
    }));
  });

  it('has correct initial state', () => {
    const { currentStep, stepStatus, workspaceId } = useWorkflowStore.getState();
    expect(currentStep).toBe('workspace');
    expect(stepStatus).toEqual({});
    expect(workspaceId).toBeNull();
  });

  it('setCurrentStep updates currentStep', () => {
    useWorkflowStore.getState().setCurrentStep('scope');
    expect(useWorkflowStore.getState().currentStep).toBe('scope');
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

  it('applyStep sets status to applied and records timestamp', () => {
    useWorkflowStore.getState().applyStep('candidacy');
    const { stepStatus, stepSavedAt } = useWorkflowStore.getState();
    expect(stepStatus.candidacy).toBe('applied');
    expect(stepSavedAt.candidacy).toBeTruthy();
  });

  it('applyStep is idempotent', () => {
    useWorkflowStore.getState().applyStep('workspace');
    const first = useWorkflowStore.getState().stepSavedAt.workspace;
    useWorkflowStore.getState().applyStep('workspace');
    // Status stays applied; timestamp updates (that's fine)
    expect(useWorkflowStore.getState().stepStatus.workspace).toBe('applied');
    expect(first).toBeTruthy();
  });

  it('reset restores initial state', () => {
    useWorkflowStore.getState().setCurrentStep('scope');
    useWorkflowStore.getState().applyStep('workspace');
    useWorkflowStore.getState().saveStep('scope');
    useWorkflowStore.getState().setWorkspaceId('ws-1');
    useWorkflowStore.getState().reset();
    const state = useWorkflowStore.getState();
    expect(state.currentStep).toBe('workspace');
    expect(state.stepStatus).toEqual({});
    expect(state.stepSavedAt).toEqual({});
    expect(state.workspaceId).toBeNull();
  });
});
