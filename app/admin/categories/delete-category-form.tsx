"use client";

import { useActionState } from "react";

import { deleteCategoryAction } from "@/app/admin/categories/actions";
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

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.message}
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
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-destructive/20 p-4">
        <Checkbox name="confirm_delete" />
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
  );
}
