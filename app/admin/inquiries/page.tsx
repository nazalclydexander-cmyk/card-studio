import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Card key={index}>
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
      <Card>
        <CardHeader>
          <CardTitle>No inquiries yet</CardTitle>
          <CardDescription>
            Customer inquiries will appear here as they are submitted from the
            public contact form.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {inquiries.map((inquiry) => {
        const product = getInquiryProduct(inquiry.product);

        return (
          <Card key={inquiry.id}>
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-xl">
                  <Link
                    href={`/admin/inquiries/${inquiry.id}`}
                    className="hover:underline"
                  >
                    {inquiry.customer_name}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {getInquiryContactSummary(inquiry)}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={getStatusBadgeClasses(inquiry.status)}
              >
                {inquiry.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Product</p>
                  <p className="font-medium">
                    {product?.name ?? "General inquiry"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Event date</p>
                  <p className="font-medium">
                    {inquiry.event_date ?? "Not provided"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">
                    {inquiry.quantity ?? "Not provided"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {inquiryListDateFormatter.format(new Date(inquiry.created_at))}
                  </p>
                </div>
              </div>

              <p className="line-clamp-3 text-muted-foreground">
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
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-3">
          <Link
            href="/admin"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to admin
          </Link>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">Inquiries</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Review incoming customer inquiries and track their status.
            </p>
          </div>
        </div>

        <Suspense fallback={<InquiriesFallback />}>
          <InquiriesContent />
        </Suspense>
      </div>
    </main>
  );
}
