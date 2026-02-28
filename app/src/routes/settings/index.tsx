import { Routes, Route, useLocation, useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import ConnectionsTab from './connections-tab';
import WorkspaceTab from './workspace-tab';
import ProfileTab from './profile-tab';
import ResetTab from './reset-tab';
import UsageTab from './usage-tab';

interface SubTab {
  label: string;
  path: string;
  testId: string;
}

const TABS: SubTab[] = [
  { label: 'Connections', path: '/settings',           testId: 'settings-tab-connections' },
  { label: 'Workspace',   path: '/settings/workspace', testId: 'settings-tab-workspace' },
  { label: 'Profile',     path: '/settings/profile',   testId: 'settings-tab-profile' },
  { label: 'Reset',       path: '/settings/reset',     testId: 'settings-tab-reset' },
  { label: 'Usage',       path: '/settings/usage',     testId: 'settings-tab-usage' },
];

export default function SettingsSurface() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  function isActive(tab: SubTab): boolean {
    if (tab.path === '/settings') return pathname === '/settings';
    return pathname === tab.path || pathname.startsWith(tab.path + '/');
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sub-tab header */}
      <div className="shrink-0 border-b border-border flex items-end px-6 gap-0">
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <button
              key={tab.path}
              type="button"
              data-testid={tab.testId}
              onClick={() => navigate(tab.path)}
              className={cn(
                'px-3 pb-2.5 pt-3 text-sm font-medium border-b transition-colors duration-150 outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                active
                  ? 'border-[var(--color-pacific)] text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<ConnectionsTab />} />
          <Route path="workspace" element={<WorkspaceTab />} />
          <Route path="profile" element={<ProfileTab />} />
          <Route path="reset" element={<ResetTab />} />
          <Route path="usage" element={<UsageTab />} />
        </Routes>
      </div>
    </div>
  );
}
