import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { getAdminCredentials } from "./tests/e2e/helpers/safety";

import {
  assertSafePlaywrightBaseUrl,
  getPlaywrightBaseUrl,
  shouldStartLocalWebServer,
} from "./tests/e2e/helpers/safety";

if (fs.existsSync(".env.local")) {
  process.loadEnvFile?.(".env.local");
}

if (fs.existsSync(".env")) {
  process.loadEnvFile?.(".env");
}

const baseURL = getPlaywrightBaseUrl();
const adminCredentials = getAdminCredentials();
const localWebServerEnv = shouldStartLocalWebServer(baseURL)
  ? {
      ...process.env,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY:
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY:
        process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA",
      RATE_LIMIT_HASH_SECRET:
        process.env.RATE_LIMIT_HASH_SECRET || "playwright-local-rate-limit-secret",
      CUSTOMER_INQUIRY_IP_LIMIT: process.env.CUSTOMER_INQUIRY_IP_LIMIT || "2",
      CUSTOMER_INQUIRY_EMAIL_LIMIT:
        process.env.CUSTOMER_INQUIRY_EMAIL_LIMIT || "2",
      CUSTOMER_INQUIRY_DUPLICATE_WINDOW_SECONDS:
        process.env.CUSTOMER_INQUIRY_DUPLICATE_WINDOW_SECONDS || "300",
    }
  : undefined;

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
        env: localWebServerEnv,
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
      testIgnore: [/admin(?:-watermark-settings)?\.spec\.ts/, /admin-auth\.setup\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet-chromium",
      testIgnore: [/admin(?:-watermark-settings)?\.spec\.ts/, /admin-auth\.setup\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile-chromium",
      testIgnore: [/admin(?:-watermark-settings)?\.spec\.ts/, /admin-auth\.setup\.ts/],
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
    {
      name: "admin-watermark-desktop",
      dependencies: ["setup-admin"],
      testMatch: /admin-watermark-settings\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        ...(adminCredentials.configured
          ? { storageState: ".playwright/auth/admin.json" }
          : {}),
      },
    },
  ],
});
