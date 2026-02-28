import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Surface & step types ────────────────────────────────────────────────────

export type Surface = 'home' | 'scope' | 'monitor' | 'settings';

export type ScopeStep = 'scope' | 'candidacy' | 'config';
export type ScopeStepStatus = 'pending' | 'active' | 'done';

export type MigrationStatus = 'idle' | 'running' | 'complete';

// ── Constants ───────────────────────────────────────────────────────────────

export const SCOPE_STEPS: ScopeStep[] = ['scope', 'candidacy', 'config'];

export const SCOPE_STEP_LABELS: Record<ScopeStep, string> = {
  scope: 'Scope',
  candidacy: 'Candidacy Review',
  config: 'Table Config',
};

export const SCOPE_STEP_ROUTES: Record<ScopeStep, string> = {
  scope: '/scope',
  candidacy: '/scope/candidacy',
  config: '/scope/config',
};

export const SURFACE_ROUTES: Record<Surface, string> = {
  home: '/home',
  scope: '/scope',
  monitor: '/monitor',
  settings: '/settings',
};

// ── Store shape ─────────────────────────────────────────────────────────────

interface WorkflowState {
  /** Last visited surface — used for root-redirect on app restart. */
  currentSurface: Surface;
  /** Last visited scope step — used for scope sub-nav active state. */
  currentScopeStep: ScopeStep;
  scopeStepStatus: Partial<Record<ScopeStep, ScopeStepStatus>>;
  scopeStepSavedAt: Partial<Record<ScopeStep, string>>;
  workspaceId: string | null;
  selectedTableIds: string[];
  migrationStatus: MigrationStatus;

  // Actions
  setCurrentSurface: (surface: Surface) => void;
  setCurrentScopeStep: (step: ScopeStep) => void;
  saveScopeStep: (step: ScopeStep) => void;
  setWorkspaceId: (id: string) => void;
  clearWorkspaceId: () => void;
  setSelectedTableIds: (ids: string[]) => void;
  setMigrationStatus: (status: MigrationStatus) => void;
  reset: () => void;
}

// ── Store ───────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  currentSurface: 'home' as Surface,
  currentScopeStep: 'scope' as ScopeStep,
  scopeStepStatus: {} as Partial<Record<ScopeStep, ScopeStepStatus>>,
  scopeStepSavedAt: {} as Partial<Record<ScopeStep, string>>,
  workspaceId: null,
  selectedTableIds: [] as string[],
  migrationStatus: 'idle' as MigrationStatus,
};

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setCurrentSurface: (surface) => set({ currentSurface: surface }),

      setCurrentScopeStep: (step) => set({ currentScopeStep: step }),

      saveScopeStep: (step) => set((s) => ({
        scopeStepStatus: { ...s.scopeStepStatus, [step]: 'done' as ScopeStepStatus },
        scopeStepSavedAt: { ...s.scopeStepSavedAt, [step]: new Date().toISOString() },
      })),

      setWorkspaceId: (id) => set({ workspaceId: id }),

      clearWorkspaceId: () => set({ workspaceId: null }),

      setSelectedTableIds: (ids) => set({ selectedTableIds: ids }),

      setMigrationStatus: (status) => set({ migrationStatus: status }),

      reset: () => set({ ...INITIAL_STATE }),
    }),
    { name: 'migration-workflow' },
  ),
);
