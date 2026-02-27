import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from 'next-themes';
import StepperNav from './components/stepper-nav';
import WorkspaceSetup from './routes/workspace-setup';
import ScopeSelection from './routes/scope-selection';
import CandidacyReview from './routes/candidacy-review';
import TableConfig from './routes/table-config';
import ReviewLaunch from './routes/review-launch';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <div className="flex min-h-screen bg-background">
          <StepperNav />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/workspace" replace />} />
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
