import { useEffect, useState } from 'react';
import { Play, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { monitorLaunchAgent } from '@/lib/tauri';

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
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
        Agent Phases
      </p>
      <div className="grid grid-cols-5 gap-2 rounded-lg border border-border bg-card p-3">
        {PHASES.map((phase) => (
          <div key={phase.label} className="flex flex-col gap-1 rounded-md bg-muted/50 border border-border p-2.5">
            <div className="flex items-center gap-1">
              <PhaseIcon status={phase.status} />
              <span
                className="text-xs font-semibold"
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
            <p className="text-xs text-muted-foreground">{phase.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ready state ───────────────────────────────────────────────────────────────

function ReadyState({
  onLaunch,
  launching,
}: {
  onLaunch: () => void;
  launching: boolean;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-[14px]"
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
        disabled={launching}
        className="mt-2 px-6 py-2.5 text-sm"
      >
        <Play size={14} aria-hidden="true" />
        {launching ? 'Launching…' : 'Launch Migration'}
      </Button>

      <p className="text-xs text-muted-foreground/60">Scope will be locked once launched</p>
    </div>
  );
}

// ── Running state ─────────────────────────────────────────────────────────────

function RunningState({ logText }: { logText: string }) {
  return (
    <div className="flex-1 overflow-auto">
    <div className="p-8 flex flex-col gap-6 max-w-4xl" data-testid="monitor-running-state">
      {/* Migration Run summary */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
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
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Log
        </p>
        <div
          data-testid="monitor-log-stream"
          className="rounded-lg font-mono text-xs leading-relaxed p-3.5 h-36 overflow-y-auto"
          style={{ backgroundColor: '#18181B', color: '#A1A1AA' }}
        >
          {logText || 'Waiting for log output…'}
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function MonitorSurface() {
  const { migrationStatus, setMigrationStatus } = useWorkflowStore();
  const [launching, setLaunching] = useState(false);
  const [logText, setLogText] = useState('');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const unlistenPromise = listen<{
      requestId: string;
      eventType: string;
      content?: string | null;
      done?: boolean | null;
      subtype?: string | null;
      toolName?: string | null;
      totalCostUsd?: number | null;
      inputTokens?: number | null;
      outputTokens?: number | null;
    }>('monitor-agent-stream', (event) => {
      if (!mounted) return;
      const payload = event.payload;
      if (!payload) return;
      if (activeRequestId && payload.requestId !== activeRequestId) return;
      if (!activeRequestId) setActiveRequestId(payload.requestId);

      if (payload.eventType === 'agent_response' && payload.content) {
        setLogText((prev) => `${prev}${payload.content}`);
        return;
      }

      if (payload.eventType === 'agent_event' && payload.subtype === 'tool_progress' && payload.toolName) {
        setLogText((prev) => `${prev}\n[tool] ${payload.toolName}`);
        return;
      }

      if (payload.eventType === 'agent_event' && payload.subtype === 'result') {
        setLogText((prev) => `${prev}\n[result] cost=$${(payload.totalCostUsd ?? 0).toFixed(4)} tokens=${payload.inputTokens ?? 0}/${payload.outputTokens ?? 0}`);
        return;
      }

      if (payload.eventType === 'error' && payload.content) {
        setLogText((prev) => `${prev}\n[error] ${payload.content}`);
      }
    });

    return () => {
      mounted = false;
      void unlistenPromise.then((fn) => fn());
    };
  }, [activeRequestId]);

  async function handleLaunch() {
    setLaunching(true);
    setMigrationStatus('running');
    setActiveRequestId(null);
    setLogText('Launching sidecar agent...\n');
    logger.info('monitor: migration launched');
    try {
      const result = await monitorLaunchAgent({
        prompt:
          'Validate migration runtime wiring and report current readiness in concise bullet points.',
        systemPrompt: 'You are the migration utility orchestrator.',
      });
      if (result.trim()) {
        setLogText((prev) => (prev.trim() ? `${prev}\n\n${result}` : result));
      }
      logger.info('monitor: agent response received');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLogText(`Agent launch failed: ${message}`);
      setMigrationStatus('idle');
      logger.error('monitor: migration launch failed', err);
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {migrationStatus === 'idle' || migrationStatus === 'complete'
        ? <ReadyState onLaunch={() => void handleLaunch()} launching={launching} />
        : <RunningState logText={logText} />}
    </div>
  );
}
