"use server";

import { redirect } from "next/navigation";

import {
  createInitialCustomerInquiryFormState,
  getCustomerInquiryFormValues,
  type CustomerInquiryFormState,
  validateCustomerInquiryFormValues,
} from "@/lib/customer-inquiries";
import { getPublicProductBySlug } from "@/lib/public-catalog";
import { createClient } from "@/lib/supabase/server";

export async function submitCustomerInquiryAction(
  _prevState: CustomerInquiryFormState,
  formData: FormData,
): Promise<CustomerInquiryFormState> {
  const values = getCustomerInquiryFormValues(formData);
  const validation = validateCustomerInquiryFormValues(values);

  if (!validation.success) {
    return {
      success: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: validation.fieldErrors,
      values: validation.values,
    };
  }

  const { data } = validation;

  if (data.isSpam) {
    const spamSuccessUrl = data.productSlug
      ? `/contact?submitted=1&product=${encodeURIComponent(data.productSlug)}`
      : "/contact?submitted=1";
    redirect(spamSuccessUrl);
  }

  let productId: string | null = null;

  if (data.productSlug) {
    const product = await getPublicProductBySlug(data.productSlug);
    productId = product?.id ?? null;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customer_inquiries").insert({
    product_id: productId,
    customer_name: data.customerName,
    email: data.email,
    phone: data.phone,
    event_date: data.eventDate,
    quantity: data.quantity,
    message: data.message,
  });

  if (error) {
    console.error("Failed to submit customer inquiry", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      ...createInitialCustomerInquiryFormState(values),
      message:
        "We couldn't submit your inquiry right now. Please try again in a moment.",
    };
  }

  const successUrl = data.productSlug
    ? `/contact?submitted=1&product=${encodeURIComponent(data.productSlug)}`
    : "/contact?submitted=1";

  redirect(successUrl);
}
