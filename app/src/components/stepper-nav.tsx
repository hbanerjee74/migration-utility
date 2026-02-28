import { useLocation, useNavigate } from 'react-router';
import { Settings2, Layers, ClipboardList, SlidersHorizontal, Rocket, Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useWorkflowStore,
  WIZARD_STEPS,
  STEP_LABELS,
  STEP_ROUTES,
  type WizardStep,
  type StepStatus,
} from '@/stores/workflow-store';

const STEP_ICONS: Record<WizardStep, LucideIcon> = {
  workspace: Settings2,
  scope: Layers,
  candidacy: ClipboardList,
  config: SlidersHorizontal,
  launch: Rocket,
};

function StatusDot({ status }: { status: StepStatus }) {
  if (status === 'applied') {
    return (
      <Check
        size={12}
        style={{ color: 'var(--color-seafoam)' }}
        aria-label="Applied"
      />
    );
  }
  if (status === 'saved') {
    return (
      <span
        className="size-1.5 rounded-full bg-amber-500 shrink-0"
        aria-label="Draft saved"
      />
    );
  }
  return null;
}

export default function TabNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { stepStatus, setCurrentStep } = useWorkflowStore();

  function handleTabClick(step: WizardStep) {
    setCurrentStep(step);
    navigate(STEP_ROUTES[step]);
  }

  return (
    <nav className="w-52 h-full bg-sidebar-background border-r border-sidebar-border flex flex-col shrink-0">
      {/* App header */}
      <div className="px-4 py-4 border-b border-sidebar-border shrink-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Migration Utility
        </span>
      </div>

      {/* Tab items */}
      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
        {WIZARD_STEPS.map((step) => {
          const isActive = pathname === STEP_ROUTES[step];
          const status = stepStatus[step] ?? 'pending';
          const Icon = STEP_ICONS[step];

          return (
            <button
              key={step}
              type="button"
              data-testid={`tab-${step}`}
              onClick={() => handleTabClick(step)}
              className={cn(
                'relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors duration-150',
                'outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
              )}
            >
              {/* Left accent bar on active tab */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-pacific)' }}
                  aria-hidden="true"
                />
              )}

              <Icon
                size={15}
                className={isActive ? undefined : 'text-sidebar-foreground/60'}
                style={isActive ? { color: 'var(--color-pacific)' } : undefined}
                aria-hidden="true"
              />

              <span className="flex-1 truncate">{STEP_LABELS[step]}</span>

              {/* Right-pinned status indicator */}
              <StatusDot status={status} />
            </button>
          );
        })}
      </div>

      {/* Footer — future home for settings / version */}
      <div className="px-4 py-3 border-t border-sidebar-border shrink-0" />
    </nav>
  );
}
