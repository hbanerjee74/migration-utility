import { useWorkflowStore } from '../stores/workflow-store';
import StepActions from '@/components/step-actions';

export default function TableConfig() {
  const { applyStep } = useWorkflowStore();

  function handleApply() {
    applyStep('config');
    console.info('config: applied');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-base font-semibold tracking-tight">Table Config</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Configure PII columns, load strategy, and snapshot settings per table.
      </p>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
      <StepActions onApply={handleApply} />
    </div>
  );
}
