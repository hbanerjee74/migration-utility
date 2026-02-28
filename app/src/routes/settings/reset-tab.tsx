import { useNavigate } from 'react-router';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function ResetTab() {
  const navigate = useNavigate();
  const { migrationStatus, reset } = useWorkflowStore();
  const isLocked = migrationStatus === 'running';

  function handleReset() {
    reset();
    navigate('/home');
    logger.info('migration: reset');
  }

  return (
    <div className="p-8 max-w-lg">
      <div
        className="rounded-lg border p-5 flex flex-col gap-4"
        style={{ borderColor: 'color-mix(in oklch, var(--destructive), transparent 60%)' }}
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={18} className="text-destructive shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold text-destructive">Reset migration</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          This will permanently clear the current migration and cannot be undone.
        </p>

        {/* What gets cleared */}
        <div className="rounded-md bg-muted/60 px-4 py-3 text-xs text-muted-foreground flex flex-col gap-1.5">
          <p className="font-medium text-foreground">What gets cleared:</p>
          <ul className="list-disc pl-4 flex flex-col gap-1">
            <li>All scope, candidacy, and table config selections</li>
            <li>Migration status and run history</li>
            <li>Workspace configuration</li>
          </ul>
        </div>

        {/* What's kept */}
        <div
          className="rounded-md px-4 py-3 text-xs flex flex-col gap-1.5"
          style={{ backgroundColor: 'color-mix(in oklch, var(--color-seafoam), transparent 90%)' }}
        >
          <p className="font-medium flex items-center gap-1.5">
            <Check size={11} style={{ color: 'var(--color-seafoam)' }} aria-hidden="true" />
            <span>Kept:</span>
          </p>
          <p className="text-muted-foreground">GitHub connection · Anthropic API key</p>
        </div>

        {isLocked && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Cannot reset while a migration is running.
          </p>
        )}

        <Button
          variant="destructive"
          data-testid="btn-reset-migration"
          disabled={isLocked}
          onClick={handleReset}
          className="self-start"
        >
          Reset migration and start fresh
        </Button>
      </div>
    </div>
  );
}
