import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check } from 'lucide-react';

export default function ConnectionsTab() {
  const migrationStatus = useWorkflowStore((s) => s.migrationStatus);
  const isLocked = migrationStatus === 'running';

  return (
    <div className="p-8 max-w-lg flex flex-col gap-4">
      {/* GitHub */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">GitHub</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Used to clone and push to your migration repo.
              </CardDescription>
            </div>
            <span
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--color-seafoam)' }}
            >
              <Check size={11} aria-hidden="true" />
              Connected
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex items-center gap-3 bg-muted/50 rounded-b-lg px-6 py-3">
          <span className="text-xs font-mono text-muted-foreground flex-1">
            github.com/your-org
          </span>
          <Button
            variant="outline"
            size="sm"
            data-testid="btn-disconnect-github"
            disabled={isLocked}
          >
            Disconnect
          </Button>
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
            defaultValue="sk-ant-api03-xxxxxxxxxxxxxxxxxx"
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
  );
}
