"use client";

import { useActionState } from "react";

import { submitCustomerInquiryAction } from "@/app/contact/actions";
import { AdminNotice } from "@/components/admin/admin-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createInitialCustomerInquiryFormState,
  type CustomerInquiryFormValues,
} from "@/lib/customer-inquiries";

type ContactInquiryFormProps = {
  productSlug: string | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

export function ContactInquiryForm({
  productSlug,
}: ContactInquiryFormProps) {
  const initialValues: CustomerInquiryFormValues = {
    ...createInitialCustomerInquiryFormState().values,
    product_slug: productSlug ?? "",
  };

  const [state, formAction, pending] = useActionState(
    submitCustomerInquiryAction,
    createInitialCustomerInquiryFormState(initialValues),
  );

  const values = state.values;

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="product_slug"
        value={values.product_slug}
        readOnly
      />
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          defaultValue={values.website}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.message ? <AdminNotice tone="error">{state.message}</AdminNotice> : null}

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer_name">Name *</Label>
          <Input
            id="customer_name"
            name="customer_name"
            defaultValue={values.customer_name}
            required
            maxLength={120}
            autoComplete="name"
            className="h-11"
          />
          <FieldError message={state.fieldErrors.customer_name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email}
            maxLength={254}
            autoComplete="email"
            className="h-11"
          />
          <FieldError message={state.fieldErrors.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone / Contact Number</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={values.phone}
            maxLength={40}
            autoComplete="tel"
            className="h-11"
          />
          <FieldError message={state.fieldErrors.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_date">Event Date</Label>
          <Input
            id="event_date"
            name="event_date"
            type="date"
            defaultValue={values.event_date}
            autoComplete="off"
            className="h-11"
          />
          <FieldError message={state.fieldErrors.event_date} />
        </div>
      </div>

      <FieldError message={state.fieldErrors.contact_method} />

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <div className="space-y-2 md:max-w-[220px]">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            defaultValue={values.quantity}
            inputMode="numeric"
            className="h-11"
          />
          <FieldError message={state.fieldErrors.quantity} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          name="message"
          defaultValue={values.message}
          required
          maxLength={2000}
          className="min-h-[132px] sm:min-h-[144px]"
        />
        <FieldError message={state.fieldErrors.message} />
      </div>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          disabled={pending}
          className="h-11 px-5 shadow-sm"
          style={{
            backgroundColor: "var(--site-primary)",
            color: "var(--site-surface)",
            borderRadius: "var(--site-button-radius)",
          }}
        >
          {pending ? "Submitting..." : "Submit inquiry"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Required fields are marked with an asterisk. Please include enough detail
          for us to respond helpfully.
        </p>
      </div>
    </form>
  );
}
