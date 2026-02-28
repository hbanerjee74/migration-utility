import { Routes, Route } from 'react-router';
import ScopeStep from './scope-step';
import CandidacyStep from './candidacy-step';
import ConfigStep from './config-step';

export default function ScopeSurface() {
  return (
    <div className="h-full flex overflow-hidden">
      {/* ScopeStepNav will go here */}
      <main className="flex-1 overflow-auto p-8">
        <Routes>
          <Route index element={<ScopeStep />} />
          <Route path="candidacy" element={<CandidacyStep />} />
          <Route path="config" element={<ConfigStep />} />
        </Routes>
      </main>
    </div>
  );
}
