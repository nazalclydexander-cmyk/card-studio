import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

import {
  adminStorageStatePath,
  demoManifestPath,
  demoProducts,
  ensureSafeDemoSeedTarget,
  getDemoSeedBaseUrl,
  getVariantAbsolutePath,
  getVariantAltText,
  loadLocalEnv,
  readDemoManifest,
} from "./demo-product-catalog.mjs";
import { generateDemoProductImages } from "./generate-demo-product-images.mjs";

const uploadConfirmationTimeoutMs = 20_000;
const imageCountPollIntervalMs = 250;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRequestedDemoProductName() {
  return process.env.DEMO_SEED_PRODUCT?.trim() || "";
}

function getTargetDemoProducts() {
  const requestedName = getRequestedDemoProductName();

  if (!requestedName) {
    return demoProducts;
  }

  const matchingProduct = demoProducts.find((product) => product.name === requestedName);

  if (!matchingProduct) {
    throw new Error(
      `DEMO_SEED_PRODUCT did not match any curated demo product: ${requestedName}`,
    );
  }

  return [matchingProduct];
}

async function assertServerReachable(baseUrl) {
  try {
    const response = await fetch(baseUrl, { redirect: "manual" });

    if (response.status >= 500) {
      throw new Error(`Received HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Card Studio is not reachable at ${baseUrl}. Start npm run dev first. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function getAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL?.trim() || "";
  const password = process.env.E2E_ADMIN_PASSWORD?.trim() || "";

  return {
    email,
    password,
    configured: Boolean(email && password),
  };
}

async function authenticateAdmin(page, baseUrl) {
  const credentials = getAdminCredentials();

  if (credentials.configured) {
    await page.goto("/auth/login", { waitUntil: "networkidle" });
    await page.getByLabel(/email/i).fill(credentials.email);
    await page.getByLabel(/^password$/i).fill(credentials.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(`${baseUrl}/admin`);
    return "credentials";
  }

  throw new Error(
    "Missing E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD. Provide those credentials or pre-create a reusable authenticated storage state before seeding.",
  );
}

async function openAdminBrowser(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const credentials = getAdminCredentials();
  let storageStateFailure = null;

  if (!credentials.configured && fs.existsSync(adminStorageStatePath)) {
    const context = await browser.newContext({
      baseURL: baseUrl,
      storageState: adminStorageStatePath,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await page.goto("/admin", { waitUntil: "networkidle" });

    if (page.url().startsWith(`${baseUrl}/admin`)) {
      return { browser, context, page, authMode: "storage-state" };
    }

    storageStateFailure =
      "A stored admin browser session was found, but it is no longer valid for /admin.";

    await context.close();
  }

  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  try {
    const authMode = await authenticateAdmin(page, baseUrl);

    return { browser, context, page, authMode };
  } catch (error) {
    await context.close();
    await browser.close();
    const baseMessage =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      storageStateFailure ? `${storageStateFailure} ${baseMessage}` : baseMessage,
    );
  }
}

async function getProductRows(page) {
  await page.goto("/admin/products", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Products" }).waitFor();

  const rows = page.locator("table tbody tr");
  const rowCount = await rows.count();
  const products = [];

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    const name = (await row.locator("td p.font-medium").first().textContent())?.trim();
    const editHref = await row
      .getByRole("link", { name: "Edit" })
      .getAttribute("href");

    if (!name || !editHref) {
      continue;
    }

    products.push({
      name,
      editHref,
      id: editHref.split("/").at(-2) ?? "",
    });
  }

  return products;
}

function getProductImagesSection(page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: "Product images" }),
  });
}

async function getVisibleProductImageCards(page) {
  const section = getProductImagesSection(page);
  const cards = section.locator("article");
  const count = await cards.count();
  const images = [];

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const altText = ((await card.locator('input[name="alt_text"]').inputValue()).trim()) || null;
    const imageSrc = await card.locator("img").getAttribute("src");
    images.push({
      altText,
      imageSrc,
      index,
    });
  }

  return images;
}

function getExpectedProductImageAltTexts(product) {
  return product.variants.map((variant) => getVariantAltText(product, variant));
}

async function getProductImagesSectionText(page) {
  const section = getProductImagesSection(page);
  return ((await section.textContent()) ?? "").replace(/\s+/g, " ").trim();
}

async function getSafeLocalStorageKeys(page) {
  return page.evaluate(() =>
    Object.keys(window.localStorage).filter(
      (key) => key.toLowerCase().includes("supabase") || key.startsWith("sb-"),
    )
  );
}

async function runWithUploadDiagnostics(page, action) {
  const responses = [];
  const requestFailures = [];
  const handleResponse = (response) => {
    const url = response.url();

    if (
      url.includes("/storage/v1/") ||
      url.includes("/rest/v1/product_images") ||
      url.includes("/admin/products")
    ) {
      const request = response.request();
      responses.push(
        Promise.all([
          request.method(),
          request.allHeaders(),
          response.text().catch(() => ""),
        ]).then(([method, headers, bodyText]) => ({
          method,
          url: url.replace(/\?.*$/, ""),
          status: response.status(),
          statusText: response.statusText(),
          hasAuthorization: Boolean(headers.authorization),
          hasApiKey: Boolean(headers.apikey),
          contentType: headers["content-type"] ?? null,
          bodyText: bodyText
            .replace(/access_token=[^&\s"]+/gi, "access_token=[redacted]")
            .replace(/refresh_token=[^&\s"]+/gi, "refresh_token=[redacted]")
            .trim(),
        })),
      );
    }
  };
  const handleRequestFailed = (request) => {
    const url = request.url();

    if (
      url.includes("/storage/v1/") ||
      url.includes("/rest/v1/product_images") ||
      url.includes("/admin/products")
    ) {
      requestFailures.push({
        url: url.replace(/\?.*$/, ""),
        failureText: request.failure()?.errorText ?? "Unknown request failure",
      });
    }
  };

  page.on("response", handleResponse);
  page.on("requestfailed", handleRequestFailed);

  try {
    await action();
    return { responses: await Promise.all(responses), requestFailures };
  } finally {
    page.off("response", handleResponse);
    page.off("requestfailed", handleRequestFailed);
  }
}

async function waitForProductImageCount(page, expectedCount) {
  const section = getProductImagesSection(page);
  const cards = section.locator("article");
  const deadline = Date.now() + uploadConfirmationTimeoutMs;

  while (Date.now() < deadline) {
    const currentCount = await cards.count();

    if (currentCount >= expectedCount) {
      return currentCount;
    }

    await page.waitForTimeout(imageCountPollIntervalMs);
  }

  throw new Error(
    `timed out waiting for product image cards to reach ${expectedCount}.`,
  );
}

async function findExistingProduct(page, productName) {
  const products = await getProductRows(page);
  return products.find((product) => product.name === productName) ?? null;
}

async function setCheckboxState(page, labelText, checked) {
  const checkbox = page.locator("label").filter({
    has: page.getByText(new RegExp(`^${escapeRegExp(labelText)}$`, "i")),
  }).locator('[role="checkbox"]').first();
  await checkbox.waitFor();

  const isChecked = (await checkbox.getAttribute("data-state")) === "checked";

  if (isChecked !== checked) {
    await checkbox.click();
  }
}

async function createProduct(page, product) {
  await page.goto("/admin/products/new", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "New product" }).waitFor();

  await page.getByLabel("Name").fill(product.name);
  await page.getByLabel("Category").selectOption({ label: product.category });
  await page.getByLabel("Short description").fill(product.shortDescription);
  await page.getByLabel("Description", { exact: true }).fill(product.description);
  await page.getByLabel("Theme").fill(product.theme);
  await page.getByLabel("Orientation").selectOption(product.orientation);
  await page.getByLabel("Format").fill(product.format);
  await page.getByLabel("Starting price").fill(String(product.priceFrom));

  await setCheckboxState(page, "Customizable", product.customizable);
  await setCheckboxState(page, "Show price", product.showPrice);
  await setCheckboxState(page, "Featured", product.featured);
  await setCheckboxState(page, "Active", product.active);

  await page.getByRole("button", { name: "Create product" }).click();
  await page.waitForURL(/\/admin\/products\/.+\/edit\?created=1$/);

  return {
    id: page.url().match(/\/admin\/products\/([^/]+)\/edit/)?.[1] ?? "",
    editHref: new URL(page.url()).pathname,
  };
}

async function uploadProductImages(page, product, resultCollector, shouldUpload) {
  if (!shouldUpload) {
    return;
  }

  const fileInput = page.locator('input[type="file"]');
  for (const variant of product.variants) {
    const filePath = getVariantAbsolutePath(product, variant);
    const altText = getVariantAltText(product, variant);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Demo artwork file not found: ${filePath}`);
    }

    const fileStat = fs.statSync(filePath);

    if (!fileStat.isFile()) {
      throw new Error(`Demo artwork path is not a file: ${filePath}`);
    }

    const existingImages = await getVisibleProductImageCards(page);
    const alreadyUploaded = existingImages.some((image) => image.altText === altText);

    if (alreadyUploaded) {
      resultCollector.imagesReused.push({
        productName: product.name,
        altText,
        file: filePath,
      });
      continue;
    }

    const beforeCount = existingImages.length;

    let confirmationChecks;
    let uploadDiagnostics = { responses: [], requestFailures: [] };

    uploadDiagnostics = await runWithUploadDiagnostics(page, async () => {
      await fileInput.setInputFiles(filePath);
      await page.getByRole("button", { name: "Upload selected images" }).click();

      confirmationChecks = await Promise.allSettled([
        page
          .getByText(/uploaded .* image\(s\) successfully\./i)
          .waitFor({ timeout: uploadConfirmationTimeoutMs }),
        waitForProductImageCount(page, beforeCount + 1),
      ]);
    });

    const successMessageResult = confirmationChecks[0];
    const imageCountResult = confirmationChecks[1];

    if (
      successMessageResult.status === "rejected" &&
      imageCountResult.status === "rejected"
    ) {
      const currentImages = await getVisibleProductImageCards(page);
      const currentCount = currentImages.length;
      const sectionText = await getProductImagesSectionText(page);
      const localStorageKeys = await getSafeLocalStorageKeys(page);

      throw new Error(
        [
          "Image upload confirmation failed.",
          `Product: ${product.name}`,
          `File: ${filePath}`,
          "Expected one of:",
          "- upload success message to appear",
          `- product image count to increase from ${beforeCount} to ${beforeCount + 1}`,
          `Current visible product image count: ${currentCount}`,
          `Current URL: ${page.url()}`,
          `Supabase-related localStorage keys: ${
            localStorageKeys.length > 0 ? localStorageKeys.join(", ") : "(none)"
          }`,
          `Observed upload-related responses: ${
            uploadDiagnostics.responses.length > 0
              ? uploadDiagnostics.responses
                .map(
                  (response) =>
                    `${response.method} ${response.status} ${response.statusText} ${response.url} auth=${response.hasAuthorization} apikey=${response.hasApiKey} contentType=${response.contentType ?? "(none)"} body=${response.bodyText || "(empty)"}`,
                )
                .join(" | ")
              : "(none)"
          }`,
          `Observed upload-related request failures: ${
            uploadDiagnostics.requestFailures.length > 0
              ? uploadDiagnostics.requestFailures
                .map((failure) => `${failure.failureText} ${failure.url}`)
                .join(" | ")
              : "(none)"
          }`,
          `Current Product Images section text: ${sectionText || "(empty)"}`,
          `Success message wait failed: ${
            successMessageResult.reason instanceof Error
              ? successMessageResult.reason.message
              : String(successMessageResult.reason)
          }`,
          `Image count wait failed: ${
            imageCountResult.reason instanceof Error
              ? imageCountResult.reason.message
              : String(imageCountResult.reason)
          }`,
        ].join("\n"),
      );
    }

    const imageArticles = getProductImagesSection(page).locator("article");
    const card = imageArticles.nth(beforeCount);
    await card.locator('input[name="alt_text"]').fill(altText);
    await card.locator('input[name="sort_order"]').fill(String(beforeCount));
    await card.getByRole("button", { name: "Save details" }).click();
    await page.getByText(/image details saved\./i).waitFor({
      timeout: uploadConfirmationTimeoutMs,
    });

    resultCollector.imagesUploaded.push({
      productName: product.name,
      altText,
      file: filePath,
    });
  }
}

