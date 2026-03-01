import { useLocation, useNavigate } from 'react-router';
import { Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useWorkflowStore,
  SCOPE_STEPS,
  SCOPE_STEP_LABELS,
  SCOPE_STEP_ROUTES,
  type ScopeStep,
  type ScopeStepStatus,
} from '@/stores/workflow-store';

function StepIcon({ status, isActive }: { status: ScopeStepStatus | undefined; isActive: boolean }) {
  if (status === 'done') {
    return (
      <CheckCircle2
        size={18}
        style={{ color: 'var(--color-seafoam)' }}
        aria-hidden="true"
      />
    );
  }
  if (isActive) {
    return (
      <span
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--color-pacific)' }}
        aria-hidden="true"
      />
    );
  }
  return (
    <Circle size={18} className="text-muted-foreground/50 shrink-0" aria-hidden="true" />
  );
}

export default function ScopeStepNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { scopeStepStatus, appPhase, setCurrentScopeStep } = useWorkflowStore();

  const isLocked = appPhase === 'running_locked';

  function handleStepClick(step: ScopeStep) {
    if (isLocked) return;
    setCurrentScopeStep(step);
    navigate(SCOPE_STEP_ROUTES[step]);
  }

  function isActive(step: ScopeStep): boolean {
    const route = SCOPE_STEP_ROUTES[step];
    if (step === 'scope') return pathname === route || pathname === '/scope';
    return pathname === route;
  }

  return (
    <nav
      className="w-[168px] h-full flex flex-col shrink-0 border-r border-border overflow-hidden"
      aria-label="Migration steps"
    >
      {/* Read-only banner when migration is running */}
      {isLocked && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 shrink-0">
          <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-snug">
            Migration running — read-only
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
          Steps
        </p>
        {SCOPE_STEPS.map((step, idx) => {
          const active = isActive(step);
          const status = scopeStepStatus[step];

          return (
            <div key={step} className="relative">
              {/* Vertical connector line between steps */}
              {idx > 0 && (
                <span
                  className="absolute left-[calc(1rem+1px)] -top-[5px] h-[5px] w-px bg-border"
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                data-testid={`scope-step-${step}`}
                onClick={() => handleStepClick(step)}
                disabled={isLocked}
                className={cn(
                  'relative w-full flex items-start gap-2.5 px-2 py-2 rounded-md text-sm text-left transition-colors duration-150',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'font-medium'
                    : 'text-muted-foreground hover:bg-accent/60',
                  isLocked && 'opacity-45 pointer-events-none',
                )}
                style={active ? { backgroundColor: 'color-mix(in oklch, var(--color-pacific), transparent 90%)' } : undefined}
              >
                {/* Active left accent bar */}
                {active && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                    style={{ backgroundColor: 'var(--color-pacific)' }}
                    aria-hidden="true"
                  />
                )}

                <StepIcon status={status} isActive={active} />

                <div className="min-w-0">
                  <p
                    className="truncate leading-snug"
                    style={active ? { color: 'var(--color-pacific)' } : undefined}
                  >
                    {SCOPE_STEP_LABELS[step]}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
