"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { AdminFormSection } from "@/components/admin/admin-form-section";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminNotice } from "@/components/admin/admin-notice";
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
  submitLoadingLabel?: string;
  heading: string;
  description: string;
  cancelHref: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
  confirmLoadingLabel: string;
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
  submitLoadingLabel = "Saving...",
  heading,
  description,
  cancelHref,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  confirmLoadingLabel,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    createInitialProductFormState(initialValues),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmedSubmitRef = useRef(false);

  const values = state.values;
  const noCategories = categories.length === 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedSubmitRef.current || pending || noCategories) {
      return;
    }

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    setConfirmOpen(true);
  }

  function handleConfirmSubmit() {
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
        className="space-y-8"
        onSubmit={handleSubmit}
      >
      {state.message ? (
        <AdminNotice tone="error">
          {state.message}
        </AdminNotice>
      ) : null}

      <AdminFormSection title={heading} description={description}>
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
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
              className="min-h-[180px]"
            />
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Catalog details"
        description="Add supporting details used to describe and organize the product."
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input id="theme" name="theme" defaultValue={values.theme} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orientation">Orientation</Label>
            <select
              id="orientation"
              name="orientation"
              defaultValue={values.orientation}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Not specified</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
              <option value="square">Square</option>
            </select>
            <FieldError message={state.fieldErrors.orientation} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Input id="format" name="format" defaultValue={values.format} />
          </div>

          <label className="flex items-start gap-3 rounded-xl border p-4">
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
        </div>
      </AdminFormSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminFormSection
          title="Pricing"
          description="Control the starting price and whether it is visible publicly."
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
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

            <label className="flex items-start gap-3 rounded-xl border p-4">
              <Checkbox name="show_price" defaultChecked={values.show_price} />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Show price</span>
                <span className="block text-sm text-muted-foreground">
                  Allow this product&apos;s public price to be displayed.
                </span>
              </span>
            </label>
          </div>
        </AdminFormSection>

        <AdminFormSection
          title="Visibility"
          description="Choose how this product should appear in the catalog."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border p-4">
              <Checkbox name="featured" defaultChecked={values.featured} />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Featured</span>
                <span className="block text-sm text-muted-foreground">
                  Push this product higher in the public catalog.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border p-4">
              <Checkbox name="active" defaultChecked={values.active} />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-sm text-muted-foreground">
                  Control whether the product appears publicly.
                </span>
              </span>
            </label>
          </div>
        </AdminFormSection>
      </div>

      <div className="sticky bottom-0 z-10 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Ready to save?</p>
            <p className="text-sm text-muted-foreground">
              Review the product details and save when you&apos;re ready.
            </p>
            {noCategories ? (
              <p className="text-sm text-muted-foreground">
                Create categories before adding products.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={pending || noCategories}>
              {pending ? submitLoadingLabel : submitLabel}
            </Button>
            <Button asChild variant="outline">
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
      </form>

      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={pending ? confirmLoadingLabel : confirmLabel}
        isLoading={pending}
        onConfirm={handleConfirmSubmit}
      />
    </>
  );
}
