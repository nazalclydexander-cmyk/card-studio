import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";

import { monitorPageRuntime } from "./helpers/runtime";
import {
  getPlaywrightBaseUrl,
  isLocalhostUrl,
  shouldStartLocalWebServer,
} from "./helpers/safety";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const BASE_URL = getPlaywrightBaseUrl();
const BASE_ORIGIN = new URL(BASE_URL).origin;
const DUMMY_TURNSTILE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const E2E_INQUIRY_IP_LIMIT = Number(
  process.env.CUSTOMER_INQUIRY_IP_LIMIT?.trim()
  || (shouldStartLocalWebServer(BASE_URL) ? "2" : "3"),
);
const INQUIRY_TESTS_ENABLED = shouldStartLocalWebServer(BASE_URL)
  ? Boolean(SUPABASE_SERVICE_ROLE_KEY)
  : false;

function createInquiryPayload(overrides: Partial<Record<string, string>> = {}) {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  return {
    product_slug: "",
    customer_name: "E2E Security Test",
    email: `security-${uniqueSuffix}@example.com`,
    phone: "+63 917 555 0000",
    event_date: "2027-01-18",
    quantity: "100",
    message: `Inquiry security coverage ${uniqueSuffix}`,
    submitter_timezone: "Asia/Manila",
    submitter_utc_offset_minutes: "480",
    company_name: "",
    "cf-turnstile-response": DUMMY_TURNSTILE_TOKEN,
    ...overrides,
  };
}

async function cleanupInquiriesByEmail(email: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  await supabase.from("customer_inquiries").delete().eq("email", email);
}

function createInquiryRequestOptions(
  payload: Record<string, string>,
  testIp?: string,
) {
  const headers: Record<string, string> = {
    Origin: BASE_ORIGIN,
  };

  if (isLocalhostUrl(BASE_URL) && testIp) {
    headers["X-Forwarded-For"] = testIp;
  }

  return {
    multipart: payload,
    headers,
  };
}

function createSyntheticTestIp() {
  const octets = randomBytes(3);

  return `10.${octets[0]}.${octets[1]}.${Math.max(1, octets[2])}`;
}

