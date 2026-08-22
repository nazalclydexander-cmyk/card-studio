"use client";

import { useActionState, useRef, useState } from "react";

import { deleteCategoryAction } from "@/app/admin/categories/actions";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import {
  createInitialCategoryFormState,
  type CategoryFormState,
} from "@/app/admin/categories/form-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeleteCategoryFormProps = {
  categoryId: string;
  categoryName: string;
};

export function DeleteCategoryForm({
  categoryId,
  categoryName,
}: DeleteCategoryFormProps) {
  const deleteAction = deleteCategoryAction.bind(null, categoryId, categoryName);
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(
    deleteAction,
    createInitialCategoryFormState(),
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

    if (!typedName || typedName !== categoryName || !confirmed) {
      setClientMessage(
        "Please confirm deletion and type the category name exactly before deleting.",
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
          Type <span className="font-semibold">{categoryName}</span> to confirm
          deletion
        </Label>
        <Input
          id="delete_name"
          name="delete_name"
          autoComplete="off"
          placeholder={categoryName}
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
            Categories can only be deleted when no products still reference them.
          </span>
        </span>
      </label>

      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting..." : "Delete category"}
      </Button>
      </form>

      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this category?"
        description={`Are you sure you want to delete "${categoryName}"?`}
        confirmLabel={pending ? "Deleting..." : "Delete category"}
        variant="destructive"
        isLoading={pending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
