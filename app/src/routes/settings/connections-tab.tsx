import { useEffect, useState } from 'react';
import { CheckCircle2, Github, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GitHubLoginDialog } from '@/components/github-login-dialog';
import SettingsPanelShell from '@/components/settings/settings-panel-shell';
import { appHydratePhase, getSettings, saveAnthropicApiKey, testApiKey } from '@/lib/tauri';
import { logger } from '@/lib/logger';

export default function ConnectionsTab() {
  const appPhase = useWorkflowStore((s) => s.appPhase);
  const setAppPhaseState = useWorkflowStore((s) => s.setAppPhaseState);
  const isLocked = appPhase === 'running_locked';

  const { user, isLoggedIn, isLoading: isAuthLoading, lastCheckedAt, loadUser, logout } = useAuthStore();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    getSettings()
      .then((settings) => {
        setApiKey(settings.anthropicApiKey ?? '');
      })
      .catch((err) => {
        logger.error('get_settings failed', err);
      });
  }, []);

  async function handleSaveApiKey(nextValue: string) {
    try {
      await saveAnthropicApiKey(nextValue.trim() ? nextValue.trim() : null);
      const phase = await appHydratePhase();
      setAppPhaseState(phase);
      logger.info('settings: anthropic API key saved');
    } catch (err) {
      logger.error('save_anthropic_api_key failed', err);
      toast.error('Failed to save API key');
    }
  }

  async function handleTestApiKey() {
    const key = apiKey.trim();
    if (!key) {
      toast.error('Enter an API key first');
      return;
    }
    setTestingApiKey(true);
    setApiKeyValid(null);
    try {
      await testApiKey(key);
      setApiKeyValid(true);
      toast.success('API key is valid');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('test_api_key failed', err);
      setApiKeyValid(false);
      toast.error(message);
    } finally {
      setTestingApiKey(false);
    }
  }

  const githubStatus = isAuthLoading ? 'Checking' : isLoggedIn && user ? 'Connected' : 'Not connected';

  return (
    <SettingsPanelShell
      panelTestId="settings-panel-connections"
      groupLabel="One-time setup · Safe to update at any time"
      labelTestId="settings-connections-group-label"
    >

        {/* GitHub */}
        <Card className="gap-0 py-5" data-testid="settings-connections-github-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle>GitHub</CardTitle>
              <Badge className="text-sm" variant={isLoggedIn && !isAuthLoading ? 'secondary' : 'outline'}>
                {githubStatus}
              </Badge>
            </div>
            <CardDescription className="mt-0.5">
              Used to clone and push to your migration repo.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isAuthLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Checking GitHub connection...
              </div>
            ) : isLoggedIn && user ? (
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={user.avatar_url} alt={user.login} />
                    <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">@{user.login}</p>
                    {user.email ? (
                      <p className="text-sm text-muted-foreground leading-tight mt-0.5">{user.email}</p>
                    ) : null}
                    {lastCheckedAt ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        Last checked {new Date(lastCheckedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="outline"
                  data-testid="btn-disconnect-github"
                  disabled={isLocked}
                  onClick={logout}
                >
                  <LogOut className="size-3.5" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Not connected</p>
                <Button
                  variant="outline"
                  data-testid="btn-connect-github"
                  disabled={isLocked}
                  onClick={() => setLoginDialogOpen(true)}
                >
                  <Github className="size-3.5" />
                  Sign in with GitHub
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anthropic API key */}
        <Card className="gap-0 py-5" data-testid="settings-connections-anthropic-card">
          <CardHeader className="pb-3">
            <CardTitle>Anthropic API key</CardTitle>
            <CardDescription className="mt-0.5">
              Used by the headless pipeline agents during migration execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex gap-2 items-center">
            <Input
              id="anthropic-key"
              data-testid="input-anthropic-key"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setApiKeyValid(null);
              }}
              onBlur={() => {
                void handleSaveApiKey(apiKey);
              }}
              placeholder="sk-ant-api03-…"
              className="font-mono text-sm flex-1"
              disabled={isLocked}
            />
            <Button
              type="button"
              variant={apiKeyValid ? 'default' : 'outline'}
              data-testid="btn-update-anthropic-key"
              onClick={() => {
                void handleTestApiKey();
              }}
              disabled={isLocked || testingApiKey || !apiKey.trim()}
              className={apiKeyValid ? 'text-white' : undefined}
              style={apiKeyValid ? { background: 'var(--color-seafoam)', color: 'white' } : undefined}
            >
              {testingApiKey ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {!testingApiKey && apiKeyValid ? <CheckCircle2 className="size-3.5" /> : null}
              {apiKeyValid ? 'Valid' : 'Test'}
            </Button>
          </CardContent>
        </Card>

      <GitHubLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </SettingsPanelShell>
  );
}
