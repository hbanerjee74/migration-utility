import { Navigate, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useWorkflowStore, SCOPE_STEPS, SCOPE_STEP_LABELS, SCOPE_STEP_ROUTES } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';

// ── Ready state ──────────────────────────────────────────────────────────────

type StepBadgeVariant = 'pending' | 'active' | 'done';

function StepBadge({ variant }: { variant: StepBadgeVariant }) {
  if (variant === 'done') {
    return (
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: 'color-mix(in oklch, var(--color-seafoam), transparent 88%)',
          color: 'var(--color-seafoam)',
        }}
      >
        Done
      </span>
    );
  }
  if (variant === 'active') {
    return (
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: 'color-mix(in oklch, var(--color-pacific), transparent 88%)',
          color: 'var(--color-pacific)',
        }}
      >
        In progress
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      Pending
    </span>
  );
}

function ReadyState() {
  const navigate = useNavigate();
  const { scopeStepStatus } = useWorkflowStore();

  // Find the first non-done step to drive the Continue CTA.
  const nextStep = SCOPE_STEPS.find((s) => scopeStepStatus[s] !== 'done') ?? 'scope';

  return (
    <div className="p-8 flex flex-col gap-6 max-w-lg" data-testid="home-ready-state">
      {/* Connections summary */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Connections
        </p>
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2.5 text-sm">
          {(['GitHub', 'Anthropic', 'Workspace'] as const).map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--color-seafoam)' }}
                aria-hidden="true"
              />
              <span className="font-medium w-24 shrink-0">{label}</span>
              <span className="text-muted-foreground text-xs">Connected</span>
            </div>
          ))}
        </div>
      </div>

      {/* Migration setup step list */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Migration Setup
        </p>
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {SCOPE_STEPS.map((step) => {
            const rawStatus = scopeStepStatus[step];
            const badgeVariant: StepBadgeVariant =
              rawStatus === 'done' ? 'done' : rawStatus === 'active' ? 'active' : 'pending';
            return (
              <div key={step} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm font-medium flex-1">{SCOPE_STEP_LABELS[step]}</span>
                <StepBadge variant={badgeVariant} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue CTA */}
      <div className="flex justify-end">
        <Button
          data-testid="btn-continue"
          onClick={() => navigate(SCOPE_STEP_ROUTES[nextStep])}
        >
          Continue: {SCOPE_STEP_LABELS[nextStep]}
          <ArrowRight size={13} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// ── Active state ─────────────────────────────────────────────────────────────

function ActiveState() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkflowStore();

  return (
    <div className="p-8 flex flex-col gap-6 max-w-2xl" data-testid="home-active-state">
      {/* Active Migration card */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Active Migration
        </p>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">{workspaceId ?? 'Migration'}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-pacific)' }}>
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                style={{ backgroundColor: 'var(--color-pacific)' }}
                aria-hidden="true"
              />
              Pipeline running
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: '60%', backgroundColor: 'var(--color-pacific)' }}
            />
          </div>
        </div>
      </div>

      {/* Two-column: Setup summary + Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        {/* Setup summary */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
            Setup
          </p>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {SCOPE_STEPS.map((step) => (
              <div key={step} className="flex items-center gap-2 px-3 py-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--color-seafoam)' }}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium">{SCOPE_STEP_LABELS[step]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
            Quick Actions
          </p>
          <div className="rounded-lg border border-border bg-card p-2 flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              data-testid="btn-open-monitor"
              onClick={() => navigate('/monitor')}
            >
              Open Monitor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              data-testid="btn-review-scope"
              onClick={() => navigate('/scope')}
            >
              Review Scope
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-destructive hover:text-destructive mt-1"
              data-testid="btn-cancel-migration"
            >
              Cancel migration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function HomeSurface() {
  const { workspaceId, migrationStatus } = useWorkflowStore();

  if (!workspaceId) return <Navigate to="/settings/workspace" replace />;

  const appState =
    migrationStatus === 'running' || migrationStatus === 'complete' ? 'active' : 'ready';

  return (
    <div className="h-full overflow-auto">
      {appState === 'ready' && <ReadyState />}
      {appState === 'active' && <ActiveState />}
    </div>
  );
}
