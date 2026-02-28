import { useEffect, useState } from 'react';
import { Github, LogOut } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    <div className="p-5 max-w-lg flex flex-col gap-4">
      {/* GitHub */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">GitHub</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Used to clone and push to your migration repo.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoggedIn && user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarImage src={user.avatar_url} alt={user.login} />
                  <AvatarFallback>{user.login[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">@{user.login}</span>
                  {user.email && (
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
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
            Used by the headless pipeline agents during migration execution.
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

      <GitHubLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
}
