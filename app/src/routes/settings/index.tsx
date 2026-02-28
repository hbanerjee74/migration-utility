import { Routes, Route } from 'react-router';
import ConnectionsTab from './connections-tab';
import WorkspaceTab from './workspace-tab';
import ResetTab from './reset-tab';
import UsageTab from './usage-tab';

export default function SettingsSurface() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sub-tab header — will be wired up in the full implementation */}
      <div className="shrink-0 border-b border-border px-6 h-10 flex items-end gap-0">
        <p className="text-xs text-muted-foreground pb-2">Settings</p>
      </div>
      <div className="flex-1 overflow-auto p-8">
        <Routes>
          <Route index element={<ConnectionsTab />} />
          <Route path="workspace" element={<WorkspaceTab />} />
          <Route path="reset" element={<ResetTab />} />
          <Route path="usage" element={<UsageTab />} />
        </Routes>
      </div>
    </div>
  );
}
