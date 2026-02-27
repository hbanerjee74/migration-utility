/**
 * E2E mock for @tauri-apps/plugin-dialog.
 * Returns a mock path when a dialog is opened.
 * Tests can override the path via window.__TAURI_MOCK_OVERRIDES__.dialogPath.
 */
export async function open(_options?: Record<string, unknown>): Promise<string | null> {
  const overrides = (window as unknown as Record<string, unknown>).__TAURI_MOCK_OVERRIDES__ as
    | Record<string, unknown>
    | undefined;
  return (overrides?.dialogPath as string | undefined) ?? "/mock/path";
}
