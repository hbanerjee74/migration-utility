import { useWorkflowStore } from '../stores/workflow-store';
import StepActions from '@/components/step-actions';

export default function ReviewLaunch() {
  const { applyStep } = useWorkflowStore();

  function handleApply() {
    applyStep('launch');
    // TODO: write plan.md and trigger migration orchestrator
    console.info('launch: migration triggered');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-base font-semibold tracking-tight">Review & Launch</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Review the migration plan and kick off the orchestrator.
      </p>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
      <StepActions onApply={handleApply} applyLabel="Launch Migration" />
    </div>
  );
}
