import { Suspense } from "react";

import { createProductAction } from "@/app/admin/products/actions";
import { defaultProductValues } from "@/app/admin/products/form-state";
import { ProductForm } from "@/app/admin/products/product-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "New Product",
  description: "Create a new catalog product.",
};

function AccessDeniedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
        <CardDescription>
          Your account is authenticated, but it is not authorized to create
          products.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function FormLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading product form...</CardTitle>
      </CardHeader>
    </Card>
  );
}

async function NewProductContent() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, active, sort_order")
    .order("active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load categories for product creation", {
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
            We couldn&apos;t load categories for the product form right now.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ProductForm
      action={createProductAction}
      categories={(categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        active: category.active,
      }))}
      initialValues={defaultProductValues}
      submitLabel="Create product"
      heading="Basic information"
      description="Start with the core product details. The slug will be generated safely from the product name on save."
      cancelHref="/admin/products"
    />
  );
}

export default function NewProductPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <AdminPageHeader
        title="New product"
        description="Create a new catalog product. The slug will be generated safely from the product name when you save."
        backHref="/admin/products"
        backLabel="Back to products"
      />

      <Suspense fallback={<FormLoading />}>
        <NewProductContent />
      </Suspense>
    </div>
  );
}
