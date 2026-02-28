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
  /** Last visited step — used only for the root-redirect on app restart. */
  currentStep: WizardStep;
  stepStatus: Partial<Record<WizardStep, StepStatus>>;
  stepSavedAt: Partial<Record<WizardStep, string>>;
  workspaceId: string | null;
  selectedTableIds: string[];
  setCurrentStep: (step: WizardStep) => void;
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
      stepStatus: {},
      stepSavedAt: {},
      workspaceId: null,
      selectedTableIds: [],
      setCurrentStep: (step) => set({ currentStep: step }),
      saveStep: (step) => set((s) => ({
        // Never downgrade an already-applied step.
        stepStatus: {
          ...s.stepStatus,
          [step]: s.stepStatus[step] === 'applied' ? 'applied' : ('saved' as StepStatus),
        },
        stepSavedAt: { ...s.stepSavedAt, [step]: new Date().toISOString() },
      })),
      applyStep: (step) => set((s) => ({
        stepStatus: { ...s.stepStatus, [step]: 'applied' as StepStatus },
        stepSavedAt: { ...s.stepSavedAt, [step]: new Date().toISOString() },
      })),
      setWorkspaceId: (id) => set({ workspaceId: id }),
      setSelectedTableIds: (ids) => set({ selectedTableIds: ids }),
      reset: () => set({
        currentStep: 'workspace',
        stepStatus: {},
        stepSavedAt: {},
        workspaceId: null,
        selectedTableIds: [],
      }),
    }),
    { name: 'migration-workflow' },
  ),
);
