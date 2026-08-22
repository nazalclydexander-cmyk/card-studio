"use client";

import { useRef, useState } from "react";

import { AdminNotice } from "@/components/admin/admin-notice";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/public/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultCustomerInquiryFormValues,
  type CustomerInquiryFieldErrors,
} from "@/lib/customer-inquiries";
import {
  getClientTurnstileSiteKey,
  TURNSTILE_RESPONSE_FIELD_NAME,
} from "@/lib/turnstile";

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
  const initialValues = {
    ...defaultCustomerInquiryFormValues,
    product_slug: productSlug ?? "",
  };

  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CustomerInquiryFieldErrors>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileSiteKey = getClientTurnstileSiteKey();
  const submitterTimeZone = (() => {
    if (typeof window === "undefined") {
      return initialValues.submitter_timezone;
    }

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return typeof timeZone === "string" ? timeZone : "";
    } catch {
      return "";
    }
  })();
  const submitterUtcOffsetMinutes = typeof window === "undefined"
    ? initialValues.submitter_utc_offset_minutes
    : String(-new Date().getTimezoneOffset());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = formRef.current;

    if (!form) {
      return;
    }

    setPending(true);
    setMessage("");
    setFieldErrors({});

    const formData = new FormData(form);

    if (turnstileToken) {
      formData.set(TURNSTILE_RESPONSE_FIELD_NAME, turnstileToken);
    }

    try {
      const response = await fetch("/api/public/inquiries", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const result = (await response.json()) as {
        success?: boolean;
        redirectUrl?: string;
        message?: string;
        fieldErrors?: CustomerInquiryFieldErrors;
      };

      if (response.ok && result.success && result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }

      setMessage(
        result.message
          || "We couldn't submit your inquiry right now. Please try again in a moment.",
      );
      setFieldErrors(result.fieldErrors ?? {});
      turnstileRef.current?.reset();
    } catch {
      setMessage(
        "We couldn't submit your inquiry right now. Please try again in a moment.",
      );
      turnstileRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <input
        type="hidden"
        name="product_slug"
        value={initialValues.product_slug}
        readOnly
      />
      <input
        type="hidden"
        name="submitter_timezone"
        value={submitterTimeZone}
        readOnly
        suppressHydrationWarning
      />
      <input
        type="hidden"
        name="submitter_utc_offset_minutes"
        value={submitterUtcOffsetMinutes}
        readOnly
        suppressHydrationWarning
      />
      <div
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <Label htmlFor="company_name">Company name</Label>
        <Input
          id="company_name"
          name="company_name"
          defaultValue={initialValues.company_name}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {message ? <AdminNotice tone="error">{message}</AdminNotice> : null}

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer_name">Name *</Label>
          <Input
            id="customer_name"
            name="customer_name"
            defaultValue={initialValues.customer_name}
            required
            maxLength={120}
            autoComplete="name"
            className="h-11"
          />
          <FieldError message={fieldErrors.customer_name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initialValues.email}
            maxLength={254}
            autoComplete="email"
            className="h-11"
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone / Contact Number</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={initialValues.phone}
            maxLength={40}
            autoComplete="tel"
            className="h-11"
          />
          <FieldError message={fieldErrors.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_date">Event Date</Label>
          <Input
            id="event_date"
            name="event_date"
            type="date"
            defaultValue={initialValues.event_date}
            autoComplete="off"
            className="h-11"
          />
          <FieldError message={fieldErrors.event_date} />
        </div>
      </div>

      <FieldError message={fieldErrors.contact_method} />

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <div className="space-y-2 md:max-w-[220px]">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            defaultValue={initialValues.quantity}
            inputMode="numeric"
            className="h-11"
          />
          <FieldError message={fieldErrors.quantity} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          name="message"
          defaultValue={initialValues.message}
          required
          maxLength={2000}
          className="min-h-[132px] sm:min-h-[144px]"
        />
        <FieldError message={fieldErrors.message} />
      </div>

      <div className="space-y-2">
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          onTokenChange={setTurnstileToken}
        />
        <FieldError message={fieldErrors.turnstile_token} />
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
