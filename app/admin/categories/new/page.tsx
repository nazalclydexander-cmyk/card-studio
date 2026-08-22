import { Suspense } from "react";

import { createCategoryAction } from "@/app/admin/categories/actions";
import { CategoryForm } from "@/app/admin/categories/category-form";
import { defaultCategoryValues } from "@/app/admin/categories/form-state";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";

export const metadata = {
  title: "New Category",
  description: "Create a new catalog category.",
};

function AccessDeniedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your account is authenticated, but it is not authorized to create
          categories.
        </p>
      </CardHeader>
    </Card>
  );
}

function FormLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading category form...</CardTitle>
      </CardHeader>
    </Card>
  );
}

async function NewCategoryContent() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  return (
    <CategoryForm
      action={createCategoryAction}
      initialValues={defaultCategoryValues}
      submitLabel="Create category"
      submitLoadingLabel="Creating..."
      heading="Category details"
      description="Create a new catalog category. The slug will be generated safely from the category name on save."
      cancelHref="/admin/categories"
      confirmTitle="Create this category?"
      confirmDescription="This category will become available for organizing catalog products."
      confirmLabel="Create category"
      confirmLoadingLabel="Creating..."
    />
  );
}

export default function NewCategoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <AdminPageHeader
        title="New category"
        description="Create a category to organize the catalog and control the order shown on the public site."
        backHref="/admin/categories"
        backLabel="Back to categories"
      />

      <Suspense fallback={<FormLoading />}>
        <NewCategoryContent />
      </Suspense>
    </div>
  );
}
