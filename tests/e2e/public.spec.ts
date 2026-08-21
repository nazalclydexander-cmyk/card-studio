import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, monitorPageRuntime } from "./helpers/runtime";

test.describe("public smoke", () => {
  test("contact form captures Asia/Manila timezone metadata", async ({
    browser,
  }) => {
    const context = await browser.newContext({ timezoneId: "Asia/Manila" });
    const page = await context.newPage();
    const runtime = monitorPageRuntime(page);

    await page.goto("/contact");

    await expect(page.locator('input[name="submitter_timezone"]')).toHaveValue(
      "Asia/Manila",
    );
    await expect(
      page.locator('input[name="submitter_utc_offset_minutes"]'),
    ).toHaveValue("480");

    await runtime.assertHealthy();
    await context.close();
  });

  test("contact form captures America/New_York timezone metadata", async ({
    browser,
  }) => {
    const context = await browser.newContext({ timezoneId: "America/New_York" });
    const page = await context.newPage();
    const runtime = monitorPageRuntime(page);

    await page.goto("/contact");

    await expect(page.locator('input[name="submitter_timezone"]')).toHaveValue(
      "America/New_York",
    );
    await expect(
      page.locator('input[name="submitter_utc_offset_minutes"]'),
    ).toHaveValue("-240");

    await runtime.assertHealthy();
    await context.close();
  });

  test("home page loads with public navigation and no starter content", async ({
    page,
  }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/");

    const banner = page.getByRole("banner");
    const primaryNavigation = page.getByRole("navigation", { name: /primary/i });
    const mobileMenuButton = banner.getByRole("button", { name: /menu|close/i });

    await expect(banner).toBeVisible();

    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(
        page.getByRole("navigation", { name: /mobile primary/i }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("navigation", { name: /mobile primary/i })
          .getByRole("link", { name: /^home$/i }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("navigation", { name: /mobile primary/i })
          .getByRole("link", { name: /^collection$/i }),
      ).toBeVisible();
    } else {
      await expect(primaryNavigation).toBeVisible();
      await expect(
        primaryNavigation.getByRole("link", { name: /^home$/i }),
      ).toBeVisible();
      await expect(
        primaryNavigation.getByRole("link", { name: /^collection$/i }),
      ).toBeVisible();
    }

    await expect(page.getByText(/next\.js supabase starter/i)).toHaveCount(0);
    await expect(page.getByText(/deploy to vercel/i)).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    await runtime.assertHealthy();
  });

  test("/products loads and renders a stable catalog state", async ({ page }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/products");

    await expect(
      page.getByRole("heading", {
        name: /invitation and greeting card designs/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /search designs/i })).toBeVisible();

    const categoryFilters = page.getByText(/browse by category/i);
    const productCards = page.locator("article");
    const emptyOrErrorState = page.getByText(
      /no matching designs yet|catalog temporarily unavailable|we couldn't load the collection right now/i,
    );

    await expect(categoryFilters.or(emptyOrErrorState).first()).toBeVisible();

    const cardCount = await productCards.count();

    if (cardCount === 0) {
      await expect(emptyOrErrorState.first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
    await runtime.assertHealthy();
  });

  test("product detail loads from a discovered public product when available", async ({
    page,
  }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/products");

    const productCards = page.locator("article");
    const productLink = productCards.first().getByRole("link").first();

    if ((await productCards.count()) === 0) {
      await expect(
        page.getByText(
          /no matching designs yet|catalog temporarily unavailable|we couldn't load the collection right now/i,
        ).first(),
      ).toBeVisible();
      return;
    }

    await Promise.all([
      page.waitForURL(/\/products\/[^/?#]+$/),
      productLink.click(),
    ]);

    await expect(page).toHaveURL(/\/products\/.+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /request this design/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/no preview available|related designs|about this design/i).first(),
    ).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await runtime.assertHealthy();
  });

  test("/contact loads and required fields are enforced", async ({ page }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/contact");

    await expect(
      page.getByRole("heading", { name: /let's talk about your design/i }),
    ).toBeVisible();

    const nameInput = page.getByLabel(/name \*/i);
    const messageInput = page.getByLabel(/message \*/i);

    await expect(nameInput).toBeVisible();
    await expect(messageInput).toBeVisible();
    await expect(page.getByRole("button", { name: /submit inquiry/i })).toBeVisible();

    await expect(
      nameInput.evaluate((element) => element.matches(":invalid")),
    ).resolves.toBe(true);
    await expect(
      messageInput.evaluate((element) => element.matches(":invalid")),
    ).resolves.toBe(true);

    await expectNoHorizontalOverflow(page);
    await runtime.assertHealthy();
  });
});
