import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getInquiryContactSummary,
  getInquiryProduct,
  getStatusBadgeClasses,
  inquiryListDateFormatter,
  type AdminInquiryListItem,
} from "@/lib/customer-inquiries";
import { adminNavItems } from "@/components/admin/config";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Admin",
  description: "Administrator dashboard.",
};

const summaryCardConfig = [
  {
    title: "Products",
    key: "products",
    description: "Total products in the catalog",
  },
  {
    title: "Categories",
    key: "categories",
    description: "Available catalog categories",
  },
  {
    title: "New inquiries",
    key: "newInquiries",
    description: "Customer inquiries awaiting review",
  },
  {
    title: "Featured products",
    key: "featuredProducts",
    description: "Products highlighted publicly",
  },
] as const;

function AccessDeniedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
        <CardDescription>
          Your account is authenticated, but it is not authorized for the
          administrator area.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function AdminPage() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  const supabase = await createClient();
  const [
    { count: productsCount },
    { count: categoriesCount },
    { count: newInquiriesCount },
    { count: featuredProductsCount },
    { data: recentInquiries, error: recentInquiriesError },
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase
      .from("customer_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("featured", true),
    supabase
      .from("customer_inquiries")
      .select(
        `
          id,
          customer_name,
          email,
          phone,
          status,
          created_at,
          product:products (
            id,
            name,
            slug
          )
        `,
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (recentInquiriesError) {
    console.error("Failed to load dashboard inquiries", {
      code: recentInquiriesError.code,
      message: recentInquiriesError.message,
      details: recentInquiriesError.details,
      hint: recentInquiriesError.hint,
    });
  }

  const summaryValues = {
    products: productsCount ?? 0,
    categories: categoriesCount ?? 0,
    newInquiries: newInquiriesCount ?? 0,
    featuredProducts: featuredProductsCount ?? 0,
  };

  const inquiries = (recentInquiries ?? []) as AdminInquiryListItem[];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Admin Dashboard"
        description="Manage the catalog, storefront appearance, and customer inquiries from one cohesive workspace."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/">View Website</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="h-4 w-4" />
                New Product
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCardConfig.map((item) => (
          <Card key={item.key} className="shadow-sm">
            <CardHeader className="space-y-3">
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-3xl">
                {summaryValues[item.key]}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </CardHeader>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Recent inquiries</CardTitle>
              <CardDescription>
                Keep an eye on the latest customer requests.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/inquiries">View all inquiries</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {inquiries.length ? (
              inquiries.map((inquiry) => {
                const product = getInquiryProduct(inquiry.product);

                return (
                  <Link
                    key={inquiry.id}
                    href={`/admin/inquiries/${inquiry.id}`}
                    className="flex flex-col gap-3 rounded-xl border px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{inquiry.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getInquiryContactSummary(inquiry)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product?.name ?? "General inquiry"}
                      </p>
                    </div>
                    <div className="space-y-2 sm:text-right">
                      <Badge
                        variant="outline"
                        className={getStatusBadgeClasses(inquiry.status)}
                      >
                        {inquiry.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {inquiryListDateFormatter.format(
                          new Date(inquiry.created_at),
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <AdminEmptyState
                title="No inquiries yet"
                description="New customer inquiries will show up here once they start coming in from the public site."
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Jump straight into the most common admin tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/admin/products/new">
                <Plus className="h-4 w-4" />
                Add product
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/admin/categories/new">
                <Plus className="h-4 w-4" />
                Add category
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/admin/appearance">
                <Sparkles className="h-4 w-4" />
                Customize appearance
              </Link>
            </Button>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-medium">Available sections</p>
              <div className="mt-3 grid gap-2">
                {adminNavItems
                  .filter((item) => item.href !== "/admin")
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.label}
                    </Link>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
