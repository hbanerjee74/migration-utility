import { useWorkflowStore } from '../stores/workflow-store';
import TabLayout from '@/components/tab-layout';

export default function CandidacyReview() {
  const { applyStep } = useWorkflowStore();

  function handleApply() {
    applyStep('candidacy');
    console.info('candidacy: applied');
  }

  return (
    <TabLayout
      title="Candidacy Review"
      description="Review and override the AI-assigned candidacy tiers."
      onApply={handleApply}
    >
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </TabLayout>
  );
}
