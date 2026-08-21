import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateInquiryStatusAction } from "@/app/admin/inquiries/actions";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CUSTOMER_INQUIRY_STATUS_OPTIONS,
  getInquiryContactSummary,
  getInquiryProduct,
  getStatusBadgeClasses,
  inquiryListDateFormatter,
} from "@/lib/customer-inquiries";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Inquiry Detail",
  description: "Review a customer inquiry and update its status.",
};

type InquiryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    updated?: string;
    error?: string;
  }>;
};

function InquiryFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading inquiry...</CardTitle>
      </CardHeader>
    </Card>
  );
}

function AccessDeniedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
        <CardDescription>
          Your account is authenticated, but it is not authorized to manage
          inquiries.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

async function InquiryContent({ params, searchParams }: InquiryDetailPageProps) {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_inquiries")
    .select(
      `
        id,
        customer_name,
        email,
        phone,
        event_date,
        quantity,
        message,
        status,
        created_at,
        product:products (
          id,
          name,
          slug
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load inquiry detail", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  if (!data) {
    notFound();
  }

  const product = getInquiryProduct(data.product);

  return (
    <div className="space-y-6">
      {resolvedSearchParams.updated === "1" ? (
        <AdminNotice tone="success">
          Inquiry status updated successfully.
        </AdminNotice>
      ) : null}

      {resolvedSearchParams.error ? (
        <AdminNotice tone="error">
          We couldn&apos;t update the inquiry status. Please try again.
        </AdminNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <CardDescription>Customer</CardDescription>
                <CardTitle className="text-2xl">{data.customer_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getInquiryContactSummary(data)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={getStatusBadgeClasses(data.status)}
              >
                {data.status}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{data.email ?? "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{data.phone ?? "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {inquiryListDateFormatter.format(new Date(data.created_at))}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Event date</p>
                <p className="font-medium">
                  {data.event_date ?? "Not provided"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardDescription>Request</CardDescription>
              <CardTitle>Inquiry details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Related product</p>
                  <p className="font-medium">
                    {product?.name ?? "Original product no longer available"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">
                    {data.quantity ?? "Not provided"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap leading-7">{data.message}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardDescription>Status</CardDescription>
              <CardTitle>Update inquiry</CardTitle>
              <CardDescription>
                Use the approved inquiry status values only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateInquiryStatusAction.bind(null, data.id)}
                className="space-y-4"
              >
                <select
                  name="status"
                  defaultValue={data.status}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CUSTOMER_INQUIRY_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>

                <Button type="submit">Save status</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardDescription>Actions</CardDescription>
              <CardTitle>Related links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {product ? (
                <>
                  <Button asChild variant="outline">
                    <Link href={`/products/${product.slug}`}>View product</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/admin/products/${product.id}/edit`}>
                      Edit product
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Original product no longer available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminInquiryDetailPage(props: InquiryDetailPageProps) {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Inquiry detail"
        description="Review the customer request, update its status, and jump to the related product when needed."
        backHref="/admin/inquiries"
        backLabel="Back to inquiries"
      />

      <Suspense fallback={<InquiryFallback />}>
        <InquiryContent {...props} />
      </Suspense>
    </div>
  );
}
