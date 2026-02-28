import { useWorkflowStore } from '../stores/workflow-store';
import TabLayout from '@/components/tab-layout';

export default function ScopeSelection() {
  const { applyStep } = useWorkflowStore();

  function handleApply() {
    applyStep('scope');
    console.info('scope: applied');
  }

  return (
    <TabLayout
      title="Table Scope"
      description="Select the tables to include in this migration."
      onApply={handleApply}
    >
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </TabLayout>
  );
}
