/**
 * E2E mock for Tauri APIs. This file is loaded via vite plugin
 * when TAURI_E2E=true, replacing @tauri-apps/api/core.
 *
 * It provides mock responses for all invoke commands so the frontend
 * can render without the Rust backend.
 */

const mockResponses: Record<string, unknown> = {
  // Workspace
  workspace_get: null,
  workspace_create: undefined,
  get_workspaces: [],
  create_workspace: undefined,
  delete_workspace: undefined,
  // Candidacy
  get_candidacies: [],
  update_candidacy: undefined,
  // Table config
  get_table_configs: [],
  save_table_config: undefined,
  // Selected tables
  get_selected_tables: [],
  // Plan
  get_plan_status: { status: "pending", updatedAt: null },
  finalize_plan: undefined,
  // GitHub auth
  github_get_user: null,
  github_logout: undefined,
  // App info
  set_log_level: undefined,
  get_log_file_path: null,
  get_data_dir_path: null,
};

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Allow tests to override via window
  const overrides = (window as unknown as Record<string, unknown>).__TAURI_MOCK_OVERRIDES__ as
    | Record<string, unknown>
    | undefined;
  if (overrides && cmd in overrides) {
    const val = overrides[cmd];
    if (val instanceof Error) throw val;
    return val as T;
  }

  if (cmd in mockResponses) {
    return mockResponses[cmd] as T;
  }

  console.warn(`[tauri-e2e-mock] Unhandled invoke: ${cmd}`, args);
  return undefined as T;
}
