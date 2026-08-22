import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { monitorPageRuntime } from "./helpers/runtime";
import { getAdminCredentials } from "./helpers/safety";

const WATERMARK_PREVIEW_PATH = "/api/admin/product-images/preview";
const PRODUCT_PREVIEWS_PUBLIC_URL_PREFIX =
  "https://yjsljyuhluwelrcaqbwn.supabase.co/storage/v1/object/public/product-previews/";
const PRODUCT_ORIGINALS_PATH_SEGMENT = "/product-originals/";
const FIXTURE_IMAGE_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "watermark-test.png",
);

const unsavedDraftConfig = {
  text: "UNSAVED DRAFT",
  mode: "manual",
  font: "trebuchet_ms",
  manualColor: "#00AA00",
  opacity: 33,
  rotation: -12,
  repeat: false,
} as const;

const E2E_WATERMARK_TEXT_PRIMARY = "E2E WATERMARK TEST";
const E2E_WATERMARK_TEXT_ALTERNATE = "E2E WATERMARK ALT";

type WatermarkValues = {
  text: string;
  mode: string;
  font: string;
  manualColor: string;
  lightColor: string;
  darkColor: string;
  opacity: number;
  rotation: number;
  size: number;
  spacingX: number;
  spacingY: number;
  enabled: boolean;
  repeat: boolean;
};

type WatermarkDebugHeaders = {
  status: number;
  text: string;
  font: string | null;
  opacity: string | null;
  rotation: string | null;
  repeat: string | null;
  enabled: string | null;
  tone: string | null;
  fill: string | null;
};

test.skip(
  !getAdminCredentials().configured,
  "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin tests.",
);