async function verifySingleProduct(page, product) {
  const existingProduct = await findExistingProduct(page, product.name);

  if (!existingProduct) {
    throw new Error(`Seed verification failed: ${product.name} was not found in the admin product list.`);
  }

  await page.goto(`/products/${product.slug}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", {
    level: 1,
    name: product.name,
  }).waitFor();

  for (const altText of getExpectedProductImageAltTexts(product)) {
    await page.getByAltText(altText).first().waitFor();
  }

  const missingImageState = page.getByText(/no images available|image coming soon|no product images/i);

  if (await missingImageState.count() > 0) {
    throw new Error(`Seed verification failed: ${product.name} still shows a missing-image state on the public product page.`);
  }

  await page.getByRole("link", { name: "Request This Design" }).waitFor();
}

async function verifyFullCatalog(page, productsToSeed, resultCollector) {
  const productsRoute = "/products";

  await page.goto(productsRoute, { waitUntil: "networkidle" });
  await page.getByRole("heading", {
    name: /invitation and greeting card designs/i,
  }).waitFor();

  const adminProducts = await getProductRows(page);
  const duplicateNames = productsToSeed
    .filter((product) =>
      adminProducts.filter((adminProduct) => adminProduct.name === product.name).length > 1
    )
    .map((product) => product.name);

  if (duplicateNames.length > 0) {
    throw new Error(
      `Seed verification failed: duplicate product names were found in the admin product list: ${duplicateNames.join(", ")}`,
    );
  }

  await page.goto(productsRoute, { waitUntil: "networkidle" });
  await page.getByRole("heading", {
    name: /invitation and greeting card designs/i,
  }).waitFor();

  for (const product of productsToSeed) {
    await page.locator(`a[href="/products/${product.slug}"]`).first().waitFor();
  }

  const featuredCategory = productsToSeed.find((product) => product.category === "Wedding Invitations")?.category;

  if (featuredCategory) {
    await page.getByRole("link", { name: featuredCategory }).first().click();
    await page.waitForURL(/\/products\?category=/);
  }

  for (const product of productsToSeed.slice(0, Math.min(3, productsToSeed.length))) {
    await page.goto(`/products/${product.slug}`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("heading", {
      level: 1,
      name: product.name,
    }).waitFor();
    await page.getByRole("link", { name: "Request This Design" }).waitFor();

    const expectedAltTexts = getExpectedProductImageAltTexts(product);
    await page.getByAltText(expectedAltTexts[0]).first().waitFor();
  }

  resultCollector.catalogVerified = true;
}

async function verifyCatalogPages(page, productsToSeed, resultCollector) {
  if (productsToSeed.length === 1 && getRequestedDemoProductName()) {
    await verifySingleProduct(page, productsToSeed[0]);
    resultCollector.sampledProductDetails.push(productsToSeed[0].name);
    return;
  }

  await verifyFullCatalog(page, productsToSeed, resultCollector);

  for (const product of productsToSeed.slice(0, Math.min(3, productsToSeed.length))) {
    resultCollector.sampledProductDetails.push(product.name);
  }
}

export async function seedDemoProducts() {
  loadLocalEnv();

  const baseUrl = getDemoSeedBaseUrl();
  const productsToSeed = getTargetDemoProducts();
  ensureSafeDemoSeedTarget(baseUrl);
  await assertServerReachable(baseUrl);

  let manifest = readDemoManifest();

  if (
    !manifest?.imageCount ||
    !fs.existsSync(demoManifestPath) ||
    !manifest.assets?.every((asset) => fs.existsSync(asset.absolutePath))
  ) {
    manifest = await generateDemoProductImages();
  }

  if (!manifest.imageCount || !fs.existsSync(demoManifestPath)) {
    throw new Error("Image generation did not complete successfully.");
  }

  const { browser, context, page, authMode } = await openAdminBrowser(baseUrl);
  const results = {
    baseUrl,
    authMode,
    created: [],
    reusedProducts: [],
    updatedExistingElegantFloral: false,
    imagesUploaded: [],
    imagesReused: [],
    categoriesUsed: [...new Set(productsToSeed.map((product) => product.category))],
    featuredProducts: productsToSeed
      .filter((product) => product.featured)
      .map((product) => product.name),
    targetProducts: productsToSeed.map((product) => product.name),
    failures: 0,
    catalogVerified: false,
    sampledProductDetails: [],
    productSummaries: [],
  };

  try {
    await page.goto("/admin", { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: "Admin Dashboard" }).waitFor();

    for (const product of productsToSeed) {
      const existing = await findExistingProduct(page, product.name);
      let editPath = existing?.editHref ?? null;
      let created = false;

      if (!existing) {
        const createdProduct = await createProduct(page, product);
        editPath = createdProduct.editHref;
        created = true;
        results.created.push(product.name);
      } else {
        results.reusedProducts.push(product.name);
      }

      if (!editPath) {
        throw new Error(`Could not resolve edit path for ${product.name}.`);
      }

      await page.goto(editPath, { waitUntil: "networkidle" });
      await page.getByRole("heading", { level: 1, name: "Edit product" }).waitFor();

      const hasNoImages = (await page.getByText(new RegExp(`No images uploaded yet for ${escapeRegExp(product.name)}`, "i")).count()) > 0;
      const existingImages = await getVisibleProductImageCards(page);
      const expectedAltTexts = getExpectedProductImageAltTexts(product);
      const hasMissingDemoImages = product.variants.some((variant) => {
        const altText = getVariantAltText(product, variant);
        return !existingImages.some((image) => image.altText === altText);
      });

      if (created || hasNoImages || hasMissingDemoImages) {
        await uploadProductImages(page, product, results, true);

        if (!created && product.name === "Elegant Floral Wedding Invitation") {
          results.updatedExistingElegantFloral = true;
        }
      } else {
        for (const altText of expectedAltTexts) {
          results.imagesReused.push({
            productName: product.name,
            altText,
            file: null,
          });
        }
      }

      const finalImages = await getVisibleProductImageCards(page);
      results.productSummaries.push({
        name: product.name,
        status: created ? "created" : "reused",
        imageCount: finalImages.length,
        featured: product.featured,
      });
    }

    await verifyCatalogPages(page, productsToSeed, results);
  } finally {
    await context.close();
    await browser.close();
  }

  return results;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemoProducts()
    .then((results) => {
      console.log("Demo catalog seed complete");
      console.log(`Products created: ${results.created.length}`);
      console.log(`Products reused: ${results.reusedProducts.length}`);
      console.log(`Images uploaded: ${results.imagesUploaded.length}`);
      console.log(`Images reused: ${results.imagesReused.length}`);
      console.log(`Failures: ${results.failures}`);
      for (const product of results.productSummaries) {
        console.log(`- ${product.name}: ${product.status}, images=${product.imageCount}, featured=${product.featured ? "yes" : "no"}`);
      }
      console.log(JSON.stringify(results, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
