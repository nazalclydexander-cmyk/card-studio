import Link from "next/link";
import { Suspense } from "react";

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
import { toggleProductActiveAction } from "@/app/admin/products/actions";

export const metadata = {
  title: "Admin Products",
  description: "Manage catalog products.",
};

const createdAtFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
});

function getCategoryName(
  category: { name: string | null } | { name: string | null }[] | null,
) {
  if (Array.isArray(category)) {
    return category[0]?.name ?? "Uncategorized";
  }

  return category?.name ?? "Uncategorized";
}

function formatAdminPrice(priceFrom: number | null) {
  if (priceFrom === null) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceFrom);
}

function AccessDeniedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
        <CardDescription>
          Your account is authenticated, but it is not authorized to manage
          products.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ProductsLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((__, itemIndex) => (
                <div key={itemIndex} className="space-y-2">
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-5 w-24 rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function ProductsManagerContent() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        price_from,
        show_price,
        active,
        featured,
        customizable,
        created_at,
        category:categories!products_category_id_fkey (
          name
        )
      `,
    )
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load admin products", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load products</CardTitle>
          <CardDescription>
            We couldn&apos;t load the product manager right now. Please try
            again shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!products?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No products yet</CardTitle>
          <CardDescription>
            Create your first catalog product to start managing the inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/products/new">Create product</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border lg:block">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => {
              const categoryName = getCategoryName(product.category);

              return (
                <tr key={product.id} className="align-top text-sm">
                  <td className="space-y-2 px-4 py-4">
                    <p className="font-medium">{product.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {product.featured ? <Badge>Featured</Badge> : null}
                      {product.customizable ? (
                        <Badge variant="secondary">Customizable</Badge>
                      ) : (
                        <Badge variant="outline">Fixed design</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {categoryName ?? "Uncategorized"}
                  </td>
                  <td className="px-4 py-4">
                    {formatAdminPrice(product.price_from)}
                  </td>
                  <td className="space-y-2 px-4 py-4">
                    {product.show_price ? (
                      <Badge variant="secondary">Price shown</Badge>
                    ) : (
                      <Badge variant="outline">Price hidden</Badge>
                    )}
                    {product.active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {product.active ? "Visible publicly" : "Hidden publicly"}
                  </td>
                  <td className="px-4 py-4">
                    {createdAtFormatter.format(new Date(product.created_at))}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/products/${product.id}/edit`}>
                          Edit
                        </Link>
                      </Button>

                      <form
                        action={toggleProductActiveAction.bind(
                          null,
                          product.id,
                          !product.active,
                        )}
                      >
                        <Button size="sm" type="submit" variant="secondary">
                          {product.active ? "Deactivate" : "Activate"}
                        </Button>
                      </form>

                      <Button asChild size="sm" variant="destructive">
                        <Link
                          href={`/admin/products/${product.id}/edit?danger=delete`}
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
        {products.map((product) => {
          const categoryName = getCategoryName(product.category);

          return (
            <Card key={product.id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <CardDescription>
                      {categoryName ?? "Uncategorized"}
                    </CardDescription>
                  </div>
                  {product.active ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.featured ? <Badge>Featured</Badge> : null}
                  {product.customizable ? (
                    <Badge variant="secondary">Customizable</Badge>
                  ) : (
                    <Badge variant="outline">Fixed design</Badge>
                  )}
                  {product.show_price ? (
                    <Badge variant="secondary">Price shown</Badge>
                  ) : (
                    <Badge variant="outline">Price hidden</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Price</dt>
                    <dd className="font-medium">
                      {formatAdminPrice(product.price_from)}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="font-medium">
                      {createdAtFormatter.format(new Date(product.created_at))}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/products/${product.id}/edit`}>Edit</Link>
                  </Button>
                  <form
                    action={toggleProductActiveAction.bind(
                      null,
                      product.id,
                      !product.active,
                    )}
                  >
                    <Button size="sm" type="submit" variant="secondary">
                      {product.active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                  <Button asChild size="sm" variant="destructive">
                    <Link href={`/admin/products/${product.id}/edit?danger=delete`}>
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

export default function AdminProductsPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Products Manager
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Manage all products in the catalog, including inactive items and
              price visibility settings.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/products/new">New product</Link>
          </Button>
        </div>

        <Suspense fallback={<ProductsLoading />}>
          <ProductsManagerContent />
        </Suspense>
      </div>
    </main>
  );
}
