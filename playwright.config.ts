import { defineConfig, devices } from "@playwright/test";
import { getAdminCredentials } from "./tests/e2e/helpers/safety";

import {
  assertSafePlaywrightBaseUrl,
  getPlaywrightBaseUrl,
  shouldStartLocalWebServer,
} from "./tests/e2e/helpers/safety";

const baseURL = getPlaywrightBaseUrl();
const adminCredentials = getAdminCredentials();

assertSafePlaywrightBaseUrl(baseURL);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? undefined : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: shouldStartLocalWebServer(baseURL)
      ? {
        command: "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: "setup-admin",
      testMatch: /admin-auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "desktop-chromium",
      testIgnore: [/admin\.spec\.ts/, /admin-auth\.setup\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet-chromium",
      testIgnore: [/admin\.spec\.ts/, /admin-auth\.setup\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile-chromium",
      testIgnore: [/admin\.spec\.ts/, /admin-auth\.setup\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "admin-desktop",
      dependencies: ["setup-admin"],
      testMatch: /admin\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        ...(adminCredentials.configured
          ? { storageState: ".playwright/auth/admin.json" }
          : {}),
      },
    },
    {
      name: "admin-tablet",
      dependencies: ["setup-admin"],
      testMatch: /admin\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        ...(adminCredentials.configured
          ? { storageState: ".playwright/auth/admin.json" }
          : {}),
      },
    },
    {
      name: "admin-mobile",
      dependencies: ["setup-admin"],
      testMatch: /admin\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        ...(adminCredentials.configured
          ? { storageState: ".playwright/auth/admin.json" }
          : {}),
      },
    },
  ],
});
