"use client";

import { useRouter } from "next/navigation";

import {
  deleteCategoryFromListAction,
  toggleCategoryActiveAction,
} from "@/app/admin/categories/actions";
import { AdminListActionConfirm } from "@/components/admin/admin-list-action-confirm";

type CategoryListActionButtonsProps = {
  categoryId: string;
  categoryName: string;
  active: boolean;
};

export function CategoryListActionButtons({
  categoryId,
  categoryName,
  active,
}: CategoryListActionButtonsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      <AdminListActionConfirm
        triggerLabel="Edit"
        triggerVariant="outline"
        dialogTitle="Edit this category?"
        dialogDescription={`You are about to edit "${categoryName}".`}
        confirmLabel="Continue to edit"
        onConfirm={() => {
          router.push(`/admin/categories/${categoryId}/edit`);
        }}
      />

      <AdminListActionConfirm
        triggerLabel={active ? "Deactivate" : "Activate"}
        triggerVariant="secondary"
        dialogTitle={active ? "Deactivate this category?" : "Activate this category?"}
        dialogDescription={
          active
            ? `"${categoryName}" will be hidden from the public catalog until it is activated again.`
            : `"${categoryName}" will become available in the public catalog.`
        }
        confirmLabel={active ? "Deactivate category" : "Activate category"}
        loadingLabel={active ? "Deactivating..." : "Activating..."}
        onConfirm={() => toggleCategoryActiveAction(categoryId, !active)}
      />

      <AdminListActionConfirm
        triggerLabel="Delete"
        triggerVariant="destructive"
        dialogTitle="Delete this category?"
        dialogDescription={`Are you sure you want to permanently delete "${categoryName}"? This action cannot be undone.`}
        confirmLabel="Delete category"
        loadingLabel="Deleting..."
        confirmVariant="destructive"
        onConfirm={() => deleteCategoryFromListAction(categoryId, categoryName)}
      />
    </div>
  );
}
