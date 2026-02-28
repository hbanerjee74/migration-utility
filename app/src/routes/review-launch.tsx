import { useWorkflowStore } from '../stores/workflow-store';
import TabLayout from '@/components/tab-layout';

export default function ReviewLaunch() {
  const { applyStep } = useWorkflowStore();

  function handleApply() {
    applyStep('launch');
    // TODO: write plan.md and trigger migration orchestrator
    console.info('launch: migration triggered');
  }

  return (
    <TabLayout
      title="Review & Launch"
      description="Review the migration plan and kick off the orchestrator."
      onApply={handleApply}
      applyLabel="Launch Migration"
    >
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </TabLayout>
  );
}
