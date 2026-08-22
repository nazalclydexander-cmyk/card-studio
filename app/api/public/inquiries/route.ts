import { NextResponse, type NextRequest } from "next/server";

import {
  buildNormalizedInquiryFingerprintSource,
  getCustomerInquiryFormValues,
  validateCustomerInquiryFormValues,
} from "@/lib/customer-inquiries";
import { getPublicProductBySlug } from "@/lib/public-catalog";
import { getTrustedClientIp, createIdentifierHash, isTrustedMutationOrigin } from "@/lib/request-security";
import { getInquirySecurityConfig, getRateLimitHashSecret } from "@/lib/security-config";
import { logSecurityEvent } from "@/lib/security-events";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile-server";

function createErrorResponse(
  status: number,
  message: string,
  init?: {
    retryAfterSeconds?: number;
    fieldErrors?: Record<string, string>;
  },
) {
  const headers = new Headers({
    "Cache-Control": "no-store",
  });

  if (init?.retryAfterSeconds) {
    headers.set("Retry-After", String(init.retryAfterSeconds));
  }

  return NextResponse.json(
    {
      success: false,
      message,
      fieldErrors: init?.fieldErrors ?? {},
    },
    {
      status,
      headers,
    },
  );
}

function createSuccessResponse(redirectUrl: string) {
  return NextResponse.json(
    {
      success: true,
      redirectUrl,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function createSuccessRedirectUrl(productSlug: string | null) {
  return productSlug
    ? `/contact?submitted=1&product=${encodeURIComponent(productSlug)}`
    : "/contact?submitted=1";
}

export async function POST(request: NextRequest) {
  try {
    const securityConfig = getInquirySecurityConfig();

    if (!isTrustedMutationOrigin(request.headers)) {
      logSecurityEvent("customer_inquiry_origin_rejected", {
        origin: request.headers.get("origin"),
      });

      return createErrorResponse(
        403,
        "We couldn't submit your inquiry right now. Please refresh the page and try again.",
      );
    }

    const contentLength = Number(request.headers.get("content-length") || "0");

    if (contentLength > securityConfig.maxRequestBodyBytes) {
      return createErrorResponse(413, "Your inquiry is too large to submit.");
    }

    const formData = await request.formData();
    const values = getCustomerInquiryFormValues(formData);
    const validation = validateCustomerInquiryFormValues(values);

    if (!validation.success) {
      return createErrorResponse(400, "Please fix the highlighted fields.", {
        fieldErrors: validation.fieldErrors,
      });
    }

    const { data } = validation;
    const successRedirectUrl = createSuccessRedirectUrl(data.productSlug);

    if (data.isSpam) {
      logSecurityEvent("customer_inquiry_honeypot_triggered", {
        productSlug: data.productSlug,
      });

      return createSuccessResponse(successRedirectUrl);
    }

    const clientIp = getTrustedClientIp(request.headers, {
      allowDevelopmentFallback: true,
    });

    if (!clientIp) {
      logSecurityEvent("customer_inquiry_ip_unavailable");

      return createErrorResponse(
        503,
        "We couldn't verify the submission. Please try again.",
      );
    }

    const turnstileResult = await verifyTurnstileToken({
      token: data.turnstileToken,
      ip: clientIp,
      hostname: request.nextUrl.hostname,
    });

    if (!turnstileResult.success) {
      logSecurityEvent("customer_inquiry_turnstile_failed", {
        reason: turnstileResult.reason,
      });

      return createErrorResponse(
        400,
        "We couldn't verify the submission. Please try again.",
        {
          fieldErrors: {
            turnstile_token:
              "We couldn't verify the submission. Please try again.",
          },
        },
      );
    }

    let productId: string | null = null;

    if (data.productSlug) {
      const product = await getPublicProductBySlug(data.productSlug);

      if (!product) {
        return createErrorResponse(400, "Please fix the highlighted fields.", {
          fieldErrors: {
            product_slug: "This product is no longer available for inquiries.",
          },
        });
      }

      productId = product.id;
    }

    const hashSecret = getRateLimitHashSecret({
      allowLocalFallback: true,
      hostname: request.nextUrl.hostname,
    });
    const ipIdentifierHash = createIdentifierHash(clientIp, hashSecret);
    const emailIdentifierHash = data.email
      ? createIdentifierHash(data.email, hashSecret)
      : null;
    const submissionFingerprintHash = createIdentifierHash(
      buildNormalizedInquiryFingerprintSource({
        email: data.email,
        phone: data.phone,
        message: data.message,
        productId,
        eventDate: data.eventDate,
      }),
      hashSecret,
    );

    const adminSupabase = createAdminClient();
    const { data: rpcResult, error } = await adminSupabase.rpc(
      "submit_customer_inquiry_secure",
      {
        p_customer_name: data.customerName,
        p_email: data.email,
        p_email_identifier_hash: emailIdentifierHash,
        p_email_limit: securityConfig.rateLimit.emailLimit,
        p_email_window_seconds: securityConfig.rateLimit.emailWindowSeconds,
        p_event_date: data.eventDate,
        p_ip_identifier_hash: ipIdentifierHash,
        p_ip_long_limit: securityConfig.rateLimit.ipLongLimit,
        p_ip_long_window_seconds: securityConfig.rateLimit.ipLongWindowSeconds,
        p_ip_short_limit: securityConfig.rateLimit.ipShortLimit,
        p_ip_short_window_seconds: securityConfig.rateLimit.ipShortWindowSeconds,
        p_message: data.message,
        p_phone: data.phone,
        p_product_id: productId,
        p_quantity: data.quantity,
        p_submission_fingerprint_hash: submissionFingerprintHash,
        p_duplicate_window_seconds: securityConfig.rateLimit.duplicateWindowSeconds,
        p_submitter_timezone: data.submitterTimezone,
        p_submitter_utc_offset_minutes: data.submitterUtcOffsetMinutes,
      },
    );

    if (error) {
      console.error("Failed to submit protected customer inquiry", {
        rpcErrorCode: error.code,
        rpcErrorMessage: error.message,
        rpcErrorDetails: error.details,
        rpcErrorHint: error.hint,
        supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      });

      return createErrorResponse(
        500,
        "We couldn't submit your inquiry right now. Please try again in a moment.",
      );
    }

    const result = rpcResult as
      | {
          ok?: boolean;
          error_code?: string;
          retry_after_seconds?: number;
        }
      | null;

    if (!result?.ok) {
      if (result?.error_code === "rate_limited") {
        const retryAfterSeconds = Math.max(1, result.retry_after_seconds ?? 60);

        logSecurityEvent("customer_inquiry_rate_limited", {
          retryAfterSeconds,
        });

        return createErrorResponse(
          429,
          "Too many requests. Please wait a little before trying again.",
          {
            retryAfterSeconds,
          },
        );
      }

      if (result?.error_code === "duplicate_inquiry") {
        const retryAfterSeconds = Math.max(1, result.retry_after_seconds ?? 600);

        logSecurityEvent("customer_inquiry_duplicate", {
          retryAfterSeconds,
        });

        return createErrorResponse(
          429,
          "Too many requests. Please wait a little before trying again.",
          {
            retryAfterSeconds,
          },
        );
      }

      return createErrorResponse(
        400,
        "We couldn't submit your inquiry right now. Please review the form and try again.",
      );
    }

    return createSuccessResponse(successRedirectUrl);
  } catch (error) {
    console.error("Unexpected customer inquiry submission failure", {
      error,
      hostname: request.nextUrl.hostname,
      supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });

    return createErrorResponse(
      500,
      "We couldn't submit your inquiry right now. Please try again in a moment.",
    );
  }
}
