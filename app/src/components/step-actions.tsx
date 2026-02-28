import { Save, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepActionsProps {
  onSave?: () => void | Promise<void>;
  onApply: () => void | Promise<void>;
  isSaving?: boolean;
  isApplying?: boolean;
  saveLabel?: string;
  applyLabel?: string;
  canApply?: boolean;
}

export default function StepActions({
  onSave,
  onApply,
  isSaving = false,
  isApplying = false,
  saveLabel = 'Save',
  applyLabel = 'Apply',
  canApply = true,
}: StepActionsProps) {
  const busy = isSaving || isApplying;

  return (
    <div className="flex items-center gap-2 pt-4 border-t border-border mt-6">
      {onSave && (
        <Button
          type="button"
          data-testid="btn-save"
          variant="outline"
          onClick={onSave}
          disabled={busy}
        >
          {isSaving ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" aria-hidden="true" />
          ) : (
            <Save size={14} className="mr-1.5" aria-hidden="true" />
          )}
          {isSaving ? 'Saving…' : saveLabel}
        </Button>
      )}
      <Button
        type="button"
        data-testid="btn-apply"
        onClick={onApply}
        disabled={!canApply || busy}
      >
        {isApplying ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" aria-hidden="true" />
        ) : (
          <Play size={14} className="mr-1.5" aria-hidden="true" />
        )}
        {isApplying ? 'Applying…' : applyLabel}
      </Button>
    </div>
  );
}
