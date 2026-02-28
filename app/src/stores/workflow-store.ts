import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WizardStep = 'workspace' | 'scope' | 'candidacy' | 'config' | 'launch';
export type StepStatus = 'pending' | 'saved' | 'applied';

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
  stepStatus: Partial<Record<WizardStep, StepStatus>>;
  stepSavedAt: Partial<Record<WizardStep, string>>;
  workspaceId: string | null;
  selectedTableIds: string[];
  advanceTo: (step: WizardStep) => void;
  markComplete: (step: WizardStep) => void;
  saveStep: (step: WizardStep) => void;
  applyStep: (step: WizardStep) => void;
  setWorkspaceId: (id: string) => void;
  setSelectedTableIds: (ids: string[]) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      currentStep: 'workspace',
      completedSteps: [],
      stepStatus: {},
      stepSavedAt: {},
      workspaceId: null,
      selectedTableIds: [],
      advanceTo: (step) => set({ currentStep: step }),
      markComplete: (step) => set((s) => ({
        completedSteps: s.completedSteps.includes(step) ? s.completedSteps : [...s.completedSteps, step],
        stepStatus: { ...s.stepStatus, [step]: 'applied' as StepStatus },
        stepSavedAt: { ...s.stepSavedAt, [step]: new Date().toISOString() },
      })),
      saveStep: (step) => set((s) => ({
        // Don't downgrade 'applied' back to 'saved'
        stepStatus: {
          ...s.stepStatus,
          [step]: s.stepStatus[step] === 'applied' ? 'applied' : ('saved' as StepStatus),
        },
        stepSavedAt: { ...s.stepSavedAt, [step]: new Date().toISOString() },
      })),
      applyStep: (step) => set((s) => ({
        stepStatus: { ...s.stepStatus, [step]: 'applied' as StepStatus },
        stepSavedAt: { ...s.stepSavedAt, [step]: new Date().toISOString() },
        completedSteps: s.completedSteps.includes(step) ? s.completedSteps : [...s.completedSteps, step],
      })),
      setWorkspaceId: (id) => set({ workspaceId: id }),
      setSelectedTableIds: (ids) => set({ selectedTableIds: ids }),
      reset: () => set({
        currentStep: 'workspace',
        completedSteps: [],
        stepStatus: {},
        stepSavedAt: {},
        workspaceId: null,
        selectedTableIds: [],
      }),
    }),
    { name: 'migration-workflow' },
  ),
);
