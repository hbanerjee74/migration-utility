import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useNavigate } from 'react-router';
import { useWorkflowStore } from '../stores/workflow-store';

interface Workspace {
  id: string;
  displayName: string;
  migrationRepoPath: string;
  fabricUrl?: string;
  createdAt: string;
}

export default function WorkspaceSetup() {
  const navigate = useNavigate();
  const { setWorkspaceId, advanceTo, markComplete } = useWorkflowStore();

  const [name, setName] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [fabricUrl, setFabricUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; repoPath?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // On load: if workspace already exists, resume at last step
  useEffect(() => {
    invoke<Workspace | null>('workspace_get').then((ws) => {
      if (ws) {
        setWorkspaceId(ws.id);
        advanceTo('scope');
        navigate('/scope');
      }
    }).catch((e) => console.error('workspace_get failed', e));
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ws = await invoke<Workspace>('workspace_create', {
        args: {
          name: name.trim(),
          migrationRepoPath: repoPath.trim(),
          fabricUrl: fabricUrl.trim() || null,
        },
      });
      setWorkspaceId(ws.id);
      markComplete('workspace');
      advanceTo('scope');
      navigate('/scope');
    } catch (err) {
      console.error('workspace_create failed', err);
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSeedMockData() {
    setSeeding(true);
    try {
      await invoke('seed_mock_data');
      const ws = await invoke<Workspace | null>('workspace_get');
      if (ws) {
        setWorkspaceId(ws.id);
        advanceTo('scope');
        navigate('/scope');
      }
    } catch (err) {
      console.error('seed_mock_data failed', err);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-base font-semibold tracking-tight">Workspace Setup</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Configure your migration workspace to get started.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="workspace-name">
            Workspace name <span className="text-destructive">*</span>
          </label>
          <input
            id="workspace-name"
            data-testid="input-workspace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="e.g. Acme Migration Q1"
          />
          {errors.name && (
            <p className="text-xs text-destructive" role="alert">{errors.name}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="repo-path">
            Migration repo path <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="repo-path"
              data-testid="input-repo-path"
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="/path/to/migration-repo"
            />
            <button
              type="button"
              data-testid="btn-pick-directory"
              onClick={pickDirectory}
              className="border rounded-md px-3 py-2 text-sm"
            >
              Browse
            </button>
          </div>
          {errors.repoPath && (
            <p className="text-xs text-destructive" role="alert">{errors.repoPath}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="fabric-url">
            Fabric workspace URL <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <input
            id="fabric-url"
            data-testid="input-fabric-url"
            type="text"
            value={fabricUrl}
            onChange={(e) => setFabricUrl(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="https://app.fabric.microsoft.com/..."
          />
        </div>

        {submitError && (
          <p className="text-xs text-destructive" role="alert">{submitError}</p>
        )}

        <button
          type="submit"
          data-testid="btn-submit"
          disabled={submitting}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-pacific)' }}
        >
          {submitting ? 'Saving…' : 'Continue'}
        </button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-8 pt-6 border-t border-dashed">
          <button
            data-testid="btn-load-mock-data"
            onClick={handleSeedMockData}
            disabled={seeding}
            className="text-sm text-muted-foreground underline disabled:opacity-50"
          >
            {seeding ? 'Loading…' : 'Load mock data'}
          </button>
        </div>
      )}
    </div>
  );
}
