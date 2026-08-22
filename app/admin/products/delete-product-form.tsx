"use client";

import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteProductAction } from "@/app/admin/products/actions";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
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
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmedSubmitRef = useRef(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedSubmitRef.current || pending) {
      return;
    }

    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const typedName =
      typeof formData.get("delete_name") === "string"
        ? formData.get("delete_name")?.toString().trim() ?? ""
        : "";
    const confirmed = formData.get("confirm_delete") === "on";

    if (!typedName || typedName !== productName || !confirmed) {
      setClientMessage(
        "Please confirm deletion and type the product name exactly before deleting.",
      );
      return;
    }

    setClientMessage(null);
    setConfirmOpen(true);
  }

  function handleConfirmDelete() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    confirmedSubmitRef.current = true;
    setConfirmOpen(false);
    form.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="space-y-4"
        onSubmit={handleSubmit}
      >
      {clientMessage || state.message ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {clientMessage ?? state.message}
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
          onChange={() => setClientMessage(null)}
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-destructive/20 p-4">
        <Checkbox
          name="confirm_delete"
          onCheckedChange={() => setClientMessage(null)}
        />
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

      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this product?"
        description={`This will permanently remove "${productName}" and its associated catalog data. This action cannot be undone.`}
        confirmLabel={pending ? "Deleting..." : "Delete product"}
        variant="destructive"
        isLoading={pending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
