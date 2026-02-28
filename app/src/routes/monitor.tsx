import { Play, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

// ── Agent phases grid ─────────────────────────────────────────────────────────

type PhaseStatus = 'complete' | 'running' | 'pending';

interface Phase {
  label: string;
  status: PhaseStatus;
  count: string;
}

const PHASES: Phase[] = [
  { label: 'Discovery',    status: 'complete', count: '—' },
  { label: 'Candidacy',    status: 'complete', count: '—' },
  { label: 'Translation',  status: 'running',  count: '—' },
  { label: 'Tests',        status: 'pending',  count: '—' },
  { label: 'Validation',   status: 'pending',  count: '—' },
];

function PhaseIcon({ status }: { status: PhaseStatus }) {
  if (status === 'complete') {
    return <CheckCircle2 size={11} style={{ color: 'var(--color-seafoam)' }} aria-hidden="true" />;
  }
  if (status === 'running') {
    return (
      <Loader2
        size={11}
        className="animate-spin"
        style={{ color: 'var(--color-pacific)' }}
        aria-hidden="true"
      />
    );
  }
  return <Clock size={11} className="text-muted-foreground/60" aria-hidden="true" />;
}

function AgentPhasesGrid() {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
        Agent Phases
      </p>
      <div className="grid grid-cols-5 gap-2 rounded-lg border border-border bg-card p-3">
        {PHASES.map((phase) => (
          <div key={phase.label} className="flex flex-col gap-1 rounded-md bg-muted/50 border border-border p-2.5">
            <div className="flex items-center gap-1">
              <PhaseIcon status={phase.status} />
              <span
                className="text-[10px] font-semibold"
                style={
                  phase.status === 'complete'
                    ? { color: 'var(--color-seafoam)' }
                    : phase.status === 'running'
                      ? { color: 'var(--color-pacific)' }
                      : undefined
                }
              >
                {phase.label}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{phase.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ready state ───────────────────────────────────────────────────────────────

function ReadyState({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4"
      data-testid="monitor-ready-state"
    >
      <div
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center border"
        style={{
          backgroundColor: 'color-mix(in oklch, var(--color-pacific), transparent 90%)',
          borderColor: 'color-mix(in oklch, var(--color-pacific), transparent 80%)',
        }}
      >
        <Play size={22} style={{ color: 'var(--color-pacific)' }} aria-hidden="true" />
      </div>

      <p className="text-base font-semibold">Ready to launch</p>
      <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-xs">
        This will push your configuration to{' '}
        <code className="font-mono text-foreground">plan.md</code>, commit to the migration repo,
        and start the headless pipeline.
      </p>

      <Button
        data-testid="btn-launch-migration"
        onClick={onLaunch}
        className="mt-2 px-6 py-2.5 text-sm"
      >
        <Play size={14} aria-hidden="true" />
        Launch Migration
      </Button>

      <p className="text-xs text-muted-foreground/60">Scope will be locked once launched</p>
    </div>
  );
}

// ── Running state ─────────────────────────────────────────────────────────────

function RunningState() {
  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl" data-testid="monitor-running-state">
      {/* Migration Run summary */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Migration Run
        </p>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-semibold">Active Migration</p>
            <div className="flex items-center gap-4">
              <span
                className="flex items-center gap-1 text-xs font-medium"
                style={{ backgroundColor: 'color-mix(in oklch, var(--color-seafoam), transparent 88%)', color: 'var(--color-seafoam)' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '60%', backgroundColor: 'var(--color-pacific)' }} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">— / —</span>
          </div>
        </div>
      </div>

      <AgentPhasesGrid />

      {/* Log stream */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Log
        </p>
        <div
          data-testid="monitor-log-stream"
          className="rounded-lg font-mono text-xs leading-relaxed p-3.5 h-36 overflow-y-auto"
          style={{ backgroundColor: '#18181B', color: '#A1A1AA' }}
        >
          Waiting for log output…
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function MonitorSurface() {
  const { migrationStatus, setMigrationStatus } = useWorkflowStore();

  function handleLaunch() {
    setMigrationStatus('running');
    logger.info('monitor: migration launched');
  }

  return (
    <div className="h-full overflow-auto flex flex-col">
      {migrationStatus === 'idle' || migrationStatus === 'complete'
        ? <div className="flex-1 flex"><ReadyState onLaunch={handleLaunch} /></div>
        : <RunningState />}
    </div>
  );
}
