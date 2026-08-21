import { expect, type Page } from "@playwright/test";
import { getAdminCredentials } from "./safety";

export async function loginAsAdmin(page: Page) {
  const credentials = getAdminCredentials();

  if (!credentials.configured) {
    throw new Error(
      "Missing E2E admin credentials. Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin tests.",
    );
  }

  await page.goto("/auth/login");
  await expect(page.getByText(/^admin login$/i)).toBeVisible();

  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/^password$/i).fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/admin");
  await expect(
    page.getByRole("heading", { level: 1, name: /admin dashboard/i }),
  ).toBeVisible();
}
