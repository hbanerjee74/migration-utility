import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useWorkflowStore } from '../stores/workflow-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StepActions from '@/components/step-actions';
import { useAutosave } from '@/hooks/use-autosave';

interface Workspace {
  id: string;
  displayName: string;
  migrationRepoPath: string;
  fabricUrl?: string;
  createdAt: string;
}

export default function WorkspaceSetup() {
  const { setWorkspaceId, saveStep, applyStep } = useWorkflowStore();
  const stepSavedAt = useWorkflowStore((s) => s.stepSavedAt.workspace);

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
    }).catch((e) => console.error('workspace_get failed', e));
  }, []);

  // Autosave: records that the user has touched this section; actual SQLite
  // write only happens on Apply (no workspace_update command exists yet).
  const { status: autosaveStatus, flush: flushAutosave } = useAutosave(
    { name, repoPath, fabricUrl },
    async (data) => {
      if (!data.name.trim() || !data.repoPath.trim()) return;
      saveStep('workspace');
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
    flushAutosave(); // cancel any pending autosave timer
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
      applyStep('workspace');
      console.info('workspace: applied');
    } catch (err) {
      console.error('workspace apply failed', err);
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
        applyStep('workspace');
      }
    } catch (err) {
      console.error('seed_mock_data failed', err);
      setSeedError(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-base font-semibold tracking-tight">Workspace Setup</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Configure your migration workspace to get started.
      </p>

      <div className="flex flex-col gap-4">
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
            />
            <Button
              type="button"
              data-testid="btn-pick-directory"
              variant="outline"
              onClick={pickDirectory}
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
          />
        </div>

        {applyError && (
          <p className="text-xs text-destructive" role="alert">{applyError}</p>
        )}

        <StepActions
          onApply={handleApply}
          isApplying={applying}
          autosaveStatus={autosaveStatus}
          autosaveSavedAt={stepSavedAt}
        />
      </div>

      {import.meta.env.DEV && (
        <div className="mt-8 pt-6 border-t border-dashed">
          <Button
            data-testid="btn-load-mock-data"
            onClick={handleSeedMockData}
            disabled={seeding}
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
  );
}
