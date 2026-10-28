import { defineConfig, devices } from "@playwright/test";
import { resolveHarnessConfig, STORAGE_STATE } from "./harness-config.mjs";

const { url } = resolveHarnessConfig({
  mode: "test",
  dataPathMode: "isolated",
});

export default defineConfig({
  testDir: "../../../tests/playwright",
  outputDir: "../../../.playwright/test-results",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  globalSetup: "../../../tests/playwright/setup.mjs",
  globalTeardown: "../../../tests/playwright/teardown.mjs",
  reporter: process.env.CI
    ? [["list"], ["blob", { outputDir: "../../../.playwright/blob-report" }]]
    : "list",
  use: {
    baseURL: url,
    storageState: STORAGE_STATE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    chromiumSandbox: false,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
