import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeleteCategoryForm } from "@/app/admin/categories/delete-category-form";
import { updateCategoryAction } from "@/app/admin/categories/actions";
import { CategoryForm } from "@/app/admin/categories/category-form";
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
  title: "Edit Category",
  description: "Edit an existing catalog category.",
};

type EditCategoryPageProps = {
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
          categories.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function EditLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading category...</CardTitle>
      </CardHeader>
    </Card>
  );
}

async function EditCategoryContent({
  params,
  searchParams,
}: EditCategoryPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  const supabase = await createClient();
  const [{ data: category, error }, { count: productCount, error: countError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, description, sort_order, active")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),
    ]);

  if (error) {
    console.error("Failed to load category for editing", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  if (countError) {
    console.error("Failed to count category products for editing", {
      code: countError.code,
      message: countError.message,
      details: countError.details,
      hint: countError.hint,
    });
  }

  if (!category) {
    notFound();
  }

  const initialValues = {
    name: category.name,
    description: category.description ?? "",
    sort_order: String(category.sort_order),
    active: category.active,
  };

  const boundUpdateAction = updateCategoryAction.bind(
    null,
    category.id,
    category.slug,
    category.name,
  );

  return (
    <div className="space-y-8">
      {resolvedSearchParams.created === "1" ? (
        <AdminNotice tone="success">
          Category created successfully.
        </AdminNotice>
      ) : null}

      {resolvedSearchParams.updated === "1" ? (
        <AdminNotice tone="success">
          Category updated successfully.
        </AdminNotice>
      ) : null}

      <CategoryForm
        action={boundUpdateAction}
        initialValues={initialValues}
        submitLabel="Save changes"
        submitLoadingLabel="Saving..."
        heading="Category details"
        description="Update category details. If you change the category name, the slug is regenerated from the new name and safely de-duplicated if needed."
        cancelHref="/admin/categories"
        confirmTitle="Update this category?"
        confirmDescription="The category information will be updated across the catalog."
        confirmLabel="Save changes"
        confirmLoadingLabel="Saving..."
      />

      <Card className="border-destructive/20 shadow-sm">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Categories can only be deleted when no products still reference
            them. This category currently has {productCount ?? 0} linked{" "}
            {productCount === 1 ? "product" : "products"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resolvedSearchParams.danger !== "delete" ? (
            <Button asChild variant="destructive">
              <Link
                href={`/admin/categories/${category.id}/edit?danger=delete`}
                prefetch={false}
              >
                Delete category
              </Link>
            </Button>
          ) : (
            <DeleteCategoryForm
              categoryId={category.id}
              categoryName={category.name}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditCategoryPage({
  params,
  searchParams,
}: EditCategoryPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <AdminPageHeader
        title="Edit category"
        description="Update category details and control whether it is available in the public catalog."
        backHref="/admin/categories"
        backLabel="Back to categories"
      />

      <Suspense fallback={<EditLoading />}>
        <EditCategoryContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
