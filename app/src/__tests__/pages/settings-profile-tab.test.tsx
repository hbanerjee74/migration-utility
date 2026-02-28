import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import ProfileTab from '../../routes/settings/profile-tab';
import { getStoredLogLevel, storeLogLevel } from '@/lib/logger';

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
});

describe('ProfileTab', () => {
  it('renders the profile tab container', () => {
    renderTab();
    expect(screen.getByTestId('settings-profile-tab')).toBeInTheDocument();
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

  it('renders fire test logs button', () => {
    renderTab();
    expect(screen.getByTestId('btn-fire-test-logs')).toBeInTheDocument();
  });

  it('renders all three theme toggle buttons', () => {
    renderTab();
    expect(screen.getByTestId('theme-system')).toBeInTheDocument();
    expect(screen.getByTestId('theme-light')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
  });

  it('active theme button has bg-background class', () => {
    renderTab();
    // useTheme returns 'system' so system button should be active
    const systemBtn = screen.getByTestId('theme-system');
    expect(systemBtn.className).toContain('bg-background');
  });
});
