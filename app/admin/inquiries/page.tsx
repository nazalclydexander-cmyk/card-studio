import Link from "next/link";
import { Suspense } from "react";

import { AdminEmptyState } from "@/components/admin/admin-empty-state";
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
  getInquiryContactSummary,
  getInquiryProduct,
  getStatusBadgeClasses,
  inquiryListDateFormatter,
  type AdminInquiryListItem,
} from "@/lib/customer-inquiries";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Inquiries",
  description: "Review customer inquiries.",
};

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

function InquiriesFallback() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="shadow-sm">
          <CardHeader>
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="h-4 w-52 rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

async function InquiriesContent() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load admin inquiries", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load inquiries</CardTitle>
          <CardDescription>
            We couldn&apos;t load the inquiry manager right now. Please try again shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const inquiries = (data ?? []) as AdminInquiryListItem[];

  if (!inquiries.length) {
    return (
      <AdminEmptyState
        title="No inquiries yet"
        description="Customer inquiries will appear here as they are submitted from the public inquiry flow."
      />
    );
  }

  return (
    <div className="space-y-4">
      {inquiries.map((inquiry) => {
        const product = getInquiryProduct(inquiry.product);

        return (
          <Card key={inquiry.id} className="shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-1">
                  <Link
                    href={`/admin/inquiries/${inquiry.id}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {inquiry.customer_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {getInquiryContactSummary(inquiry)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={getStatusBadgeClasses(inquiry.status)}
                >
                  {inquiry.status}
                </Badge>
              </div>

              <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Product</dt>
                  <dd className="font-medium">
                    {product?.name ?? "General inquiry"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Event date</dt>
                  <dd className="font-medium">
                    {inquiry.event_date ?? "Not provided"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd className="font-medium">
                    {inquiry.quantity ?? "Not provided"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="font-medium">
                    {inquiryListDateFormatter.format(new Date(inquiry.created_at))}
                  </dd>
                </div>
              </dl>

              <p className="line-clamp-3 text-sm text-muted-foreground">
                {inquiry.message}
              </p>

              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/inquiries/${inquiry.id}`}>Open inquiry</Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function AdminInquiriesPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Inquiries"
        description="Review customer requests, check product context, and update inquiry status."
      />

      <Suspense fallback={<InquiriesFallback />}>
        <InquiriesContent />
      </Suspense>
    </div>
  );
}
