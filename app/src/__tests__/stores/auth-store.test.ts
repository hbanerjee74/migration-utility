import { describe, it, expect, beforeEach } from 'vitest';
import { mockInvokeCommands, resetTauriMocks } from '../../test/mocks/tauri';
import { useAuthStore } from '@/stores/auth-store';

const MOCK_USER = {
  login: 'octocat',
  avatar_url: 'https://github.com/octocat.png',
  email: 'octocat@github.com',
};

beforeEach(() => {
  resetTauriMocks();
  useAuthStore.setState({ user: null, isLoggedIn: false, isLoading: false });
});

describe('useAuthStore', () => {
  it('initial state has no user', () => {
    const { user, isLoggedIn, isLoading } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isLoggedIn).toBe(false);
    expect(isLoading).toBe(false);
  });

  it('setUser sets user and isLoggedIn', () => {
    useAuthStore.getState().setUser(MOCK_USER);
    const { user, isLoggedIn } = useAuthStore.getState();
    expect(user).toEqual(MOCK_USER);
    expect(isLoggedIn).toBe(true);
  });

  it('setUser(null) clears user and isLoggedIn', () => {
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it('reset clears all state', () => {
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().reset();
    const { user, isLoggedIn, isLoading } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isLoggedIn).toBe(false);
    expect(isLoading).toBe(false);
  });

  it('loadUser sets user when github_get_user returns one', async () => {
    mockInvokeCommands({ github_get_user: MOCK_USER });
    await useAuthStore.getState().loadUser();
    const { user, isLoggedIn, isLoading } = useAuthStore.getState();
    expect(user).toEqual(MOCK_USER);
    expect(isLoggedIn).toBe(true);
    expect(isLoading).toBe(false);
  });

  it('loadUser sets null when github_get_user returns null', async () => {
    mockInvokeCommands({ github_get_user: null });
    await useAuthStore.getState().loadUser();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it('logout calls github_logout and clears user', async () => {
    useAuthStore.getState().setUser(MOCK_USER);
    mockInvokeCommands({ github_logout: undefined });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });
});
