import { expect, type Page } from "@playwright/test";

const IGNORED_CONSOLE_ERROR_PATTERNS = [
  /favicon/i,
  /encountered uncached data in `generateMetadata\(\)`/i,
  /blocking-prerender-metadata-dynamic/i,
];

export function monitorPageRuntime(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();

    if (IGNORED_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text))) {
      return;
    }

    consoleErrors.push(text);
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return {
    async assertHealthy() {
      expect.soft(consoleErrors, "Unexpected console errors").toEqual([]);
      expect.soft(pageErrors, "Unexpected page errors").toEqual([]);
    },
  };
}

export async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });

  expect(hasOverflow).toBe(false);
}
