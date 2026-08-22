import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateProductAction } from "@/app/admin/products/actions";
import { DeleteProductForm } from "@/app/admin/products/delete-product-form";
import { ProductImagesManager } from "@/app/admin/products/product-images-manager";
import { ProductForm } from "@/app/admin/products/product-form";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
  title: "Edit Product",
  description: "Edit an existing catalog product.",
};

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    danger?: string;
  }>;
};

function AccessDeniedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
        <CardDescription>
          Your account is authenticated, but it is not authorized to edit
          products.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function EditLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading product...</CardTitle>
      </CardHeader>
    </Card>
  );
}

async function EditProductContent({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    danger?: string;
  }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  const supabase = await createClient();
  const [
    { data: categories, error: categoriesError },
    { data: product, error: productError },
    { data: productImages, error: productImagesError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, active, sort_order")
      .order("active", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select(
        `
          id,
          name,
          slug,
          category_id,
          short_description,
          description,
          price_from,
          show_price,
          theme,
          orientation,
          format,
          customizable,
          featured,
          active
        `,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("product_images")
      .select(
        `
          id,
          product_id,
          storage_path,
          preview_path,
          preview_updated_at,
          alt_text,
          sort_order,
          is_primary,
          created_at
        `,
      )
      .eq("product_id", id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (productError) {
    console.error("Failed to load product for editing", {
      code: productError.code,
      message: productError.message,
      details: productError.details,
      hint: productError.hint,
    });
  }

  if (categoriesError) {
    console.error("Failed to load categories for product editing", {
      code: categoriesError.code,
      message: categoriesError.message,
      details: categoriesError.details,
      hint: categoriesError.hint,
    });
  }

  if (productImagesError) {
    console.error("Failed to load product images for editing", {
      code: productImagesError.code,
      message: productImagesError.message,
      details: productImagesError.details,
      hint: productImagesError.hint,
    });
  }

  if (!product) {
    notFound();
  }

  const initialValues = {
    name: product.name,
    category_id: product.category_id,
    short_description: product.short_description ?? "",
    description: product.description ?? "",
    price_from:
      product.price_from === null ? "" : Number(product.price_from).toFixed(2),
    show_price: product.show_price,
    theme: product.theme ?? "",
    orientation: product.orientation ?? "",
    format: product.format ?? "",
    customizable: product.customizable,
    featured: product.featured,
    active: product.active,
  };

  const boundUpdateAction = updateProductAction.bind(
    null,
    product.id,
    product.slug,
    product.name,
  );

  return (
    <div className="space-y-8">
      {resolvedSearchParams.created === "1" ? (
        <AdminNotice tone="success">
          Product created successfully.
        </AdminNotice>
      ) : null}

      {resolvedSearchParams.updated === "1" ? (
        <AdminNotice tone="success">
          Product updated successfully.
        </AdminNotice>
      ) : null}

      <ProductForm
        action={boundUpdateAction}
        categories={(categories ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          active: category.active,
        }))}
        initialValues={initialValues}
        submitLabel="Save changes"
        submitLoadingLabel="Saving..."
        heading="Basic information"
        description="Update the core product details. If you change the product name, the slug is regenerated from the new name and safely de-duplicated if needed."
        cancelHref="/admin/products"
        confirmTitle="Update this product?"
        confirmDescription="The product details will be updated in the catalog."
        confirmLabel="Save changes"
        confirmLoadingLabel="Saving..."
      />

      <ProductImagesManager
        productId={product.id}
        productName={product.name}
        images={productImages ?? []}
      />

      <Card className="border-destructive/20 shadow-sm">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Deleting this product will also delete related product image records
            and will detach existing customer inquiries from the product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resolvedSearchParams.danger !== "delete" ? (
            <Button asChild variant="destructive">
              <Link href={`/admin/products/${product.id}/edit?danger=delete`}>
                Delete product
              </Link>
            </Button>
          ) : (
            <DeleteProductForm productId={product.id} productName={product.name} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function EditProductPage({
  params,
  searchParams,
}: EditProductPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <AdminPageHeader
        title="Edit product"
        description="Update product details, images, pricing visibility, and public catalog status."
        backHref="/admin/products"
        backLabel="Back to products"
      />

      <Suspense fallback={<EditLoading />}>
        <EditProductContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
