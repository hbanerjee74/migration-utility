import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from 'next-themes';
import IconNav from './components/icon-nav';
import HomeSurface from './routes/home';
import ScopeSurface from './routes/scope/index';
import MonitorSurface from './routes/monitor';
import SettingsSurface from './routes/settings/index';
import { Toaster } from './components/ui/sonner';
import { useAuthStore } from './stores/auth-store';
import { useWorkflowStore } from './stores/workflow-store';
import { workspaceGet } from './lib/tauri';
import { logger } from './lib/logger';

// Always land on home; HomeSurface decides what to show based on app state.
function RootRedirect() {
  return <Navigate to="/home" replace />;
}

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const setWorkspaceId = useWorkflowStore((s) => s.setWorkspaceId);
  const clearWorkspaceId = useWorkflowStore((s) => s.clearWorkspaceId);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    workspaceGet()
      .then((workspace) => {
        if (workspace?.id) {
          setWorkspaceId(workspace.id);
        } else {
          clearWorkspaceId();
        }
      })
      .catch((err) => {
        logger.error('app bootstrap: workspace_get failed', err);
      });
  }, [clearWorkspaceId, setWorkspaceId]);

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
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}
