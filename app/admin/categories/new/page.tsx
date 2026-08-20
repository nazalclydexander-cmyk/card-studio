import Link from "next/link";
import { Suspense } from "react";

import { createCategoryAction } from "@/app/admin/categories/actions";
import { CategoryForm } from "@/app/admin/categories/category-form";
import { defaultCategoryValues } from "@/app/admin/categories/form-state";
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
      heading="New category"
      description="Create a new catalog category. The slug will be generated safely from the category name on save."
      cancelHref="/admin/categories"
    />
  );
}

export default function NewCategoryPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-12">
        <Link
          href="/admin/categories"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to categories
        </Link>

        <Suspense fallback={<FormLoading />}>
          <NewCategoryContent />
        </Suspense>
      </div>
    </main>
  );
}
