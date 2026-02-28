export interface DeviceFlowResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  email: string | null;
}

export interface GitHubRepo {
  id: number;
  fullName: string;
  private: boolean;
}

export interface Workspace {
  id: string;
  displayName: string;
  migrationRepoName?: string | null;
  migrationRepoPath: string;
  fabricUrl?: string | null;
  fabricServicePrincipalId?: string | null;
  fabricServicePrincipalSecret?: string | null;
  createdAt: string;
}

export interface ApplyWorkspaceArgs {
  name: string;
  migrationRepoName: string;
  migrationRepoPath: string;
  fabricUrl?: string | null;
  fabricServicePrincipalId?: string | null;
  fabricServicePrincipalSecret?: string | null;
}

export interface AppSettings {
  anthropicApiKey: string | null;
  githubOauthToken: string | null;
  githubUserLogin: string | null;
  githubUserAvatar: string | null;
  githubUserEmail: string | null;
}

export type GitHubAuthResult =
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'success'; user: GitHubUser };