test.describe("security hardening", () => {
  test("security headers are present on public pages", async ({ request }) => {
    const response = await request.get("/contact");

    expect(response.ok()).toBe(true);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers()["permissions-policy"]).toContain("camera=()");
    expect(response.headers()["content-security-policy-report-only"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  test("public Supabase access cannot read customer inquiries", async ({ request }) => {
    test.skip(
      !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY,
      "Supabase public environment variables are required for the RLS verification test.",
    );

    try {
      const response = await request.get(
        `${SUPABASE_URL}/rest/v1/customer_inquiries?select=id&limit=1`,
        {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
        },
      );

      expect([401, 403]).toContain(response.status());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      test.skip(
        /connect EACCES/i.test(message),
        "Direct remote Supabase RLS verification is blocked by this test runner's outbound network policy.",
      );

      throw error;
    }
  });

  test("public product pages do not request private originals", async ({ page }) => {
    const runtime = monitorPageRuntime(page);
    const requests: string[] = [];

    page.on("request", (request) => {
      requests.push(request.url());
    });

    await page.goto("/products");

    const firstProductLink = page.locator("article").first().getByRole("link").first();

    if ((await page.locator("article").count()) === 0) {
      await expect(
        page.getByText(
          /no matching designs yet|catalog temporarily unavailable|we couldn't load the collection right now/i,
        ).first(),
      ).toBeVisible();
      return;
    }

    await Promise.all([
      page.waitForURL(/\/products\/[^/?#]+$/),
      firstProductLink.click(),
    ]);

    expect(
      requests.some((url) => url.includes("product-originals")),
      "Storefront should never request private original image objects.",
    ).toBe(false);

    await runtime.assertHealthy();
  });

  test.describe("public inquiry protections", () => {
    test.skip(
      !INQUIRY_TESTS_ENABLED,
      "Local protected inquiry tests require SUPABASE_SERVICE_ROLE_KEY with Playwright's local web server.",
    );

    test("legitimate inquiry succeeds", async ({ request }) => {
      const payload = createInquiryPayload();
      const testIp = createSyntheticTestIp();

      try {
        const response = await request.post("/api/public/inquiries", {
          ...createInquiryRequestOptions(payload, testIp),
        });

        const status = response.status();
        const contentType = response.headers()["content-type"] || "";
        const bodyText = await response.text();

        expect(
          {
            status,
            contentType,
            bodyText,
          },
          "Expected a successful JSON inquiry response.",
        ).toMatchObject({
          status: 200,
        });

        const body = JSON.parse(bodyText) as {
          success?: boolean;
          redirectUrl?: string;
        };

        expect(body.success).toBe(true);
        expect(body.redirectUrl).toContain("/contact?submitted=1");
      } finally {
        await cleanupInquiriesByEmail(payload.email);
      }
    });

    test("malformed inquiry is rejected", async ({ request }) => {
      const payload = createInquiryPayload({
        customer_name: "",
        message: "short",
      });
      const testIp = createSyntheticTestIp();

      const response = await request.post("/api/public/inquiries", {
        ...createInquiryRequestOptions(payload, testIp),
      });
      const body = await response.json();

      expect(response.status()).toBe(400);
      expect(body.success).toBe(false);
      expect(body.fieldErrors.customer_name).toBeTruthy();
      expect(body.fieldErrors.message).toBeTruthy();
    });

    test("oversized message is rejected", async ({ request }) => {
      const payload = createInquiryPayload({
        message: "A".repeat(2001),
      });
      const testIp = createSyntheticTestIp();

      const response = await request.post("/api/public/inquiries", {
        ...createInquiryRequestOptions(payload, testIp),
      });
      const body = await response.json();

      expect(response.status()).toBe(400);
      expect(body.success).toBe(false);
      expect(body.fieldErrors.message).toMatch(/2000 characters or fewer/i);
    });

    test("honeypot submission is silently accepted without persisting an inquiry", async ({
      request,
    }) => {
      const payload = createInquiryPayload({
        company_name: "bot-filled",
      });
      const testIp = createSyntheticTestIp();

      try {
        const response = await request.post("/api/public/inquiries", {
          ...createInquiryRequestOptions(payload, testIp),
        });
        const body = await response.json();

        expect(response.status()).toBe(200);
        expect(body.success).toBe(true);
      } finally {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
          },
        });
        const { data } = await supabase
          .from("customer_inquiries")
          .select("id")
          .eq("email", payload.email);

        expect(data ?? []).toHaveLength(0);
      }
    });

    test("invalid Turnstile token is rejected", async ({ request }) => {
      const payload = createInquiryPayload({
        "cf-turnstile-response": "invalid-token",
      });
      const testIp = createSyntheticTestIp();

      const response = await request.post("/api/public/inquiries", {
        ...createInquiryRequestOptions(payload, testIp),
      });
      const body = await response.json();

      expect(response.status()).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toMatch(/couldn't verify the submission/i);
    });

    test("rate limit triggers after the configured threshold", async ({ request }) => {
      const payload = createInquiryPayload({
        email: `rate-limit-${Date.now()}@example.com`,
      });
      const testIp = createSyntheticTestIp();

      try {
        for (let attempt = 1; attempt <= E2E_INQUIRY_IP_LIMIT; attempt += 1) {
          const response = await request.post("/api/public/inquiries", {
            ...createInquiryRequestOptions({
              ...payload,
              message: `${payload.message} attempt ${attempt}`,
            }, testIp),
          });

          expect(response.status()).toBe(200);
        }

        const blockedResponse = await request.post("/api/public/inquiries", {
          ...createInquiryRequestOptions({
            ...payload,
            message: `${payload.message} attempt blocked`,
          }, testIp),
        });
        const blockedBody = await blockedResponse.json();

        expect(blockedResponse.status()).toBe(429);
        expect(blockedBody.success).toBe(false);
        expect(blockedResponse.headers()["retry-after"]).toBeTruthy();
      } finally {
        await cleanupInquiriesByEmail(payload.email);
      }
    });

    test("duplicate inquiry submissions are rejected", async ({ request }) => {
      const payload = createInquiryPayload();
      const testIp = createSyntheticTestIp();

      try {
        const firstResponse = await request.post("/api/public/inquiries", {
          ...createInquiryRequestOptions(payload, testIp),
        });

        expect(firstResponse.status()).toBe(200);

        const duplicateResponse = await request.post("/api/public/inquiries", {
          ...createInquiryRequestOptions(payload, testIp),
        });
        const duplicateBody = await duplicateResponse.json();

        expect(duplicateResponse.status()).toBe(429);
        expect(duplicateBody.success).toBe(false);
        expect(duplicateResponse.headers()["retry-after"]).toBeTruthy();
      } finally {
        await cleanupInquiriesByEmail(payload.email);
      }
    });
  });
});
