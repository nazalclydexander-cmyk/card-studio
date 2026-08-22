"use client";

import { useRouter } from "next/navigation";

import {
  deleteProductFromListAction,
  toggleProductActiveAction,
} from "@/app/admin/products/actions";
import { AdminListActionConfirm } from "@/components/admin/admin-list-action-confirm";

type ProductListActionButtonsProps = {
  productId: string;
  productName: string;
  active: boolean;
};

export function ProductListActionButtons({
  productId,
  productName,
  active,
}: ProductListActionButtonsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      <AdminListActionConfirm
        triggerLabel="Edit"
        triggerVariant="outline"
        dialogTitle="Edit this product?"
        dialogDescription={`You are about to edit "${productName}".`}
        confirmLabel="Continue to edit"
        onConfirm={() => {
          router.push(`/admin/products/${productId}/edit`);
        }}
      />

      <AdminListActionConfirm
        triggerLabel={active ? "Deactivate" : "Activate"}
        triggerVariant="secondary"
        dialogTitle={active ? "Deactivate this product?" : "Activate this product?"}
        dialogDescription={
          active
            ? `"${productName}" will no longer be available in the public catalog until it is activated again.`
            : `"${productName}" will become available in the public catalog.`
        }
        confirmLabel={active ? "Deactivate product" : "Activate product"}
        loadingLabel={active ? "Deactivating..." : "Activating..."}
        onConfirm={() => toggleProductActiveAction(productId, !active)}
      />

      <AdminListActionConfirm
        triggerLabel="Delete"
        triggerVariant="destructive"
        dialogTitle="Delete this product?"
        dialogDescription={`This will permanently remove "${productName}" and its associated catalog data. This action cannot be undone.`}
        confirmLabel="Delete product"
        loadingLabel="Deleting..."
        confirmVariant="destructive"
        onConfirm={() => deleteProductFromListAction(productId, productName)}
      />
    </div>
  );
}
