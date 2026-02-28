import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TabLayout from '@/components/tab-layout';
import { useAutosave } from '@/hooks/use-autosave';
import { logger } from '@/lib/logger';

interface Workspace {
  id: string;
  displayName: string;
  migrationRepoPath: string;
  fabricUrl?: string;
  createdAt: string;
}

export default function WorkspaceTab() {
  const { setWorkspaceId, migrationStatus } = useWorkflowStore();

  const isLocked = migrationStatus === 'running';

  const [name, setName] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [fabricUrl, setFabricUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; repoPath?: string }>({});
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  // On mount: populate form with any previously saved workspace.
  useEffect(() => {
    invoke<Workspace | null>('workspace_get').then((ws) => {
      if (ws) {
        setExistingId(ws.id);
        setWorkspaceId(ws.id);
        setName(ws.displayName);
        setRepoPath(ws.migrationRepoPath);
        setFabricUrl(ws.fabricUrl ?? '');
      }
    }).catch((e) => logger.error('workspace_get failed', e));
  }, []);

  // Autosave: debounced save on field changes (no workspace_update yet).
  const { status: autosaveStatus, flush: flushAutosave } = useAutosave(
    { name, repoPath, fabricUrl },
    async () => {
      // No-op until workspace_update is implemented.
    },
  );

  async function pickDirectory() {
    const selected = await openDialog({ directory: true, multiple: false });
    if (typeof selected === 'string') setRepoPath(selected);
  }

  function validate(): boolean {
    const errs: { name?: string; repoPath?: string } = {};
    if (!name.trim()) errs.name = 'Workspace name is required';
    if (!repoPath.trim()) errs.repoPath = 'Migration repo path is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleApply() {
    if (!validate()) return;
    flushAutosave();
    setApplying(true);
    setApplyError(null);
    try {
      if (!existingId) {
        const ws = await invoke<Workspace>('workspace_create', {
          args: {
            name: name.trim(),
            migrationRepoPath: repoPath.trim(),
            fabricUrl: fabricUrl.trim() || null,
          },
        });
        setExistingId(ws.id);
        setWorkspaceId(ws.id);
      }
      logger.info('workspace: applied');
    } catch (err) {
      logger.error('workspace apply failed', err);
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  async function handleSeedMockData() {
    setSeeding(true);
    setSeedError(null);
    try {
      await invoke('seed_mock_data');
      const ws = await invoke<Workspace | null>('workspace_get');
      if (ws) {
        setExistingId(ws.id);
        setWorkspaceId(ws.id);
        setName(ws.displayName);
        setRepoPath(ws.migrationRepoPath);
        setFabricUrl(ws.fabricUrl ?? '');
      }
    } catch (err) {
      logger.error('seed_mock_data failed', err);
      setSeedError(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div data-testid="settings-workspace-tab">
      {isLocked && (
        <div className="px-8 pt-4">
          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            Locked during active migration. Changes are not saved while a migration is running.
          </p>
        </div>
      )}
      <TabLayout
        title="Workspace"
        description="Configure your migration workspace settings."
        onApply={handleApply}
        isApplying={applying}
        canApply={!isLocked}
        autosaveStatus={autosaveStatus}
      >
        <div className="max-w-lg flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="workspace-name">
              Workspace name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="workspace-name"
              data-testid="input-workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Migration Q1"
              disabled={isLocked}
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="repo-path">
              Migration repo path <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="repo-path"
                data-testid="input-repo-path"
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                className="flex-1"
                placeholder="/path/to/migration-repo"
                disabled={isLocked}
              />
              <Button
                type="button"
                data-testid="btn-pick-directory"
                variant="outline"
                onClick={pickDirectory}
                disabled={isLocked}
              >
                Browse
              </Button>
            </div>
            {errors.repoPath && (
              <p className="text-xs text-destructive" role="alert">{errors.repoPath}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="fabric-url">
              Fabric workspace URL{' '}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="fabric-url"
              data-testid="input-fabric-url"
              type="text"
              value={fabricUrl}
              onChange={(e) => setFabricUrl(e.target.value)}
              placeholder="https://app.fabric.microsoft.com/..."
              disabled={isLocked}
            />
          </div>

          {applyError && (
            <p className="text-xs text-destructive" role="alert">{applyError}</p>
          )}

          {import.meta.env.DEV && (
            <div className="mt-4 pt-6 border-t border-dashed">
              <Button
                data-testid="btn-load-mock-data"
                onClick={handleSeedMockData}
                disabled={seeding || isLocked}
                variant="ghost"
                size="sm"
              >
                {seeding ? 'Loading…' : 'Load mock data'}
              </Button>
              {seedError && (
                <p className="text-xs text-destructive mt-2" role="alert">{seedError}</p>
              )}
            </div>
          )}
        </div>
      </TabLayout>
    </div>
  );
}
