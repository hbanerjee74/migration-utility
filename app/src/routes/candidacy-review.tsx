import { useNavigate } from 'react-router';
import { useWorkflowStore } from '../stores/workflow-store';
import StepActions from '@/components/step-actions';

export default function CandidacyReview() {
  const navigate = useNavigate();
  const { applyStep, advanceTo } = useWorkflowStore();

  function handleApply() {
    applyStep('candidacy');
    advanceTo('config');
    navigate('/config');
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-base font-semibold tracking-tight">Candidacy Review</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Review and override the AI-assigned candidacy tiers.
      </p>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
      <StepActions onApply={handleApply} applyLabel="Apply & Continue" />
    </div>
  );
}
