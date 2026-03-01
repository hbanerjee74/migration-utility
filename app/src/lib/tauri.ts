import { invoke } from '@tauri-apps/api/core';
import type {
  AppSettings,
  ApplyWorkspaceArgs,
  DeviceFlowResponse,
  GitHubAuthResult,
  GitHubRepo,
  GitHubUser,
  UsageRun,
  UsageRunDetail,
  UsageSummary,
  WorkspaceApplyProgressEvent,
  Workspace,
} from './types';

export const githubStartDeviceFlow = () =>
  invoke<DeviceFlowResponse>('github_start_device_flow');

export const githubPollForToken = (deviceCode: string) =>
  invoke<GitHubAuthResult>('github_poll_for_token', { deviceCode });

export const githubGetUser = () =>
  invoke<GitHubUser | null>('github_get_user');

export const githubLogout = () =>
  invoke<void>('github_logout');

export const githubListRepos = (query: string, limit = 10) =>
  invoke<GitHubRepo[]>('github_list_repos', { query, limit });

export const workspaceGet = () =>
  invoke<Workspace | null>('workspace_get');

export const workspaceApplyAndClone = (args: ApplyWorkspaceArgs) =>
  invoke<Workspace>('workspace_apply_and_clone', { args });

export const workspaceCancelApply = () =>
  invoke<void>('workspace_cancel_apply');

export const workspaceResetState = () =>
  invoke<void>('workspace_reset_state');

export type { WorkspaceApplyProgressEvent };

export const workspaceTestSourceConnection = (args: {
  sourceType: 'sql_server' | 'fabric_warehouse';
  sourceServer: string;
  sourcePort: number;
  sourceAuthenticationMode: 'sql_password' | 'entra_service_principal';
  sourceUsername: string;
  sourcePassword: string;
  sourceEncrypt: boolean;
  sourceTrustServerCertificate: boolean;
}) =>
  invoke<string>('workspace_test_source_connection', { args });

export const workspaceDiscoverSourceDatabases = (args: {
  sourceType: 'sql_server' | 'fabric_warehouse';
  sourceServer: string;
  sourcePort: number;
  sourceAuthenticationMode: 'sql_password' | 'entra_service_principal';
  sourceUsername: string;
  sourcePassword: string;
  sourceEncrypt: boolean;
  sourceTrustServerCertificate: boolean;
}) =>
  invoke<string[]>('workspace_discover_source_databases', { args });

export const getSettings = () =>
  invoke<AppSettings>('get_settings');

export const saveAnthropicApiKey = (apiKey: string | null) =>
  invoke<void>('save_anthropic_api_key', { apiKey });

export const testApiKey = (apiKey: string) =>
  invoke<boolean>('test_api_key', { apiKey });

export const setLogLevel = (level: string) =>
  invoke<void>('set_log_level', { level });

export const getLogFilePath = () =>
  invoke<string>('get_log_file_path');

export const getDataDirPath = () =>
  invoke<string>('get_data_dir_path');

export const monitorLaunchAgent = (args: { prompt: string; systemPrompt?: string }) =>
  invoke<string>('monitor_launch_agent', {
    prompt: args.prompt,
    systemPrompt: args.systemPrompt ?? null,
  });

export const usageGetSummary = () =>
  invoke<UsageSummary>('usage_get_summary');

export const usageListRuns = (limit = 50) =>
  invoke<UsageRun[]>('usage_list_runs', { limit });

export const usageGetRunDetail = (runId: string) =>
  invoke<UsageRunDetail>('usage_get_run_detail', { runId });