test.describe.serial("admin watermark settings", () => {
  test("manual, adaptive, and stale-request preview behavior works without saving", async ({
    page,
  }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/admin/appearance");
    await expect(
      page.getByRole("heading", { level: 1, name: "Appearance" }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: "Preview" }),
    ).toBeVisible();

    const manualHeaders = await waitForAppearancePreview(
      page,
      async () => {
        await setCheckbox(page, "Enable watermark", true);
        await getWatermarkControl(page, "Watermark text").fill("TEST WATERMARK");
        await getWatermarkControl(page, "Mode").selectOption("manual");
        await getWatermarkControl(page, "Font").selectOption("georgia");
        await getWatermarkControl(page, "Manual color hex value").fill("#FF0000");
        await setSlider(page, "Opacity", 40);
        await setSlider(page, "Rotation", 0);
        await setCheckbox(page, "Repeat watermark across the image", true);
      },
      undefined,
      (headers) =>
        headers.text === "TEST WATERMARK" &&
        headers.font === "georgia" &&
        headers.opacity === "0.40" &&
        headers.rotation === "0" &&
        headers.repeat === "true" &&
        headers.enabled === "true" &&
        headers.fill?.includes("255, 0, 0") === true,
    );

    expect(manualHeaders.status).toBe(200);
    expect(manualHeaders.text).toBe("TEST WATERMARK");
    expect(manualHeaders.font).toBe("georgia");
    expect(manualHeaders.opacity).toBe("0.40");
    expect(manualHeaders.rotation).toBe("0");
    expect(manualHeaders.repeat).toBe("true");
    expect(manualHeaders.enabled).toBe("true");
    expect(manualHeaders.fill).toContain("255, 0, 0");

    const manualVariantHeaders = await waitForAppearancePreview(
      page,
      async () => {
        await getWatermarkControl(page, "Font").selectOption("trebuchet_ms");
        await getWatermarkControl(page, "Manual color hex value").fill("#0000FF");
        await setSlider(page, "Opacity", 15);
        await setSlider(page, "Rotation", 45);
      },
      undefined,
      (headers) =>
        headers.text === "TEST WATERMARK" &&
        headers.font === "trebuchet_ms" &&
        headers.opacity === "0.15" &&
        headers.rotation === "45" &&
        headers.repeat === "true" &&
        headers.enabled === "true" &&
        headers.fill?.includes("0, 0, 255") === true,
    );

    expect(manualVariantHeaders.text).toBe("TEST WATERMARK");
    expect(manualVariantHeaders.font).toBe("trebuchet_ms");
    expect(manualVariantHeaders.opacity).toBe("0.15");
    expect(manualVariantHeaders.rotation).toBe("45");
    expect(manualVariantHeaders.fill).toContain("0, 0, 255");

    const adaptiveHeaders = await waitForAppearancePreview(
      page,
      async () => {
        await getWatermarkControl(page, "Mode").selectOption("adaptive");
        await getWatermarkControl(page, "Light watermark color hex value").fill("#FF0000");
        await getWatermarkControl(page, "Dark watermark color hex value").fill("#0000FF");
        await setSliderDirect(page, "Opacity", 40);
      },
      undefined,
      (headers) =>
        headers.text === "TEST WATERMARK" &&
        headers.font === "trebuchet_ms" &&
        headers.opacity === "0.40" &&
        headers.rotation === "45" &&
        headers.repeat === "true" &&
        headers.enabled === "true" &&
        headers.tone === "dark" &&
        headers.fill?.includes("0, 0, 255") === true,
    );

    expect(adaptiveHeaders.tone).toBe("dark");
    expect(adaptiveHeaders.fill).toContain("0, 0, 255");
    expect(adaptiveHeaders.opacity).toBe("0.40");

    await getWatermarkControl(page, "Mode").selectOption("manual");
    await getWatermarkControl(page, "Watermark text").fill("ONE");
    await getWatermarkControl(page, "Watermark text").fill("TWO");

    const previewRequests: WatermarkDebugHeaders[] = [];
    const rapidHeaders = await waitForAppearancePreview(
      page,
      async () => {
        await getWatermarkControl(page, "Watermark text").fill("FINAL RAPID");
        await setSliderDirect(page, "Opacity", 33);
        await setSliderDirect(page, "Rotation", -12);
      },
      previewRequests,
      (headers) =>
        headers.text === "FINAL RAPID" &&
        headers.font === "trebuchet_ms" &&
        headers.opacity === "0.33" &&
        headers.rotation === "-12" &&
        headers.repeat === "true" &&
        headers.enabled === "true" &&
        headers.fill?.includes("0, 0, 255") === true,
    );

    expect(previewRequests.length).toBeGreaterThan(0);
    expect(rapidHeaders.text).toBe("FINAL RAPID");
    expect(rapidHeaders.opacity).toBe("0.33");
    expect(rapidHeaders.rotation).toBe("-12");

    await runtime.assertHealthy();
  });

  test("regeneration stays explicit and requires saved appearance settings", async ({
    page,
  }) => {
    const runtime = monitorPageRuntime(page);

    await page.goto("/admin/appearance");
    await expect(
      page.getByRole("heading", { level: 1, name: "Appearance" }),
    ).toBeVisible();

    const regenerateButton = page.getByRole("button", {
      name: "Apply watermark to existing previews",
    });

    await expect(regenerateButton).toBeVisible();
    await expect(regenerateButton).toBeEnabled();

    await regenerateButton.click();

    await expect(
      page.getByRole("alertdialog", {
        name: "Apply watermark to existing previews?",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Regenerate previews" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("alertdialog", {
        name: "Apply watermark to existing previews?",
      }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/appearance$/);

    await page.getByLabel("Watermark text").fill("UNSAVED REGEN CHECK");

    await expect(regenerateButton).toBeDisabled();
    await expect(
      page.getByText("Save appearance first.", { exact: true }),
    ).toBeVisible();

    await runtime.assertHealthy();
  });

  test("saved settings persist, restore cleanly, and product image preview uses saved settings", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    const runtime = monitorPageRuntime(page);
    const fixtureImageBytes = await readFile(FIXTURE_IMAGE_PATH);
    const stepTimings: Array<{ step: string; startedAt: number; completedAt: number }> = [];
    const recordStep = async <T>(name: string, action: () => Promise<T>) => {
      const startedAt = Date.now();
      try {
        return await test.step(name, action);
      } finally {
        stepTimings.push({
          step: name,
          startedAt,
          completedAt: Date.now(),
        });
      }
    };

    await recordStep("open appearance", async () => {
      await page.goto("/admin/appearance");
      await expect(
        page.getByRole("heading", { level: 1, name: "Appearance" }),
      ).toBeVisible();
    });

    const { originalValues, originalPreviewSrc } = await recordStep(
      "capture original appearance values",
      async () => ({
        originalValues: await getWatermarkValues(page),
        originalPreviewSrc: await getAppearancePreviewImage(page).getAttribute("src"),
      }),
    );
    const temporaryText =
      originalValues.text === E2E_WATERMARK_TEXT_PRIMARY
        ? E2E_WATERMARK_TEXT_ALTERNATE
        : E2E_WATERMARK_TEXT_PRIMARY;
    const temporaryValues: WatermarkValues = {
      ...originalValues,
      text: temporaryText,
      mode: "manual",
      font: "georgia",
      manualColor: "#8F655C",
      lightColor: "#FF0000",
      darkColor: "#0000FF",
      opacity: 20,
      rotation: -30,
      repeat: true,
    };

    let secondaryPage: Page | null = null;
    let secondaryRuntime: ReturnType<typeof monitorPageRuntime> | null = null;
    let interceptedProductPreviewRequests = 0;
    const productOriginalRequests: string[] = [];

    try {
      await recordStep("apply temporary watermark values", async () => {
        await applyWatermarkValues(page, temporaryValues);
        await expect(getWatermarkControl(page, "Watermark text")).toHaveValue(
          temporaryText,
        );
        expect(temporaryText).not.toBe(originalValues.text);
        await expect(page.getByRole("button", { name: "Save appearance" })).toBeEnabled();
      });

      await recordStep("save temporary values", async () => {
        await saveAppearance(page);
      });

      await recordStep("reload and verify persistence", async () => {
        await page.reload();
      });

      const persistedValues = await recordStep(
        "read persisted watermark values",
        async () => getWatermarkValues(page),
      );
      expect(persistedValues).toEqual(temporaryValues);

      const draftHeaders = await recordStep(
        "apply unsaved draft values and wait for final draft preview",
        async () =>
          waitForAppearancePreview(
            page,
            async () => {
              await applyWatermarkValues(page, unsavedDraftConfig);
            },
            undefined,
            (headers) =>
              headers.text === unsavedDraftConfig.text &&
              headers.font === unsavedDraftConfig.font &&
              headers.opacity === (unsavedDraftConfig.opacity / 100).toFixed(2) &&
              headers.rotation === String(unsavedDraftConfig.rotation) &&
              headers.repeat === String(unsavedDraftConfig.repeat) &&
              headers.enabled === "true" &&
              headers.fill?.includes(hexColorToRgbFragment(unsavedDraftConfig.manualColor)) ===
                true,
          ),
      );
      expect(draftHeaders.text).toBe(unsavedDraftConfig.text);
      expect(draftHeaders.fill).toContain("0, 170, 0");

      secondaryPage = await recordStep("open secondary authenticated page", async () =>
        browser.newPage({ storageState: await page.context().storageState() }),
      );
      secondaryRuntime = monitorPageRuntime(secondaryPage);

      if (!secondaryPage) {
        throw new Error("Expected an authenticated secondary page for product preview checks.");
      }

      const productPage = secondaryPage;
      await productPage.route(
        /^https:\/\/yjsljyuhluwelrcaqbwn\.supabase\.co\/storage\/v1\/object\/public\/product-previews\//,
        async (route) => {
          const request = route.request();

          if (
            request.method() === "GET" &&
            request.resourceType() === "image" &&
            request.url().startsWith(PRODUCT_PREVIEWS_PUBLIC_URL_PREFIX)
          ) {
            interceptedProductPreviewRequests += 1;
            await route.fulfill({
              status: 200,
              contentType: "image/png",
              body: fixtureImageBytes,
            });
            return;
          }

          await route.continue();
        },
      );
      productPage.on("request", (request) => {
        if (request.url().includes(PRODUCT_ORIGINALS_PATH_SEGMENT)) {
          productOriginalRequests.push(request.url());
        }
      });

      const productRuntime = await recordStep("open product editor", async () =>
        openProductEditPage(productPage, "Modern Thank You Card"),
      );
      const productHeaders = await waitForWatermarkPreviewResponse(
        productPage,
        async () => {
          await recordStep("select fixture image", async () => {
            await productPage
              .getByLabel("Upload images")
              .setInputFiles(FIXTURE_IMAGE_PATH);
          });
        },
        async () =>
          recordStep("wait for protected preview", async () => {
          await expect(
            productPage.getByText("Original selected", { exact: true }),
          ).toBeVisible();
          await expect(
            productPage.getByText("Protected preview", { exact: true }),
          ).toBeVisible();
          await expect(
            productPage.getByAltText(/protected preview$/i),
          ).toBeVisible();
          }),
      );

      await recordStep("verify saved settings in product preview", async () => {
        expect(productHeaders.text).toBe(temporaryValues.text);
        expect(productHeaders.font).toBe(temporaryValues.font);
        expect(productHeaders.tone).toBe("manual");
        expect(productHeaders.opacity).toBe((temporaryValues.opacity / 100).toFixed(2));
        expect(productHeaders.rotation).toBe(String(temporaryValues.rotation));
        expect(productHeaders.repeat).toBe(String(temporaryValues.repeat));
        expect(productHeaders.fill).toContain(hexColorToRgbFragment(temporaryValues.manualColor));

        const protectedPreviewImage = productPage.getByAltText(/protected preview$/i);
        await expect(protectedPreviewImage).toBeVisible();

        await expect(
          productPage.getByText("Temporary preview", { exact: true }),
        ).toBeVisible();
        expect(interceptedProductPreviewRequests).toBeGreaterThan(0);
        expect(productOriginalRequests).toEqual([]);
      });

      await productRuntime.assertHealthy();
      await secondaryRuntime.assertHealthy();
    } finally {
      if (secondaryPage) {
        await secondaryPage.unroute(
          /^https:\/\/yjsljyuhluwelrcaqbwn\.supabase\.co\/storage\/v1\/object\/public\/product-previews\//,
        );
        await secondaryPage.close();
      }

      if (page.isClosed()) {
        console.warn(
          "Cleanup skipped because the Playwright page was already closed before restoreAppearanceValues could run.",
          {
            stepTimings,
          },
        );
      } else {
        await recordStep("restore original values", async () => {
          await restoreAppearanceValues(page, originalValues, originalPreviewSrc);
        });
      }
    }

    await runtime.assertHealthy();
  });
});

