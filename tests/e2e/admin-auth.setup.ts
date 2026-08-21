import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";
import { getAdminCredentials } from "./helpers/safety";

export const ADMIN_STORAGE_STATE_PATH = path.join(
  process.cwd(),
  ".playwright",
  "auth",
  "admin.json",
);

test("create authenticated admin storage state", async ({ page }) => {
  test.skip(
    !getAdminCredentials().configured,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin tests.",
  );

  await mkdir(path.dirname(ADMIN_STORAGE_STATE_PATH), { recursive: true });
  await rm(ADMIN_STORAGE_STATE_PATH, { force: true });

  await page.goto("/auth/login");
  await loginAsAdmin(page);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Admin Dashboard" }),
  ).toBeVisible();

  await page.context().storageState({ path: ADMIN_STORAGE_STATE_PATH });
});
