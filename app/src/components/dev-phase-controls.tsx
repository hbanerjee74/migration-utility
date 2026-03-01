import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { appHydratePhase, appSetPhase, appSetPhaseFlags } from '@/lib/tauri';
import type { AppPhase } from '@/lib/types';
import { logger } from '@/lib/logger';
import { useWorkflowStore } from '@/stores/workflow-store';

const PHASES: AppPhase[] = [
  'setup_required',
  'scope_editable',
  'plan_editable',
  'ready_to_run',
  'running_locked',
];

export default function DevPhaseControls() {
  const [isBusy, setIsBusy] = useState(false);
  const appPhase = useWorkflowStore((s) => s.appPhase);
  const phaseFacts = useWorkflowStore((s) => s.phaseFacts);
  const setAppPhaseState = useWorkflowStore((s) => s.setAppPhaseState);

  if (!import.meta.env.DEV) {
    return null;
  }

  async function setPhase(next: AppPhase) {
    setIsBusy(true);
    try {
      const state = await appSetPhase(next);
      setAppPhaseState(state);
      logger.info(`dev phase override: set ${next}`);
    } catch (err) {
      logger.error('dev phase override failed', err);
    } finally {
      setIsBusy(false);
    }
  }

  async function updateFlags(next: { scopeFinalized?: boolean; planFinalized?: boolean }) {
    setIsBusy(true);
    try {
      const state = await appSetPhaseFlags(next);
      setAppPhaseState(state);
      logger.info('dev phase flags updated');
    } catch (err) {
      logger.error('dev phase flags update failed', err);
    } finally {
      setIsBusy(false);
    }
  }

  async function rehydrate() {
    setIsBusy(true);
    try {
      const state = await appHydratePhase();
      setAppPhaseState(state);
    } catch (err) {
      logger.error('dev phase hydrate failed', err);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <aside
      className="fixed right-4 bottom-4 z-50 max-w-xs rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm"
      data-testid="dev-phase-controls"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Dev Phase Controls
      </p>
      <p className="mt-1 text-xs text-muted-foreground break-all">
        current: <span className="font-mono">{appPhase}</span>
      </p>
      <div className="mt-2 grid grid-cols-1 gap-1.5">
        {PHASES.map((phase) => (
          <Button
            key={phase}
            type="button"
            variant={phase === appPhase ? 'default' : 'outline'}
            size="sm"
            disabled={isBusy}
            onClick={() => void setPhase(phase)}
            className="justify-start font-mono text-xs"
            data-testid={`dev-phase-${phase}`}
          >
            {phase}
          </Button>
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => void updateFlags({ scopeFinalized: !phaseFacts.scopeFinalized })}
          className="justify-start text-xs"
        >
          scope_finalized: {String(phaseFacts.scopeFinalized)}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => void updateFlags({ planFinalized: !phaseFacts.planFinalized })}
          className="justify-start text-xs"
        >
          plan_finalized: {String(phaseFacts.planFinalized)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={() => void rehydrate()}
          className="justify-start text-xs"
        >
          reconcile from DB
        </Button>
      </div>
    </aside>
  );
}
