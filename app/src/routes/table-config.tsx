import { useWorkflowStore } from '../stores/workflow-store';
import TabLayout from '@/components/tab-layout';

export default function TableConfig() {
  const { applyStep } = useWorkflowStore();

  function handleApply() {
    applyStep('config');
    console.info('config: applied');
  }

  return (
    <TabLayout
      title="Table Config"
      description="Configure PII columns, load strategy, and snapshot settings per table."
      onApply={handleApply}
    >
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </TabLayout>
  );
}
