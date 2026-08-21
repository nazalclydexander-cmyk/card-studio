import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";
import { expectNoHorizontalOverflow, monitorPageRuntime } from "./helpers/runtime";
import { getAdminCredentials } from "./helpers/safety";

const adminPages = [
  { path: "/admin", heading: /admin dashboard/i },
  { path: "/admin/products", heading: /products manager/i },
  { path: "/admin/categories", heading: /categories manager/i },
  { path: "/admin/appearance", heading: /appearance editor/i },
  { path: "/admin/inquiries", heading: /^inquiries$/i },
] as const;

test.describe("admin read-only smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !getAdminCredentials().configured,
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin tests.",
    );

    await loginAsAdmin(page);
  });

  for (const adminPage of adminPages) {
    test(`${adminPage.path} loads without starter UI`, async ({ page }) => {
      const runtime = monitorPageRuntime(page);

      await page.goto(adminPage.path);

      await expect(page.getByRole("heading", { name: adminPage.heading })).toBeVisible();
      await expect(page.getByText(/next\.js supabase starter/i)).toHaveCount(0);
      await expect(page.getByText(/deploy to vercel/i)).toHaveCount(0);

      await expectNoHorizontalOverflow(page);
      await runtime.assertHealthy();
    });
  }
});
