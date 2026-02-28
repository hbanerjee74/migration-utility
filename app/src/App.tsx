import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from 'next-themes';
import IconNav from './components/icon-nav';
import HomeSurface from './routes/home';
import ScopeSurface from './routes/scope/index';
import MonitorSurface from './routes/monitor';
import SettingsSurface from './routes/settings/index';
import { useWorkflowStore } from './stores/workflow-store';

// Redirects based on app state on startup.
function RootRedirect() {
  const migrationStatus = useWorkflowStore((s) => s.migrationStatus);

  if (migrationStatus === 'running') return <Navigate to="/monitor" replace />;
  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <div className="flex h-screen bg-background overflow-hidden">
          <IconNav />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/home" element={<HomeSurface />} />
              <Route path="/scope/*" element={<ScopeSurface />} />
              <Route path="/monitor" element={<MonitorSurface />} />
              <Route path="/settings/*" element={<SettingsSurface />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
