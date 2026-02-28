/**
 * E2E mock for @tauri-apps/plugin-log.
 * Attaching console in E2E is a no-op since there is no Rust backend.
 */
export async function attachConsole(): Promise<() => void> {
  return () => {};
}
