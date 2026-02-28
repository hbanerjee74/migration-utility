import { useEffect, useState } from 'react';
import { Folder, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { logger, LOG_LEVELS, getStoredLogLevel, storeLogLevel, type LogLevel } from '@/lib/logger';
import { setLogLevel, getLogFilePath, getDataDirPath } from '@/lib/tauri';

// ── Log level descriptions ──────────────────────────────────────────────────

const LEVEL_DESCRIPTION: Record<LogLevel, string> = {
  debug: 'Everything (verbose)',
  info:  'Key events (default)',
  warn:  'Warnings and errors only',
  error: 'Errors only',
};

// ── Theme toggle ────────────────────────────────────────────────────────────

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

// ── Path row ────────────────────────────────────────────────────────────────

function PathRow({ label, path, testId }: { label: string; path: string | null; testId?: string }) {
  return (
    <div className="flex items-start gap-4 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0 w-36 pt-0.5">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <Folder className="size-3.5 shrink-0 text-muted-foreground" />
        <code className="text-xs font-mono text-muted-foreground truncate" data-testid={testId}>
          {path ?? 'Loading…'}
        </code>
      </div>
    </div>
  );
}

// ── Profile tab ─────────────────────────────────────────────────────────────

export default function ProfileTab() {
  const [level, setLevel] = useState<LogLevel>(() => getStoredLogLevel());
  const [logFilePath, setLogFilePath] = useState<string | null>(null);
  const [dataDirPath, setDataDirPath] = useState<string | null>(null);

  useEffect(() => {
    getLogFilePath().then(setLogFilePath).catch(() => setLogFilePath(null));
    getDataDirPath().then(setDataDirPath).catch(() => setDataDirPath(null));
  }, []);

  function handleLevelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LogLevel;
    storeLogLevel(next);
    setLevel(next);
    setLogLevel(next).catch(() => {});
    logger.info(`logging: level changed to ${next}`);
  }

  return (
    <div className="px-8 py-6 h-full overflow-auto" data-testid="settings-profile-tab">
      <div className="max-w-lg flex flex-col gap-6">

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

        {/* Logging — flat section, no card border */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-foreground">Logging</p>
          <div className="flex items-center gap-3">
            <select
              data-testid="select-log-level"
              value={level}
              onChange={handleLevelChange}
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
        </div>

        {/* Directories — flat section */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-foreground mb-1">Directories</p>
          <PathRow
            label="Working Directory"
            path="~/.vibedata/migration-utility"
            testId="path-working-dir"
          />
          <PathRow
            label="Log File"
            path={logFilePath}
            testId="path-log-file"
          />
          <PathRow
            label="Data Directory"
            path={dataDirPath}
            testId="path-data-dir"
          />
        </div>

      </div>
    </div>
  );
}
