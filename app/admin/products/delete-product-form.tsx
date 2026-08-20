"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteProductAction } from "@/app/admin/products/actions";
import {
  createInitialProductFormState,
  type ProductFormState,
} from "@/app/admin/products/form-state";

type DeleteProductFormProps = {
  productId: string;
  productName: string;
};

export function DeleteProductForm({
  productId,
  productName,
}: DeleteProductFormProps) {
  const deleteAction = deleteProductAction.bind(null, productId, productName);
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    deleteAction,
    createInitialProductFormState(),
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="delete_name">
          Type <span className="font-semibold">{productName}</span> to confirm
          deletion
        </Label>
        <Input
          id="delete_name"
          name="delete_name"
          autoComplete="off"
          placeholder={productName}
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-destructive/20 p-4">
        <Checkbox name="confirm_delete" />
        <span className="space-y-1">
          <span className="block text-sm font-medium">I understand</span>
          <span className="block text-sm text-muted-foreground">
            Product images will be removed automatically, and linked customer
            inquiries will keep their records but lose the product reference.
          </span>
        </span>
      </label>

      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting..." : "Delete product"}
      </Button>
    </form>
  );
}
