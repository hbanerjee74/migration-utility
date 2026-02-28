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
  sourceType?: 'sql_server' | 'fabric_warehouse' | null;
  sourceServer?: string | null;
  sourceDatabase?: string | null;
  sourcePort?: number | null;
  sourceAuthenticationMode?: 'sql_password' | 'entra_service_principal' | null;
  sourceUsername?: string | null;
  sourcePassword?: string | null;
  sourceEncrypt?: boolean | null;
  sourceTrustServerCertificate?: boolean | null;
  createdAt: string;
}

export interface ApplyWorkspaceArgs {
  name: string;
  migrationRepoName: string;
  migrationRepoPath: string;
  fabricUrl?: string | null;
  fabricServicePrincipalId?: string | null;
  fabricServicePrincipalSecret?: string | null;
  sourceType?: 'sql_server' | 'fabric_warehouse' | null;
  sourceServer?: string | null;
  sourceDatabase?: string | null;
  sourcePort?: number | null;
  sourceAuthenticationMode?: 'sql_password' | 'entra_service_principal' | null;
  sourceUsername?: string | null;
  sourcePassword?: string | null;
  sourceEncrypt?: boolean | null;
  sourceTrustServerCertificate?: boolean | null;
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

export interface UsageSummary {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface UsageRun {
  runId: string;
  transcriptPath: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  model: string;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  toolsUsed: string[];
  skillsLoaded: string[];
  preview: string;
}

export interface UsageEvent {
  eventType: string;
  label: string;
  content: string;
  timestampMs: number | null;
}

export interface UsageRunDetail {
  run: UsageRun;
  events: UsageEvent[];
}
