import Link from "next/link";
import { Suspense } from "react";

import { toggleProductActiveAction } from "@/app/admin/products/actions";
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
import { requireAdmin } from "@/lib/admin";
import { getProductImagePublicUrl } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin Products",
  description: "Manage catalog products.",
};

const createdAtFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
});

type ProductRecord = {
  id: string;
  name: string;
  price_from: number | null;
  show_price: boolean;
  active: boolean;
  featured: boolean;
  customizable: boolean;
  created_at: string;
  category: { name: string | null } | { name: string | null }[] | null;
  product_images:
    | {
        storage_path: string;
        is_primary: boolean;
        sort_order: number;
      }[]
    | null;
};

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

function getProductThumbnail(product: ProductRecord) {
  const primaryImage = (product.product_images ?? [])[0];

  return getProductImagePublicUrl(primaryImage?.storage_path ?? null);
}

function ProductThumbnail({
  product,
  className,
}: {
  product: ProductRecord;
  className?: string;
}) {
  const thumbnailUrl = getProductThumbnail(product);

  if (!thumbnailUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border bg-muted/40 text-xs text-muted-foreground ${className ?? ""}`}
      >
        No image
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`rounded-xl border bg-cover bg-center bg-no-repeat ${className ?? ""}`}
      style={{ backgroundImage: `url("${thumbnailUrl}")` }}
    />
  );
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
        <Card key={index} className="shadow-sm">
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
  const { data, error } = await supabase
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
        ),
        product_images (
          storage_path,
          is_primary,
          sort_order
        )
      `,
    )
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .order("is_primary", {
      foreignTable: "product_images",
      ascending: false,
    })
    .order("sort_order", {
      foreignTable: "product_images",
      ascending: true,
    });

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

  const products = (data ?? []) as ProductRecord[];

  if (!products.length) {
    return (
      <AdminEmptyState
        title="No products yet"
        description="Create your first catalog product to start managing inventory, pricing, and visibility."
        action={
          <Button asChild>
            <Link href="/admin/products/new">Create product</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border bg-background shadow-sm lg:block">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Featured</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => {
              const categoryName = getCategoryName(product.category);

              return (
                <tr key={product.id} className="align-top text-sm">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-4">
                      <ProductThumbnail
                        product={product}
                        className="h-16 w-16 shrink-0"
                      />
                      <div className="space-y-2">
                        <p className="font-medium">{product.name}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={product.show_price ? "secondary" : "outline"}>
                            {product.show_price ? "Price shown" : "Price hidden"}
                          </Badge>
                          <Badge
                            variant={product.customizable ? "secondary" : "outline"}
                          >
                            {product.customizable
                              ? "Customizable"
                              : "Fixed design"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">{categoryName}</td>
                  <td className="px-4 py-4">{formatAdminPrice(product.price_from)}</td>
                  <td className="space-y-2 px-4 py-4">
                    <Badge variant={product.active ? "secondary" : "destructive"}>
                      {product.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {product.featured ? (
                      <Badge>Featured</Badge>
                    ) : (
                      <span className="text-muted-foreground">Standard</span>
                    )}
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
            <Card key={product.id} className="shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-4">
                  <ProductThumbnail
                    product={product}
                    className="h-20 w-20 shrink-0"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {categoryName}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant={product.active ? "secondary" : "destructive"}>
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                      {product.featured ? <Badge>Featured</Badge> : null}
                    </div>
                  </div>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Price</dt>
                    <dd className="font-medium">
                      {formatAdminPrice(product.price_from)}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Visibility</dt>
                    <dd className="font-medium">
                      {product.show_price ? "Price shown" : "Price hidden"}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Customization</dt>
                    <dd className="font-medium">
                      {product.customizable ? "Customizable" : "Fixed design"}
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
    <div className="space-y-8">
      <AdminPageHeader
        title="Products"
        description="Manage the catalog, pricing visibility, availability, and product images."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">Add product</Link>
          </Button>
        }
      />

      <Suspense fallback={<ProductsLoading />}>
        <ProductsManagerContent />
      </Suspense>
    </div>
  );
}
