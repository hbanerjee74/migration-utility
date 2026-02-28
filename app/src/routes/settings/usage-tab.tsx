import { useEffect, useState } from 'react';
import { usageGetRunDetail, usageGetSummary, usageListRuns } from '@/lib/tauri';
import type { UsageRun, UsageRunDetail, UsageSummary } from '@/lib/types';
import SettingsPanelShell from '@/components/settings/settings-panel-shell';
import { Button } from '@/components/ui/button';

export default function UsageTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [runs, setRuns] = useState<UsageRun[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetailsById, setRunDetailsById] = useState<Record<string, UsageRunDetail>>({});
  const [loadingRunDetailId, setLoadingRunDetailId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([usageGetSummary(), usageListRuns(50)]);
      setSummary(s);
      setRuns(r);
      setRunDetailsById({});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function toggleRun(runId: string) {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }
    setExpandedRunId(runId);
    if (runDetailsById[runId]) return;

    setLoadingRunDetailId(runId);
    try {
      const detail = await usageGetRunDetail(runId);
      setRunDetailsById((prev) => ({ ...prev, [runId]: detail }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingRunDetailId((current) => (current === runId ? null : current));
    }
  }

  return (
    <SettingsPanelShell panelTestId="settings-panel-usage">
      <div data-testid="settings-usage-tab" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Usage and cost from SDK run results.</p>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total runs</p>
            <p className="text-base font-semibold">{summary?.totalRuns ?? 0}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-base font-semibold">{summary?.completedRuns ?? 0}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-base font-semibold">{summary?.failedRuns ?? 0}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total cost</p>
            <p className="text-base font-semibold">${(summary?.totalCostUsd ?? 0).toFixed(4)}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Input tokens</p>
            <p className="text-base font-semibold">{summary?.totalInputTokens ?? 0}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Output tokens</p>
            <p className="text-base font-semibold">{summary?.totalOutputTokens ?? 0}</p>
          </div>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <div className="px-3 py-2 border-b border-border text-sm font-medium">Recent runs</div>
          {runs.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No run logs found yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {runs.map((run) => (
                <div key={run.runId}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40"
                    onClick={() => void toggleRun(run.runId)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{run.runId}</span>
                      <span className="text-muted-foreground">{run.model}</span>
                      <span className="ml-auto">${run.totalCostUsd.toFixed(4)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {run.status} · {run.inputTokens}/{run.outputTokens} tokens
                    </div>
                  </button>

                  {expandedRunId === run.runId && runDetailsById[run.runId] ? (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Tools: {runDetailsById[run.runId].run.toolsUsed.join(', ') || 'none'} · Skills:{' '}
                        {runDetailsById[run.runId].run.skillsLoaded.join(', ') || 'none'}
                      </p>
                      <div className="max-h-52 overflow-auto rounded border border-border bg-muted/30 p-2 space-y-1">
                        {runDetailsById[run.runId].events.map((ev, idx) => (
                          <div key={`${runDetailsById[run.runId].run.runId}-${idx}`} className="text-xs">
                            <span className="font-semibold">{ev.label}:</span>{' '}
                            <span className="text-muted-foreground">{ev.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : expandedRunId === run.runId && loadingRunDetailId === run.runId ? (
                    <p className="px-3 pb-3 text-xs text-muted-foreground">Loading run detail...</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SettingsPanelShell>
  );
}
