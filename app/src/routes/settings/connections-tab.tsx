import { useEffect, useState } from 'react';
import { Check, Github, LogOut } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GitHubLoginDialog } from '@/components/github-login-dialog';

export default function ConnectionsTab() {
  const migrationStatus = useWorkflowStore((s) => s.migrationStatus);
  const isLocked = migrationStatus === 'running';

  const { user, isLoggedIn, loadUser, logout } = useAuthStore();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <div className="px-8 py-6 h-full overflow-auto">
      <div className="max-w-lg flex flex-col gap-4">

        {/* GitHub */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">GitHub</CardTitle>
              {isLoggedIn && user && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--color-seafoam)' }}
                >
                  <Check className="size-3" />
                  Connected
                </span>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5">
              ONE-TIME SETUP · SAFE TO UPDATE AT ANY TIME
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoggedIn && user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Github className="size-3.5 shrink-0" />
                  <span className="font-mono">github.com/{user.login}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="btn-disconnect-github"
                  disabled={isLocked}
                  onClick={logout}
                >
                  <LogOut className="size-3.5" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Not connected</p>
                <Button
                  variant="outline"
                  size="sm"
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Anthropic API key</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              ONE-TIME SETUP · SAFE TO UPDATE AT ANY TIME
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex gap-2 items-center">
            <Input
              id="anthropic-key"
              data-testid="input-anthropic-key"
              type="password"
              defaultValue=""
              placeholder="sk-ant-api03-…"
              className="font-mono text-xs flex-1"
              disabled={isLocked}
            />
            <Button
              size="sm"
              data-testid="btn-update-anthropic-key"
              disabled={isLocked}
            >
              Update
            </Button>
          </CardContent>
        </Card>

      </div>

      <GitHubLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
}
