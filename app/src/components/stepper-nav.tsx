import { useNavigate } from 'react-router';
import { Check, Clock, CircleDot, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useWorkflowStore,
  WIZARD_STEPS,
  STEP_LABELS,
  STEP_ROUTES,
  type WizardStep,
} from '@/stores/workflow-store';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function StepperNav() {
  const navigate = useNavigate();
  const { currentStep, stepStatus, stepSavedAt, advanceTo } = useWorkflowStore();

  function handleStepClick(step: WizardStep) {
    advanceTo(step);
    navigate(STEP_ROUTES[step]);
  }

  return (
    <nav className="w-56 min-h-screen bg-card border-r border-border flex flex-col p-4 gap-1">
      <span className="text-base font-semibold tracking-tight text-foreground mb-6">
        Migration Utility
      </span>
      {WIZARD_STEPS.map((step) => {
        const isActive = step === currentStep;
        const status = stepStatus[step] ?? 'pending';
        const savedAt = stepSavedAt[step];

        return (
          <Button
            key={step}
            data-testid={`step-${step}`}
            onClick={() => handleStepClick(step)}
            variant="ghost"
            className="w-full flex flex-col items-start gap-0 px-3 py-2 rounded-md text-sm text-left justify-start transition-colors duration-150 h-auto"
            style={isActive ? { backgroundColor: 'var(--muted)' } : undefined}
          >
            <span className="flex items-center gap-3 w-full">
              {status === 'applied' ? (
                <Check size={16} style={{ color: 'var(--color-seafoam)', flexShrink: 0 }} aria-hidden="true" />
              ) : status === 'saved' ? (
                <Clock size={16} className="text-muted-foreground" style={{ flexShrink: 0 }} aria-hidden="true" />
              ) : isActive ? (
                <CircleDot size={16} style={{ color: 'var(--color-pacific)', flexShrink: 0 }} aria-hidden="true" />
              ) : (
                <Circle size={16} className="text-muted-foreground/40" style={{ flexShrink: 0 }} aria-hidden="true" />
              )}
              <span
                style={isActive ? { color: 'var(--color-pacific)' } : undefined}
                className={
                  isActive
                    ? undefined
                    : status !== 'pending'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }
              >
                {STEP_LABELS[step]}
              </span>
            </span>
            {savedAt && (
              <span className="text-[10px] text-muted-foreground/60 pl-7 leading-none pb-0.5">
                {status === 'applied' ? 'Applied' : 'Saved'} {formatRelativeTime(savedAt)}
              </span>
            )}
          </Button>
        );
      })}
    </nav>
  );
}
