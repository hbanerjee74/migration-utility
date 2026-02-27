import { create } from 'zustand';

export type WizardStep = 'workspace' | 'scope' | 'candidacy' | 'config' | 'launch';

export const WIZARD_STEPS: WizardStep[] = ['workspace', 'scope', 'candidacy', 'config', 'launch'];

export const STEP_LABELS: Record<WizardStep, string> = {
  workspace: 'Workspace Setup',
  scope: 'Table Scope',
  candidacy: 'Candidacy Review',
  config: 'Table Config',
  launch: 'Review & Launch',
};

export const STEP_ROUTES: Record<WizardStep, string> = {
  workspace: '/workspace',
  scope: '/scope',
  candidacy: '/candidacy',
  config: '/config',
  launch: '/launch',
};

interface WorkflowState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  workspaceId: string | null;
  selectedTableIds: string[];
  advanceTo: (step: WizardStep) => void;
  markComplete: (step: WizardStep) => void;
  setWorkspaceId: (id: string) => void;
  setSelectedTableIds: (ids: string[]) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentStep: 'workspace',
  completedSteps: [],
  workspaceId: null,
  selectedTableIds: [],
  advanceTo: (step) => set({ currentStep: step }),
  markComplete: (step) => set((s) => ({
    completedSteps: s.completedSteps.includes(step) ? s.completedSteps : [...s.completedSteps, step],
  })),
  setWorkspaceId: (id) => set({ workspaceId: id }),
  setSelectedTableIds: (ids) => set({ selectedTableIds: ids }),
  reset: () => set({ currentStep: 'workspace', completedSteps: [], workspaceId: null, selectedTableIds: [] }),
}));
