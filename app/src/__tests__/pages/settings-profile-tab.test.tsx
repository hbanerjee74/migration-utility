import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import ProfileTab from '../../routes/settings/profile-tab';
import { getStoredLogLevel, storeLogLevel } from '@/lib/logger';
import { mockInvokeCommands, resetTauriMocks } from '../../test/mocks/tauri';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme: vi.fn() }),
}));

function renderTab() {
  return render(
    <MemoryRouter>
      <ProfileTab />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  storeLogLevel('info');
  resetTauriMocks();
  mockInvokeCommands({
    get_log_file_path: '/tmp/migration-utility.log',
    get_data_dir_path: '/tmp/data',
    set_log_level: undefined,
  });
});

describe('ProfileTab', () => {
  it('renders the profile tab container', () => {
    renderTab();
    expect(screen.getByTestId('settings-profile-tab')).toBeInTheDocument();
    expect(screen.getByTestId('settings-panel-profile')).toBeInTheDocument();
    expect(screen.getByTestId('settings-profile-logging-card')).toBeInTheDocument();
    expect(screen.getByTestId('settings-profile-directories-card')).toBeInTheDocument();
  });

  it('renders log level select with current level selected', () => {
    storeLogLevel('warn');
    renderTab();
    const select = screen.getByTestId('select-log-level') as HTMLSelectElement;
    expect(select.value).toBe('warn');
  });

  it('changing log level select updates stored level', async () => {
    const user = userEvent.setup();
    renderTab();
    const select = screen.getByTestId('select-log-level');
    await user.selectOptions(select, 'debug');
    expect(getStoredLogLevel()).toBe('debug');
  });

  it('does not render fire test logs button', () => {
    renderTab();
    expect(screen.queryByTestId('btn-fire-test-logs')).not.toBeInTheDocument();
  });

  it('renders all three theme toggle buttons', () => {
    renderTab();
    expect(screen.getByTestId('theme-system')).toBeInTheDocument();
    expect(screen.getByTestId('theme-light')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
  });

  it('active theme button has bg-background class', () => {
    renderTab();
    const systemBtn = screen.getByTestId('theme-system');
    expect(systemBtn.className).toContain('bg-background');
  });

  it('renders working directory path', () => {
    renderTab();
    expect(screen.getByTestId('path-working-dir')).toHaveTextContent('~/.vibedata/migration-utility');
  });

  it('renders log file path from backend', async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByTestId('path-log-file')).toHaveTextContent('/tmp/migration-utility.log');
    });
  });

  it('renders data directory path from backend', async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByTestId('path-data-dir')).toHaveTextContent('/tmp/data');
    });
  });
});
