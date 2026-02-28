import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from 'next-themes';
import TabNav from './components/stepper-nav';
import WorkspaceSetup from './routes/workspace-setup';
import ScopeSelection from './routes/scope-selection';
import CandidacyReview from './routes/candidacy-review';
import TableConfig from './routes/table-config';
import ReviewLaunch from './routes/review-launch';
import { useWorkflowStore, STEP_ROUTES } from './stores/workflow-store';

// Redirects to wherever the user last left off (persisted across restarts).
function RootRedirect() {
  const currentStep = useWorkflowStore((s) => s.currentStep);
  return <Navigate to={STEP_ROUTES[currentStep]} replace />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <div className="flex h-screen bg-background overflow-hidden">
          <TabNav />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/workspace" element={<WorkspaceSetup />} />
              <Route path="/scope" element={<ScopeSelection />} />
              <Route path="/candidacy" element={<CandidacyReview />} />
              <Route path="/config" element={<TableConfig />} />
              <Route path="/launch" element={<ReviewLaunch />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
