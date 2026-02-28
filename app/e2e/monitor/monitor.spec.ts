import { test, expect, type Page } from "@playwright/test";
import { waitForAppReady } from "../helpers/app-helpers";

const STORE_KEY = "migration-workflow";

interface StoreOverrides {
  workspaceId?: string | null;
  migrationStatus?: "idle" | "running" | "complete";
}

async function seedStore(page: Page, overrides: StoreOverrides = {}) {
  await page.addInitScript(
    ({ key, state }) => {
      localStorage.setItem(key, JSON.stringify({ state, version: 0 }));
    },
    {
      key: STORE_KEY,
      state: {
        workspaceId: "acme-corp",
        migrationStatus: "idle",
        scopeStepStatus: {},
        scopeStepSavedAt: {},
        currentSurface: "monitor",
        currentScopeStep: "scope",
        selectedTableIds: [],
        ...overrides,
      },
    },
  );
}

test.describe("Monitor launch wiring @monitor", () => {
  test("launch calls monitor command and renders agent output in log stream", async ({ page }) => {
    await seedStore(page, { migrationStatus: "idle" });
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__TAURI_MOCK_OVERRIDES__ = {
        monitor_launch_agent: "mock agent output from sidecar",
      };
    });

    await page.goto("/monitor");
    await waitForAppReady(page);

    await expect(page.getByTestId("monitor-ready-state")).toBeVisible();
    await page.getByTestId("btn-launch-migration").click();

    await expect(page.getByTestId("monitor-running-state")).toBeVisible();
    await expect(page.getByTestId("monitor-log-stream")).toContainText(
      "mock agent output from sidecar",
    );
  });
});
