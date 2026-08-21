import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";
import { monitorPageRuntime } from "./helpers/runtime";
import { getAdminCredentials } from "./helpers/safety";

test.describe("auth foundation", () => {
  test("unauthenticated /admin visit redirects to login", async ({ page }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByText(/^admin login$/i)).toBeVisible();

    await runtime.assertHealthy();
  });

  test("login page renders without public sign-up entry points", async ({ page }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/auth/login");

    await expect(page.getByText(/^admin login$/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /forgot your password/i }),
    ).toBeVisible();
    await expect(page.getByText(/sign up/i)).toHaveCount(0);

    await runtime.assertHealthy();
  });

  test("authenticated admin can reach /admin when credentials are configured", async ({
    page,
  }) => {
    test.skip(
      !getAdminCredentials().configured,
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin tests.",
    );

    const runtime = monitorPageRuntime(page);

    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();

    await runtime.assertHealthy();
  });
});
