"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createInitialProductFormState,
  type ProductFormState,
  type ProductFormValues,
} from "@/app/admin/products/form-state";

type CategoryOption = {
  id: string;
  name: string;
  active: boolean;
};

type ProductFormProps = {
  action: (
    state: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
  categories: CategoryOption[];
  initialValues: ProductFormValues;
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

export function ProductForm({
  action,
  categories,
  initialValues,
  submitLabel,
  heading,
  description,
  cancelHref,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    createInitialProductFormState(initialValues),
  );

  const values = state.values;
  const noCategories = categories.length === 0;

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
        <div className="space-y-2">
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

        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={values.category_id}
            required
            disabled={noCategories}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors.category_id} />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="short_description">Short description</Label>
          <Textarea
            id="short_description"
            name="short_description"
            defaultValue={values.short_description}
            maxLength={240}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={values.description}
            className="min-h-[160px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price_from">Starting price</Label>
          <Input
            id="price_from"
            name="price_from"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={values.price_from}
            placeholder="250.00"
          />
          <FieldError message={state.fieldErrors.price_from} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="orientation">Orientation</Label>
          <select
            id="orientation"
            name="orientation"
            defaultValue={values.orientation}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Not specified</option>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
            <option value="square">Square</option>
          </select>
          <FieldError message={state.fieldErrors.orientation} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Input id="theme" name="theme" defaultValue={values.theme} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Input id="format" name="format" defaultValue={values.format} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox name="show_price" defaultChecked={values.show_price} />
          <span className="space-y-1">
            <span className="block text-sm font-medium">Show price</span>
            <span className="block text-sm text-muted-foreground">
              Allow this product&apos;s public price to be displayed.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox
            name="customizable"
            defaultChecked={values.customizable}
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium">Customizable</span>
            <span className="block text-sm text-muted-foreground">
              Mark whether customers can request customization.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox name="featured" defaultChecked={values.featured} />
          <span className="space-y-1">
            <span className="block text-sm font-medium">Featured</span>
            <span className="block text-sm text-muted-foreground">
              Push this product higher in the public catalog.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox name="active" defaultChecked={values.active} />
          <span className="space-y-1">
            <span className="block text-sm font-medium">Active</span>
            <span className="block text-sm text-muted-foreground">
              Control whether the product appears publicly.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending || noCategories}>
          {pending ? "Saving..." : submitLabel}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        {noCategories ? (
          <p className="text-sm text-muted-foreground">
            Create categories before adding products.
          </p>
        ) : null}
      </div>
    </form>
  );
}
