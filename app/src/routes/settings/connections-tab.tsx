import { useState } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { logger, LOG_LEVELS, getStoredLogLevel, storeLogLevel, type LogLevel } from '@/lib/logger';

// ── Level button colours ──────────────────────────────────────────────────────

const LEVEL_STYLE: Record<LogLevel, { active: React.CSSProperties; label: string }> = {
  debug: {
    active: { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' },
    label: 'Debug',
  },
  info: {
    active: {
      backgroundColor: 'color-mix(in oklch, var(--color-pacific), transparent 85%)',
      color: 'var(--color-pacific)',
      borderColor: 'color-mix(in oklch, var(--color-pacific), transparent 60%)',
    },
    label: 'Info',
  },
  warn: {
    active: { backgroundColor: 'rgb(255 251 235)', color: 'rgb(146 64 14)' },
    label: 'Warn',
  },
  error: {
    active: {
      backgroundColor: 'color-mix(in oklch, var(--destructive), transparent 88%)',
      color: 'var(--destructive)',
      borderColor: 'color-mix(in oklch, var(--destructive), transparent 60%)',
    },
    label: 'Error',
  },
};

function LogLevelCard() {
  const [level, setLevel] = useState<LogLevel>(() => getStoredLogLevel());

  function handleChange(next: LogLevel) {
    storeLogLevel(next);
    setLevel(next);
    logger.info(`logging: level changed to ${next}`);
  }

  function handleTestLogs() {
    logger.debug('logging: test debug message');
    logger.info('logging: test info message');
    logger.warn('logging: test warn message');
    logger.error('logging: test error message');
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Logging</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          Minimum level emitted to the browser console. Messages below this level are suppressed.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-3">
        {/* Level picker */}
        <div className="flex gap-1.5" role="group" aria-label="Log level">
          {LOG_LEVELS.map((l) => {
            const isActive = l === level;
            return (
              <button
                key={l}
                type="button"
                data-testid={`select-log-level-${l}`}
                data-active={String(isActive)}
                onClick={() => handleChange(l)}
                className="px-3 py-1 text-xs font-medium rounded-md border transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                style={isActive ? LEVEL_STYLE[l].active : undefined}
              >
                {LEVEL_STYLE[l].label}
              </button>
            );
          })}
        </div>

        {/* Test button */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            data-testid="btn-fire-test-logs"
            onClick={handleTestLogs}
            className="text-xs"
          >
            Fire test logs
          </Button>
          <p className="text-xs text-muted-foreground">
            Opens DevTools console to see output
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Connections tab ───────────────────────────────────────────────────────────

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

      {/* Log level */}
      <LogLevelCard />
    </div>
  );
}
