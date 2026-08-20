"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createInitialCategoryFormState,
  type CategoryFormState,
  type CategoryFormValues,
} from "@/app/admin/categories/form-state";

type CategoryFormProps = {
  action: (
    state: CategoryFormState,
    formData: FormData,
  ) => Promise<CategoryFormState>;
  initialValues: CategoryFormValues;
  submitLabel: string;
  heading: string;
  description: string;
  cancelHref: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

export function CategoryForm({
  action,
  initialValues,
  submitLabel,
  heading,
  description,
  cancelHref,
}: CategoryFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    createInitialCategoryFormState(initialValues),
  );

  const values = state.values;

  return (
    <form action={formAction} className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      {state.message ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={values.name}
            required
            maxLength={120}
          />
          <FieldError message={state.fieldErrors.name} />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={values.description}
            className="min-h-[140px]"
            maxLength={1000}
          />
          <FieldError message={state.fieldErrors.description} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort order</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={values.sort_order}
          />
          <p className="text-sm text-muted-foreground">
            Lower numbers appear earlier in the public catalog.
          </p>
          <FieldError message={state.fieldErrors.sort_order} />
        </div>
      </div>

      <div className="max-w-sm">
        <label className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox name="active" defaultChecked={values.active} />
          <span className="space-y-1">
            <span className="block text-sm font-medium">Active</span>
            <span className="block text-sm text-muted-foreground">
              Control whether this category appears in the public catalog.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
