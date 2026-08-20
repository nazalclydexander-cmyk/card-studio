"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CUSTOMER_INQUIRY_STATUS_OPTIONS,
  type CustomerInquiryStatus,
} from "@/lib/customer-inquiries";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function revalidateInquiryRoutes(inquiryId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export async function updateInquiryStatusAction(
  inquiryId: string,
  formData: FormData,
) {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    redirect("/admin/inquiries?denied=1");
  }

  const rawStatus =
    typeof formData.get("status") === "string" ? formData.get("status") : "";
  const status = rawStatus as CustomerInquiryStatus;

  if (!CUSTOMER_INQUIRY_STATUS_OPTIONS.includes(status)) {
    redirect(`/admin/inquiries/${inquiryId}?error=status`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_inquiries")
    .update({ status })
    .eq("id", inquiryId);

  if (error) {
    console.error("Failed to update inquiry status", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    redirect(`/admin/inquiries/${inquiryId}?error=save`);
  }

  revalidateInquiryRoutes(inquiryId);
  redirect(`/admin/inquiries/${inquiryId}?updated=1`);
}
