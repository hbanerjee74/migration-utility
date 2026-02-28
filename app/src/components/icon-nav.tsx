import { useLocation, useNavigate } from 'react-router';
import { House, LayoutGrid, Activity, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowStore, type Surface } from '@/stores/workflow-store';

interface NavItem {
  surface: Surface;
  path: string;
  icon: LucideIcon;
  label: string;
  testId: string;
}

const TOP_ITEMS: NavItem[] = [
  { surface: 'home',     path: '/home',     icon: House,       label: 'Home',     testId: 'nav-home' },
  { surface: 'scope',    path: '/scope',    icon: LayoutGrid,  label: 'Scope',    testId: 'nav-scope' },
  { surface: 'monitor',  path: '/monitor',  icon: Activity,    label: 'Monitor',  testId: 'nav-monitor' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { surface: 'settings', path: '/settings', icon: Settings,    label: 'Settings', testId: 'nav-settings' },
];

function NavButton({ item, isActive, onClick }: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      data-testid={item.testId}
      data-active={String(isActive)}
      title={item.label}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150',
        'outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        isActive ? 'text-white' : 'text-white/40 hover:text-white/70',
      )}
      style={isActive ? { backgroundColor: 'var(--icon-nav-active-bg)' } : undefined}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--icon-nav-hover-bg)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
      }}
    >
      {/* Active left accent bar */}
      {isActive && (
        <span
          className="absolute -left-[2px] top-1.5 bottom-1.5 w-[3px] rounded-r-full"
          style={{ backgroundColor: 'var(--color-pacific)' }}
          aria-hidden="true"
        />
      )}
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export default function IconNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setCurrentSurface } = useWorkflowStore();

  function isActive(item: NavItem): boolean {
    // /scope/* and /settings/* should match their sub-routes
    if (item.path === '/scope') return pathname === '/scope' || pathname.startsWith('/scope/');
    if (item.path === '/settings') return pathname === '/settings' || pathname.startsWith('/settings/');
    return pathname === item.path;
  }

  function handleClick(item: NavItem) {
    setCurrentSurface(item.surface);
    navigate(item.path);
  }

  return (
    <nav
      className="w-[52px] h-full flex flex-col items-center py-3.5 gap-0.5 shrink-0"
      style={{ backgroundColor: 'var(--icon-nav-bg)' }}
      aria-label="Main navigation"
    >
      {/* Logo mark */}
      <div
        className="w-7 h-7 rounded-[6px] flex items-center justify-center mb-4 shrink-0"
        style={{ backgroundColor: 'var(--color-pacific)' }}
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      </div>

      {/* Top nav items */}
      {TOP_ITEMS.map((item) => (
        <NavButton
          key={item.surface}
          item={item}
          isActive={isActive(item)}
          onClick={() => handleClick(item)}
        />
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom nav items */}
      {BOTTOM_ITEMS.map((item) => (
        <NavButton
          key={item.surface}
          item={item}
          isActive={isActive(item)}
          onClick={() => handleClick(item)}
        />
      ))}
    </nav>
  );
}
