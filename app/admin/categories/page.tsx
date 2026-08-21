import Link from "next/link";
import { Suspense } from "react";

import { toggleCategoryActiveAction } from "@/app/admin/categories/actions";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
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
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin Categories",
  description: "Manage catalog categories.",
};

const createdAtFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
});

type AdminCategoriesPageProps = {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
  }>;
};

function getProductCountLabel(count: number) {
  return `${count} product${count === 1 ? "" : "s"}`;
}

function AccessDeniedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
        <CardDescription>
          Your account is authenticated, but it is not authorized to manage
          categories.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function CategoriesLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="shadow-sm">
          <CardHeader>
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function SearchStatusNotice({ error }: { error?: string }) {
  if (error === "active-products") {
    return (
      <AdminNotice tone="warning">
        This category still has active products. Deactivate or reassign those
        products before hiding the category publicly.
      </AdminNotice>
    );
  }

  if (error === "active-check") {
    return (
      <AdminNotice tone="error">
        We couldn&apos;t verify whether the category still has active products.
        Please try again.
      </AdminNotice>
    );
  }

  if (error === "toggle") {
    return (
      <AdminNotice tone="error">
        We couldn&apos;t update the category status right now. Please try again.
      </AdminNotice>
    );
  }

  return null;
}

async function CategoriesManagerContent({
  searchParams,
}: AdminCategoriesPageProps) {
  const resolvedSearchParams = await searchParams;
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  const supabase = await createClient();
  const [{ data: categories, error }, { data: products, error: productsError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, description, sort_order, active, created_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("products").select("category_id"),
    ]);

  if (error) {
    console.error("Failed to load admin categories", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load categories</CardTitle>
          <CardDescription>
            We couldn&apos;t load the category manager right now. Please try
            again shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (productsError) {
    console.error("Failed to load category product usage", {
      code: productsError.code,
      message: productsError.message,
      details: productsError.details,
      hint: productsError.hint,
    });
  }

  const productCounts = new Map<string, number>();

  for (const product of products ?? []) {
    productCounts.set(
      product.category_id,
      (productCounts.get(product.category_id) ?? 0) + 1,
    );
  }

  if (!categories?.length) {
    return (
      <>
        <SearchStatusNotice error={resolvedSearchParams.error} />

        {resolvedSearchParams.deleted === "1" ? (
          <AdminNotice tone="success">Category deleted successfully.</AdminNotice>
        ) : null}

        <AdminEmptyState
          title="No categories yet"
          description="Create your first category to organize the catalog."
          action={
            <Button asChild>
              <Link href="/admin/categories/new">Create category</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      {resolvedSearchParams.deleted === "1" ? (
        <AdminNotice tone="success">Category deleted successfully.</AdminNotice>
      ) : null}

      <SearchStatusNotice error={resolvedSearchParams.error} />

      <div className="hidden overflow-hidden rounded-2xl border bg-background shadow-sm lg:block">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Sort order</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((category) => {
              const productCount = productCounts.get(category.id) ?? 0;

              return (
                <tr key={category.id} className="align-top text-sm">
                  <td className="space-y-2 px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-medium">{category.name}</p>
                      <p className="text-muted-foreground">/{category.slug}</p>
                    </div>
                    <p className="max-w-md text-muted-foreground">
                      {category.description?.trim()
                        ? category.description
                        : "No description provided."}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {getProductCountLabel(productCount)}
                  </td>
                  <td className="px-4 py-4">{category.sort_order}</td>
                  <td className="space-y-2 px-4 py-4">
                    <Badge variant={category.active ? "secondary" : "destructive"}>
                      {category.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {createdAtFormatter.format(new Date(category.created_at))}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/categories/${category.id}/edit`}>
                          Edit
                        </Link>
                      </Button>

                      <form
                        action={toggleCategoryActiveAction.bind(
                          null,
                          category.id,
                          !category.active,
                        )}
                      >
                        <Button size="sm" type="submit" variant="secondary">
                          {category.active ? "Deactivate" : "Activate"}
                        </Button>
                      </form>

                      <Button asChild size="sm" variant="destructive">
                        <Link
                          href={`/admin/categories/${category.id}/edit?danger=delete`}
                        >
                          Delete
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {categories.map((category) => {
          const productCount = productCounts.get(category.id) ?? 0;

          return (
            <Card key={category.id} className="shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">
                      /{category.slug}
                    </p>
                  </div>
                  <Badge variant={category.active ? "secondary" : "destructive"}>
                    {category.active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {category.description?.trim()
                    ? category.description
                    : "No description provided."}
                </p>

                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Products</dt>
                    <dd className="font-medium">
                      {getProductCountLabel(productCount)}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Sort order</dt>
                    <dd className="font-medium">{category.sort_order}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="font-medium">
                      {createdAtFormatter.format(new Date(category.created_at))}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/categories/${category.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                  <form
                    action={toggleCategoryActiveAction.bind(
                      null,
                      category.id,
                      !category.active,
                    )}
                  >
                    <Button size="sm" type="submit" variant="secondary">
                      {category.active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                  <Button asChild size="sm" variant="destructive">
                    <Link href={`/admin/categories/${category.id}/edit?danger=delete`}>
                      Delete
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export default function AdminCategoriesPage({
  searchParams,
}: AdminCategoriesPageProps) {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Categories"
        description="Organize the catalog, control public ordering, and manage which categories are visible."
        actions={
          <Button asChild>
            <Link href="/admin/categories/new">Add category</Link>
          </Button>
        }
      />

      <Suspense fallback={<CategoriesLoading />}>
        <CategoriesManagerContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
