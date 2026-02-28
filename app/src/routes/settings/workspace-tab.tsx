import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Lock } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SettingsPanelShell from '@/components/settings/settings-panel-shell';
import { githubListRepos, workspaceApplyAndClone, workspaceGet } from '@/lib/tauri';
import type { GitHubRepo } from '@/lib/types';
import { logger } from '@/lib/logger';

const DEFAULT_WORKSPACE_NAME = 'Migration Workspace';

export default function WorkspaceTab() {
  const { setWorkspaceId, migrationStatus } = useWorkflowStore();
  const isLocked = migrationStatus === 'running';

  const [workspaceName, setWorkspaceName] = useState(DEFAULT_WORKSPACE_NAME);
  const [repoName, setRepoName] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [fabricUrl, setFabricUrl] = useState('');
  const [fabricServicePrincipalId, setFabricServicePrincipalId] = useState('');
  const [fabricServicePrincipalSecret, setFabricServicePrincipalSecret] = useState('');
  const [errors, setErrors] = useState<{ repoName?: string; repoPath?: string }>({});
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const [repoSuggestions, setRepoSuggestions] = useState<GitHubRepo[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);
  const suggestReqIdRef = useRef(0);
  const repoSuggestionsListboxId = useId();

  useEffect(() => {
    workspaceGet()
      .then((ws) => {
        if (ws) {
          setWorkspaceId(ws.id);
          setWorkspaceName(ws.displayName || DEFAULT_WORKSPACE_NAME);
          setRepoName(ws.migrationRepoName ?? '');
          setRepoPath(ws.migrationRepoPath ?? '');
          setFabricUrl(ws.fabricUrl ?? '');
          setFabricServicePrincipalId(ws.fabricServicePrincipalId ?? '');
          setFabricServicePrincipalSecret(ws.fabricServicePrincipalSecret ?? '');
        }
      })
      .catch((e) => logger.error('workspace_get failed', e));
  }, [setWorkspaceId]);

  useEffect(() => {
    const query = repoName.trim();
    if (query.length < 2) {
      setRepoSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const requestId = ++suggestReqIdRef.current;
    setSuggestionsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const repos = await githubListRepos(query, 10);
        if (requestId === suggestReqIdRef.current) {
          setRepoSuggestions(repos);
          setSelectedSuggestionIdx(-1);
        }
      } catch {
        if (requestId === suggestReqIdRef.current) {
          setRepoSuggestions([]);
        }
      } finally {
        if (requestId === suggestReqIdRef.current) {
          setSuggestionsLoading(false);
        }
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [repoName]);

  const showSuggestions = useMemo(
    () => suggestionsOpen && !isLocked && (suggestionsLoading || repoSuggestions.length > 0),
    [suggestionsOpen, isLocked, suggestionsLoading, repoSuggestions.length],
  );
  const activeSuggestionId =
    selectedSuggestionIdx >= 0 ? `${repoSuggestionsListboxId}-option-${selectedSuggestionIdx}` : undefined;

  function validate(): boolean {
    const errs: { repoName?: string; repoPath?: string } = {};
    if (!repoName.trim()) errs.repoName = 'Repo name is required';
    else if (!repoName.includes('/')) errs.repoName = 'Repo name must be owner/repo';
    if (!repoPath.trim()) errs.repoPath = 'Repo path is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function pickDirectory() {
    const selected = await openDialog({ directory: true, multiple: false });
    if (typeof selected === 'string') setRepoPath(selected);
  }

  function applySuggestion(repo: GitHubRepo) {
    setRepoName(repo.fullName);
    setSuggestionsOpen(false);
    setRepoSuggestions([]);
    setSelectedSuggestionIdx(-1);
  }

  async function handleApply() {
    if (!validate()) return;

    setApplying(true);
    setApplyError(null);
    try {
      const ws = await workspaceApplyAndClone({
        name: workspaceName.trim() || DEFAULT_WORKSPACE_NAME,
        migrationRepoName: repoName.trim(),
        migrationRepoPath: repoPath.trim(),
        fabricUrl: fabricUrl.trim() || null,
        fabricServicePrincipalId: fabricServicePrincipalId.trim() || null,
        fabricServicePrincipalSecret: fabricServicePrincipalSecret.trim() || null,
      });
      setWorkspaceId(ws.id);
      setWorkspaceName(ws.displayName);
      logger.info('workspace: applied and repo cloned');
    } catch (err) {
      logger.error('workspace apply failed', err);
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  return (
    <SettingsPanelShell
      panelTestId="settings-panel-workspace"
      labelTestId="settings-workspace-group-label"
      groupLabel={
        <span className="inline-flex items-center gap-1.5">
          {isLocked ? <Lock className="size-3" /> : null}
          {isLocked ? 'Locked during active migration · Reset to change' : 'Set once per migration'}
        </span>
      }
    >
      <div data-testid="settings-workspace-tab" className="flex flex-col gap-3">
        {isLocked ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            Locked during active migration. Changes are not saved while a migration is running.
          </p>
        ) : null}

        <Card className="gap-0 py-5" data-testid="settings-workspace-fabric-card">
          <CardHeader className="pb-3">
            <CardTitle>Fabric workspace</CardTitle>
            <CardDescription className="mt-0.5">
              The source Fabric workspace containing the stored procedures to migrate.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="fabric-url">Workspace URL</Label>
              <Input
                id="fabric-url"
                data-testid="input-fabric-url"
                type="text"
                value={fabricUrl}
                onChange={(e) => setFabricUrl(e.target.value)}
                placeholder="https://app.fabric.microsoft.com/groups/..."
                className="font-mono text-sm"
                disabled={isLocked}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="fabric-sp-id" className="text-sm text-muted-foreground">
                  Service principal ID
                </Label>
                <Input
                  id="fabric-sp-id"
                  data-testid="input-fabric-service-principal-id"
                  type="text"
                  value={fabricServicePrincipalId}
                  onChange={(e) => setFabricServicePrincipalId(e.target.value)}
                  placeholder="sp-vibedata-migration"
                  className="font-mono text-sm"
                  disabled={isLocked}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="fabric-secret" className="text-sm text-muted-foreground">
                  Secret
                </Label>
                <Input
                  id="fabric-secret"
                  data-testid="input-fabric-secret"
                  type="password"
                  value={fabricServicePrincipalSecret}
                  onChange={(e) => setFabricServicePrincipalSecret(e.target.value)}
                  placeholder="••••••••••••"
                  className="font-mono text-sm"
                  disabled={isLocked}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-5" data-testid="settings-workspace-repo-card">
          <CardHeader className="pb-3">
            <CardTitle>Migration repo</CardTitle>
            <CardDescription className="mt-0.5">
              The GitHub repo where migration state and agent outputs are committed.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-3">
            <div className="flex flex-col gap-1 relative">
              <Label htmlFor="repo-name">
                Repo name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="repo-name"
                data-testid="input-repo-name"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                onFocus={() => setSuggestionsOpen(true)}
                onBlur={() => {
                  setTimeout(() => setSuggestionsOpen(false), 120);
                }}
                onKeyDown={(e) => {
                  if (!showSuggestions || repoSuggestions.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSuggestionIdx((idx) => Math.min(idx + 1, repoSuggestions.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSuggestionIdx((idx) => (idx <= 0 ? repoSuggestions.length - 1 : idx - 1));
                  } else if (e.key === 'Enter' && selectedSuggestionIdx >= 0) {
                    e.preventDefault();
                    applySuggestion(repoSuggestions[selectedSuggestionIdx]);
                  } else if (e.key === 'Escape') {
                    setSuggestionsOpen(false);
                    setSelectedSuggestionIdx(-1);
                  }
                }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls={showSuggestions ? repoSuggestionsListboxId : undefined}
                aria-activedescendant={showSuggestions ? activeSuggestionId : undefined}
                placeholder="owner/repo"
                className="font-mono text-sm"
                disabled={isLocked}
              />

              {showSuggestions ? (
                <ul
                  role="listbox"
                  id={repoSuggestionsListboxId}
                  aria-label="Repository suggestions"
                  className="absolute top-[66px] left-0 right-0 z-20 max-h-44 overflow-auto rounded-md border border-border bg-background shadow-sm"
                  data-testid="repo-suggestions"
                >
                  {suggestionsLoading ? (
                    <li role="status" aria-live="polite" className="px-3 py-2 text-sm text-muted-foreground">
                      Loading repos…
                    </li>
                  ) : (
                    repoSuggestions.map((repo, idx) => (
                      <li key={repo.id} role="none">
                        <button
                          id={`${repoSuggestionsListboxId}-option-${idx}`}
                          role="option"
                          aria-selected={idx === selectedSuggestionIdx}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-muted ${idx === selectedSuggestionIdx ? 'bg-muted' : ''}`}
                          data-testid={`repo-suggestion-${idx}`}
                          onMouseDown={(ev) => ev.preventDefault()}
                          onMouseEnter={() => setSelectedSuggestionIdx(idx)}
                          onClick={() => applySuggestion(repo)}
                        >
                          {repo.fullName}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}

              {errors.repoName ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.repoName}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-5" data-testid="settings-workspace-working-dir-card">
          <CardHeader className="pb-3">
            <CardTitle>Working directory</CardTitle>
            <CardDescription className="mt-0.5">
              Where the migration repo is cloned on your machine.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="repo-path">
                Directory <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="repo-path"
                  data-testid="input-repo-path"
                  type="text"
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  className="flex-1"
                  placeholder="~/vibedata-migration"
                  disabled={isLocked}
                />
                <Button
                  type="button"
                  data-testid="btn-pick-repo-path"
                  variant="outline"
                  onClick={pickDirectory}
                  disabled={isLocked}
                >
                  Browse
                </Button>
              </div>
              {errors.repoPath ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.repoPath}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Default: <code>~/vibedata-migration</code>. Changeable when no migration is active.
              </p>
            </div>
          </CardContent>
        </Card>

        {applyError ? (
          <p className="text-xs text-destructive" role="alert" data-testid="workspace-apply-error">
            {applyError}
          </p>
        ) : null}

        <div className="flex items-center justify-end" data-testid="settings-workspace-actions">
          <Button
            type="button"
            data-testid="btn-apply"
            onClick={handleApply}
            disabled={isLocked || applying}
            size="sm"
          >
            {applying ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      </div>
    </SettingsPanelShell>
  );
}
