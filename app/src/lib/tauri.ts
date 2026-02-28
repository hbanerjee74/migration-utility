import { invoke } from '@tauri-apps/api/core';
import type { DeviceFlowResponse, GitHubAuthResult, GitHubUser } from './types';

export const githubStartDeviceFlow = () =>
  invoke<DeviceFlowResponse>('github_start_device_flow');

export const githubPollForToken = (deviceCode: string) =>
  invoke<GitHubAuthResult>('github_poll_for_token', { deviceCode });

export const githubGetUser = () =>
  invoke<GitHubUser | null>('github_get_user');

export const githubLogout = () =>
  invoke<void>('github_logout');

export const setLogLevel = (level: string) =>
  invoke<void>('set_log_level', { level });

export const getLogFilePath = () =>
  invoke<string>('get_log_file_path');

export const getDataDirPath = () =>
  invoke<string>('get_data_dir_path');
