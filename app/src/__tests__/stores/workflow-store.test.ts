import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '@/stores/workflow-store';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.setState((s) => ({
      ...s,
      currentSurface: 'home',
      currentScopeStep: 'scope',
      scopeStepStatus: {},
      scopeStepSavedAt: {},
      workspaceId: null,
      selectedTableIds: [],
      migrationStatus: 'idle',
    }));
  });

  it('has correct initial state', () => {
    const { currentSurface, scopeStepStatus, workspaceId, migrationStatus } =
      useWorkflowStore.getState();
    expect(currentSurface).toBe('home');
    expect(scopeStepStatus).toEqual({});
    expect(workspaceId).toBeNull();
    expect(migrationStatus).toBe('idle');
  });

  it('setCurrentSurface updates currentSurface', () => {
    useWorkflowStore.getState().setCurrentSurface('scope');
    expect(useWorkflowStore.getState().currentSurface).toBe('scope');
  });

  it('setCurrentScopeStep updates currentScopeStep', () => {
    useWorkflowStore.getState().setCurrentScopeStep('candidacy');
    expect(useWorkflowStore.getState().currentScopeStep).toBe('candidacy');
  });

  it('saveScopeStep sets status to done and records timestamp', () => {
    useWorkflowStore.getState().saveScopeStep('scope');
    const { scopeStepStatus, scopeStepSavedAt } = useWorkflowStore.getState();
    expect(scopeStepStatus.scope).toBe('done');
    expect(scopeStepSavedAt.scope).toBeTruthy();
  });

  it('saveScopeStep is idempotent', () => {
    useWorkflowStore.getState().saveScopeStep('candidacy');
    useWorkflowStore.getState().saveScopeStep('candidacy');
    expect(useWorkflowStore.getState().scopeStepStatus.candidacy).toBe('done');
  });

  it('setMigrationStatus updates migrationStatus', () => {
    useWorkflowStore.getState().setMigrationStatus('running');
    expect(useWorkflowStore.getState().migrationStatus).toBe('running');
  });

  it('setWorkspaceId updates workspaceId', () => {
    useWorkflowStore.getState().setWorkspaceId('ws-1');
    expect(useWorkflowStore.getState().workspaceId).toBe('ws-1');
  });

  it('setSelectedTableIds updates selectedTableIds', () => {
    useWorkflowStore.getState().setSelectedTableIds(['t1', 't2']);
    expect(useWorkflowStore.getState().selectedTableIds).toEqual(['t1', 't2']);
  });

  it('reset restores initial state', () => {
    useWorkflowStore.getState().setCurrentSurface('monitor');
    useWorkflowStore.getState().saveScopeStep('scope');
    useWorkflowStore.getState().setWorkspaceId('ws-1');
    useWorkflowStore.getState().setMigrationStatus('running');
    useWorkflowStore.getState().reset();
    const state = useWorkflowStore.getState();
    expect(state.currentSurface).toBe('home');
    expect(state.scopeStepStatus).toEqual({});
    expect(state.scopeStepSavedAt).toEqual({});
    expect(state.workspaceId).toBeNull();
    expect(state.migrationStatus).toBe('idle');
  });
});