async function openProductEditPage(page: Page, productName: string) {
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();

  const productActions = getProductActions(page, productName);

  await expect(productActions.editButton).toHaveCount(1);
  await productActions.editButton.click();
  await expect(
    page.getByRole("alertdialog", { name: "Edit this product?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to edit" }).click();

  await expect(page).toHaveURL(/\/admin\/products\/.+\/edit(?:\?.*)?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Edit product" })).toBeVisible();

  return monitorPageRuntime(page);
}

function getProductActions(page: Page, productName: string) {
  const escapedProductName = productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const productNameText = page.locator("p:visible").filter({
    hasText: new RegExp(`^${escapedProductName}$`),
  });

  return {
    editButton: productNameText.locator(
      'xpath=following::button[normalize-space()="Edit"][1]',
    ),
  };
}

function getAppearancePreviewImage(page: Page) {
  return page.getByAltText("Temporary watermark preview");
}

function getWatermarkSection(page: Page) {
  return page
    .getByRole("heading", { level: 2, name: "Watermark" })
    .locator("xpath=ancestor::section[1]");
}

function getWatermarkControl(page: Page, label: string) {
  return getWatermarkSection(page).getByLabel(label, { exact: true });
}

async function waitForAppearancePreview(
  page: Page,
  action: () => Promise<void>,
  requestLog?: WatermarkDebugHeaders[],
  matchesHeaders?: (headers: WatermarkDebugHeaders) => boolean,
) {
  const previewImage = getAppearancePreviewImage(page);
  await expect(previewImage).toBeVisible();
  await expect.poll(async () => previewImage.getAttribute("src")).not.toBeNull();

  return waitForWatermarkPreviewResponse(page, action, async () => {
    await expect(previewImage).toBeVisible();
    await expect
      .poll(async () => {
        return previewImage.evaluate((image) => ({
          src: image.getAttribute("src"),
          naturalWidth: (image as HTMLImageElement).naturalWidth,
          naturalHeight: (image as HTMLImageElement).naturalHeight,
        }));
      })
      .toMatchObject({
        src: expect.any(String),
        naturalWidth: expect.any(Number),
        naturalHeight: expect.any(Number),
      });
    const loadedImage = await previewImage.evaluate((image) => ({
      naturalWidth: (image as HTMLImageElement).naturalWidth,
      naturalHeight: (image as HTMLImageElement).naturalHeight,
    }));
    expect(loadedImage.naturalWidth).toBeGreaterThan(0);
    expect(loadedImage.naturalHeight).toBeGreaterThan(0);
  }, requestLog, matchesHeaders);
}

async function waitForWatermarkPreviewResponse(
  page: Page,
  action: () => Promise<void>,
  afterResponse?: () => Promise<void>,
  requestLog?: WatermarkDebugHeaders[],
  matchesHeaders?: (headers: WatermarkDebugHeaders) => boolean,
) {
  const responsePromise = page.waitForResponse(
    (response) => {
      if (
        !response.url().includes(WATERMARK_PREVIEW_PATH) ||
        response.request().method() !== "POST" ||
        response.status() !== 200
      ) {
        return false;
      }

      if (!matchesHeaders) {
        return true;
      }

      return matchesHeaders(readWatermarkDebugHeaders(response));
    },
  );

  await action();
  const response = await responsePromise;
  const headers = readWatermarkDebugHeaders(response);

  requestLog?.push(headers);

  if (afterResponse) {
    await afterResponse();
  }

  return headers;
}

function readWatermarkDebugHeaders(response: { headers(): Record<string, string>; status(): number }) {
  const headers = response.headers();

  return {
    status: response.status(),
    text: decodeURIComponent(headers["x-watermark-text"] ?? ""),
    font: headers["x-watermark-font"] ?? null,
    opacity: headers["x-watermark-opacity"] ?? null,
    rotation: headers["x-watermark-rotation"] ?? null,
    repeat: headers["x-watermark-repeat"] ?? null,
    enabled: headers["x-watermark-enabled"] ?? null,
    tone: headers["x-watermark-tone"] ?? null,
    fill: headers["x-watermark-fill"] ?? null,
  } satisfies WatermarkDebugHeaders;
}

async function getWatermarkValues(page: Page): Promise<WatermarkValues> {
  return {
    text: await getWatermarkControl(page, "Watermark text").inputValue(),
    mode: await getWatermarkControl(page, "Mode").inputValue(),
    font: await getWatermarkControl(page, "Font").inputValue(),
    manualColor: await getWatermarkControl(page, "Manual color hex value").inputValue(),
    lightColor: await getWatermarkControl(
      page,
      "Light watermark color hex value",
    ).inputValue(),
    darkColor: await getWatermarkControl(
      page,
      "Dark watermark color hex value",
    ).inputValue(),
    opacity: Number(await getWatermarkControl(page, "Opacity").inputValue()),
    rotation: Number(await getWatermarkControl(page, "Rotation").inputValue()),
    size: Number(await getWatermarkControl(page, "Size").inputValue()),
    spacingX: Number(await getWatermarkControl(page, "Horizontal spacing").inputValue()),
    spacingY: Number(await getWatermarkControl(page, "Vertical spacing").inputValue()),
    enabled: await isChecked(page.getByRole("checkbox", { name: "Enable watermark" })),
    repeat: await isChecked(
      page.getByRole("checkbox", { name: "Repeat watermark across the image" }),
    ),
  };
}

async function applyWatermarkValues(
  page: Page,
  values: Partial<WatermarkValues> & Pick<WatermarkValues, "text" | "mode" | "font">,
) {
  await getWatermarkControl(page, "Watermark text").fill(values.text);
  await getWatermarkControl(page, "Mode").selectOption(values.mode);
  await getWatermarkControl(page, "Font").selectOption(values.font);

  if (values.manualColor) {
    await getWatermarkControl(page, "Manual color hex value").fill(values.manualColor);
  }

  if (values.lightColor) {
    await getWatermarkControl(page, "Light watermark color hex value").fill(
      values.lightColor,
    );
  }

  if (values.darkColor) {
    await getWatermarkControl(page, "Dark watermark color hex value").fill(
      values.darkColor,
    );
  }

  if (typeof values.opacity === "number") {
    await setSlider(page, "Opacity", values.opacity);
  }

  if (typeof values.rotation === "number") {
    await setSlider(page, "Rotation", values.rotation);
  }

  if (typeof values.size === "number") {
    await setSlider(page, "Size", values.size);
  }

  if (typeof values.spacingX === "number") {
    await setSlider(page, "Horizontal spacing", values.spacingX);
  }

  if (typeof values.spacingY === "number") {
    await setSlider(page, "Vertical spacing", values.spacingY);
  }

  if (typeof values.enabled === "boolean") {
    await setCheckbox(page, "Enable watermark", values.enabled);
  }

  if (typeof values.repeat === "boolean") {
    await setCheckbox(page, "Repeat watermark across the image", values.repeat);
  }
}

async function restoreAppearanceValues(
  page: Page,
  originalValues: WatermarkValues,
  originalPreviewSrc: string | null,
) {
  const startingUrl = page.url();
  const dialogCount = await page.getByRole("alertdialog").count();
  console.warn("restoreAppearanceValues starting", {
    url: startingUrl,
    isClosed: page.isClosed(),
    alertDialogOpen: dialogCount > 0,
  });

  await page.goto("/admin/appearance");
  await expect(page).toHaveURL(/\/admin\/appearance(?:\?.*)?$/);
  await expect(page).not.toHaveURL(/\/auth\/login(?:\?.*)?$/);

  await expect(
    page.getByRole("heading", { level: 1, name: "Appearance" }),
  ).toBeVisible();

  await applyWatermarkValues(page, originalValues);

  const saveButton = page.getByRole("button", { name: "Save appearance" });

  if (await saveButton.isEnabled()) {
    await saveAppearance(page);
  } else {
    const currentValues = await getWatermarkValues(page);
    expect(currentValues).toEqual(originalValues);
    await expect(getWatermarkErrorMessages(page)).toHaveCount(0);
  }

  await page.reload();

  const restoredValues = await getWatermarkValues(page);
  expect(restoredValues).toEqual(originalValues);
  await expect(getWatermarkErrorMessages(page)).toHaveCount(0);

  if (originalPreviewSrc) {
    await expect
      .poll(async () => getAppearancePreviewImage(page).getAttribute("src"))
      .not.toBeNull();
  }
}

function getWatermarkErrorMessages(page: Page) {
  return page.getByText(
    /Watermark text is required when watermarking is enabled\.|Choose an approved watermark font\.|Choose a supported watermark mode\.|Use a valid 6-digit hex color\./,
  );
}

function hexColorToRgbFragment(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

async function setSlider(page: Page, label: string, value: number) {
  const slider = getWatermarkControl(page, label);
  const currentValue = Number(await slider.inputValue());
  const stepValue = Number((await slider.getAttribute("step")) ?? "1");
  const step = Number.isFinite(stepValue) && stepValue > 0 ? stepValue : 1;
  const delta = value - currentValue;

  if (delta === 0) {
    return;
  }

  const directionKey = delta > 0 ? "ArrowRight" : "ArrowLeft";
  const presses = Math.round(Math.abs(delta) / step);

  await slider.focus();

  for (let index = 0; index < presses; index += 1) {
    await slider.press(directionKey);
  }

  await expect(slider).toHaveValue(String(value));
}

async function setSliderDirect(page: Page, label: string, value: number) {
  const slider = getWatermarkControl(page, label);

  await slider.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;

    valueSetter?.call(input, String(nextValue));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);

  await expect(slider).toHaveValue(String(value));
}

async function setCheckbox(page: Page, name: string, checked: boolean) {
  const checkbox = page.getByRole("checkbox", { name });

  if ((await isChecked(checkbox)) !== checked) {
    await checkbox.click();
  }
}

async function isChecked(locator: Locator) {
  return (await locator.getAttribute("data-state")) === "checked";
}

async function saveAppearance(page: Page) {
  const saveButton = page.getByRole("button", { name: "Save appearance" });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  const confirmationDialog = page.getByRole("alertdialog", {
    name: "Save appearance changes?",
  });
  await expect(confirmationDialog).toBeVisible();
  await confirmationDialog.getByRole("button", { name: "Save appearance" }).click();

  await expect(
    page.getByText("Appearance settings saved successfully.", { exact: false }),
  ).toBeVisible();
  await expect(saveButton).toBeDisabled();
}
