import { useNavigate } from 'react-router';
import { Check, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useWorkflowStore,
  WIZARD_STEPS,
  STEP_LABELS,
  STEP_ROUTES,
  type WizardStep,
} from '@/stores/workflow-store';

export default function StepperNav() {
  const navigate = useNavigate();
  const { currentStep, completedSteps } = useWorkflowStore();

  function handleStepClick(step: WizardStep) {
    if (completedSteps.includes(step)) {
      navigate(STEP_ROUTES[step]);
    }
  }

  return (
    <nav className="w-56 min-h-screen bg-card border-r border-border flex flex-col p-4 gap-1">
      <span className="text-base font-semibold tracking-tight text-foreground mb-6">
        Migration Utility
      </span>
      {WIZARD_STEPS.map((step) => {
        const isActive = step === currentStep;
        const isCompleted = completedSteps.includes(step);

        return (
          <Button
            key={step}
            data-testid={`step-${step}`}
            onClick={() => handleStepClick(step)}
            variant="ghost"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left justify-start transition-colors duration-150"
            style={isActive ? { backgroundColor: 'var(--muted)' } : undefined}
          >
            {isCompleted ? (
              <Check
                size={16}
                style={{ color: 'var(--color-seafoam)' }}
                aria-hidden="true"
              />
            ) : (
              <CircleDot
                size={16}
                className="text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <span
              style={isActive ? { color: 'var(--color-pacific)' } : undefined}
              className={isActive ? undefined : isCompleted ? 'text-foreground' : 'text-muted-foreground'}
            >
              {STEP_LABELS[step]}
            </span>
          </Button>
        );
      })}
    </nav>
  );
}
