import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type AutosaveStatus } from '@/hooks/use-autosave';

interface TabLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onApply: () => void | Promise<void>;
  isApplying?: boolean;
  applyLabel?: string;
  canApply?: boolean;
  autosaveStatus?: AutosaveStatus;
  autosaveSavedAt?: string;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TabLayout({
  title,
  description,
  children,
  onApply,
  isApplying = false,
  applyLabel = 'Apply',
  canApply = true,
  autosaveStatus,
  autosaveSavedAt,
}: TabLayoutProps) {
  // Flash "Applied" for 2 s after isApplying transitions true → false.
  const [justApplied, setJustApplied] = useState(false);
  const prevApplyingRef = useRef(false);

  useEffect(() => {
    if (prevApplyingRef.current && !isApplying) {
      setJustApplied(true);
      const t = setTimeout(() => setJustApplied(false), 2000);
      return () => clearTimeout(t);
    }
    prevApplyingRef.current = isApplying;
  }, [isApplying]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top panel — heading, description, Apply */}
      <div className="shrink-0 border-b border-border px-8 py-5 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight leading-snug">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-0.5">
          {/* Autosave status */}
          <span className="text-xs text-muted-foreground">
            {autosaveStatus === 'saving' && 'Saving…'}
            {autosaveStatus === 'saved' && autosaveSavedAt &&
              `Saved ${formatRelativeTime(autosaveSavedAt)}`}
            {autosaveStatus === 'error' && (
              <span className="text-destructive">Autosave failed</span>
            )}
          </span>

          {/* Apply button */}
          <Button
            type="button"
            data-testid="btn-apply"
            onClick={onApply}
            disabled={!canApply || isApplying}
            variant={justApplied ? 'outline' : 'default'}
            size="sm"
          >
            {isApplying ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : justApplied ? (
              <Check size={13} style={{ color: 'var(--color-seafoam)' }} aria-hidden="true" />
            ) : (
              <Check size={13} aria-hidden="true" />
            )}
            {isApplying ? 'Applying…' : justApplied ? 'Applied' : applyLabel}
          </Button>
        </div>
      </div>

      {/* Content panel — scrollable */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {children}
      </div>
    </div>
  );
}
