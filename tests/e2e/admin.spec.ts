import { expect, test, type Page } from "@playwright/test";

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

function getVisibleListItemTitle(page: Page, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return page.locator("p:visible").filter({
    hasText: new RegExp(`^${escapedName}$`),
  });
}

function getListActions(page: Page, name: string, toggleLabel: "Activate" | "Deactivate") {
  const itemTitle = getVisibleListItemTitle(page, name);

  return {
    editButton: itemTitle.locator('xpath=following::button[normalize-space()="Edit"][1]'),
    toggleButton: itemTitle.locator(
      `xpath=following::button[normalize-space()="${toggleLabel}"][1]`,
    ),
    deleteButton: itemTitle.locator(
      'xpath=following::button[normalize-space()="Delete"][1]',
    ),
  };
}

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

  test("logout opens a custom confirmation dialog and cancel keeps the admin session", async ({
    page,
  }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { level: 1, name: "Admin Dashboard" }),
    ).toBeVisible();

    const mobileMenu = page.getByRole("button", { name: "Open admin navigation" });

    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }

    await page.getByRole("button", { name: "Logout" }).click();

    await expect(
      page.getByRole("alertdialog", { name: "Log out of Card Studio?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Stay signed in" }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Log out of Card Studio?" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(createPathRegex("/admin"));

    await runtime.assertHealthy();
  });

  test("product list actions use custom confirmation dialogs", async ({
    page,
  }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/admin/products");
    await expect(
      page.getByRole("heading", { level: 1, name: "Products" }),
    ).toBeVisible();

    const productActions = getListActions(page, "Modern Thank You Card", "Deactivate");

    await expect(productActions.editButton).toHaveCount(1);
    await expect(productActions.toggleButton).toHaveCount(1);
    await expect(productActions.deleteButton).toHaveCount(1);

    await productActions.editButton.click();
    await expect(
      page.getByRole("alertdialog", { name: "Edit this product?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Edit this product?" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(createPathRegex("/admin/products"));

    await productActions.editButton.click();
    await page.getByRole("button", { name: "Continue to edit" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Edit product" }),
    ).toBeVisible();
    await page.goto("/admin/products");

    await productActions.toggleButton.click();
    await expect(
      page.getByRole("alertdialog", { name: "Deactivate this product?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Deactivate this product?" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(createPathRegex("/admin/products"));
    await expect(getVisibleListItemTitle(page, "Modern Thank You Card")).toBeVisible();

    await productActions.deleteButton.click();

    await expect(
      page.getByRole("alertdialog", { name: "Delete this product?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Delete this product?" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(createPathRegex("/admin/products"));
    await expect(getVisibleListItemTitle(page, "Modern Thank You Card")).toBeVisible();

    await runtime.assertHealthy();
  });

  test("category list actions use custom confirmation dialogs", async ({ page }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/admin/categories");
    await expect(
      page.getByRole("heading", { level: 1, name: "Categories" }),
    ).toBeVisible();

    const categoryActions = getListActions(
      page,
      "Thank You Cards",
      "Deactivate",
    );

    await expect(categoryActions.editButton).toHaveCount(1);
    await expect(categoryActions.toggleButton).toHaveCount(1);
    await expect(categoryActions.deleteButton).toHaveCount(1);

    await categoryActions.editButton.click();
    await expect(
      page.getByRole("alertdialog", { name: "Edit this category?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Edit this category?" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(createPathRegex("/admin/categories"));

    await categoryActions.editButton.click();
    await page.getByRole("button", { name: "Continue to edit" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Edit category" }),
    ).toBeVisible();
    await page.goto("/admin/categories");

    await categoryActions.toggleButton.click();
    await expect(
      page.getByRole("alertdialog", { name: "Deactivate this category?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Deactivate this category?" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(createPathRegex("/admin/categories"));
    await expect(getVisibleListItemTitle(page, "Thank You Cards")).toBeVisible();

    await categoryActions.deleteButton.click();
    await expect(
      page.getByRole("alertdialog", { name: "Delete this category?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Delete this category?" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(createPathRegex("/admin/categories"));
    await expect(getVisibleListItemTitle(page, "Thank You Cards")).toBeVisible();

    await runtime.assertHealthy();
  });
});
