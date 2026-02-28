import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type AutosaveStatus } from '@/hooks/use-autosave';

interface StepActionsProps {
  onApply: () => void | Promise<void>;
  isApplying?: boolean;
  applyLabel?: string;
  canApply?: boolean;
  /** Passed from useAutosave to show "Saved X ago" in the footer. */
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

export default function StepActions({
  onApply,
  isApplying = false,
  applyLabel = 'Apply',
  canApply = true,
  autosaveStatus,
  autosaveSavedAt,
}: StepActionsProps) {
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
    <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
      {/* Left: autosave status */}
      <span className="text-xs text-muted-foreground">
        {autosaveStatus === 'saving' && 'Saving…'}
        {autosaveStatus === 'saved' && autosaveSavedAt &&
          `Draft saved ${formatRelativeTime(autosaveSavedAt)}`}
        {autosaveStatus === 'error' && (
          <span className="text-destructive">Autosave failed</span>
        )}
      </span>

      {/* Right: Apply button */}
      <Button
        type="button"
        data-testid="btn-apply"
        onClick={onApply}
        disabled={!canApply || isApplying}
        variant={justApplied ? 'outline' : 'default'}
      >
        {isApplying ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : justApplied ? (
          <Check size={14} style={{ color: 'var(--color-seafoam)' }} aria-hidden="true" />
        ) : (
          <Check size={14} aria-hidden="true" />
        )}
        {isApplying ? 'Applying…' : justApplied ? 'Applied' : applyLabel}
      </Button>
    </div>
  );
}
