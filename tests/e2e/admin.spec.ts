import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, monitorPageRuntime } from "./helpers/runtime";
import { getAdminCredentials } from "./helpers/safety";

const adminPages = [
  { path: "/admin", heading: "Admin Dashboard" },
  { path: "/admin/products", heading: "Products" },
  { path: "/admin/categories", heading: "Categories" },
  { path: "/admin/appearance", heading: "Appearance" },
  { path: "/admin/inquiries", heading: "Inquiries" },
] as const;

test.skip(
  !getAdminCredentials().configured,
  "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin tests.",
);

function createPathRegex(path: string) {
  const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escapedPath}(?:\\?.*)?$`);
}

test.describe("admin read-only smoke", () => {
  for (const adminPage of adminPages) {
    test(`${adminPage.path} loads without starter UI`, async ({ page }) => {
      const runtime = monitorPageRuntime(page);

      await page.goto(adminPage.path);

      await expect(page).not.toHaveURL(/\/auth\/login/);
      await expect(page).toHaveURL(createPathRegex(adminPage.path));

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: adminPage.heading,
        }),
      ).toBeVisible();
      await expect(page.getByText(/next\.js supabase starter/i)).toHaveCount(0);
      await expect(page.getByText(/deploy to vercel/i)).toHaveCount(0);

      await expectNoHorizontalOverflow(page);
      await runtime.assertHealthy();
    });
  }
});
