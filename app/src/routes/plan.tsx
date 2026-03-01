import { useWorkflowStore } from '@/stores/workflow-store';

export default function PlanSurface() {
  const appPhase = useWorkflowStore((s) => s.appPhase);
  const isReadOnly = appPhase === 'running_locked';

  return (
    <div className="h-full flex flex-col overflow-auto px-8 py-6">
      <div className="w-full md:w-[60%] md:min-w-[520px] md:max-w-[960px] md:resize-x overflow-auto">
        <div className="rounded-lg border border-border bg-card p-4" data-testid="plan-surface">
          <p className="text-base font-semibold">Plan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan phase workspace. Final editing controls will be added in follow-up issues.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Mode: <span className="font-mono">{isReadOnly ? 'read-only' : 'editable'}</span>
          </p>
          {isReadOnly ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Migration running. Plan edits are locked.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
