import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger, LOG_LEVELS, getStoredLogLevel, storeLogLevel, type LogLevel } from '@/lib/logger';

// ── Log level descriptions ─────────────────────────────────────────────────

const LEVEL_DESCRIPTION: Record<LogLevel, string> = {
  debug: 'All messages including verbose internals',
  info:  'Key lifecycle events (default)',
  warn:  'Warnings and errors only',
  error: 'Errors only',
};

// ── Theme toggle ───────────────────────────────────────────────────────────

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light',  label: 'Light',  icon: Sun },
  { value: 'dark',   label: 'Dark',   icon: Moon },
] as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-md bg-muted p-1 w-fit">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            data-testid={`theme-${value}`}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Log level card ─────────────────────────────────────────────────────────

function LogLevelCard() {
  const [level, setLevel] = useState<LogLevel>(() => getStoredLogLevel());

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LogLevel;
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
        <div className="flex items-center gap-3">
          <select
            data-testid="select-log-level"
            value={level}
            onChange={handleChange}
            className="h-9 w-fit rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {LOG_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{LEVEL_DESCRIPTION[level]}</p>
        </div>

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
          <p className="text-xs text-muted-foreground">Opens DevTools console to see output</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Profile tab ────────────────────────────────────────────────────────────

export default function ProfileTab() {
  return (
    <div className="p-5 max-w-lg flex flex-col gap-4" data-testid="settings-profile-tab">
      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Appearance</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Choose your preferred colour scheme.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ThemeToggle />
        </CardContent>
      </Card>

      <LogLevelCard />
    </div>
  );
}
