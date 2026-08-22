export const CUSTOMER_INQUIRY_STATUS_OPTIONS = [
  "new",
  "reviewed",
  "contacted",
  "quoted",
  "closed",
] as const;

export type CustomerInquiryStatus =
  (typeof CUSTOMER_INQUIRY_STATUS_OPTIONS)[number];

export type CustomerInquiryFormValues = {
  product_slug: string;
  customer_name: string;
  email: string;
  phone: string;
  event_date: string;
  quantity: string;
  message: string;
  submitter_timezone: string;
  submitter_utc_offset_minutes: string;
  company_name: string;
  turnstile_token: string;
};

export type CustomerInquiryFieldErrors = Partial<
  Record<
    keyof CustomerInquiryFormValues | "contact_method",
    string
  >
>;

export type CustomerInquiryFormState = {
  success: boolean;
  message: string;
  fieldErrors: CustomerInquiryFieldErrors;
  values: CustomerInquiryFormValues;
};

export const defaultCustomerInquiryFormValues: CustomerInquiryFormValues = {
  product_slug: "",
  customer_name: "",
  email: "",
  phone: "",
  event_date: "",
  quantity: "",
  message: "",
  submitter_timezone: "",
  submitter_utc_offset_minutes: "",
  company_name: "",
  turnstile_token: "",
};

export function createInitialCustomerInquiryFormState(
  values: CustomerInquiryFormValues = defaultCustomerInquiryFormValues,
): CustomerInquiryFormState {
  return {
    success: false,
    message: "",
    fieldErrors: {},
    values,
  };
}

export type ValidatedCustomerInquiryInput = {
  productSlug: string | null;
  customerName: string;
  email: string | null;
  phone: string | null;
  eventDate: string | null;
  quantity: number | null;
  message: string;
  submitterTimezone: string | null;
  submitterUtcOffsetMinutes: number | null;
  isSpam: boolean;
  turnstileToken: string | null;
};

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const controlCharacterPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const collapsedWhitespacePattern = /\s+/g;
const CUSTOMER_INQUIRY_MAX_QUANTITY = 100_000;
const CUSTOMER_INQUIRY_MIN_MESSAGE_LENGTH = 10;

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMultilineText(value: FormDataEntryValue | null) {
  return normalizeText(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n");
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTimeZone(value: string) {
  if (!value || value.length > 120) {
    return null;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return null;
  }
}

function normalizeUtcOffsetMinutes(value: string) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue)
    || parsedValue < -840
    || parsedValue > 840
  ) {
    return null;
  }

  return parsedValue;
}

function containsUnsafeControlCharacters(value: string) {
  return controlCharacterPattern.test(value);
}

function hasMeaningfulMessageLength(value: string) {
  return value.replace(collapsedWhitespacePattern, " ").trim().length
    >= CUSTOMER_INQUIRY_MIN_MESSAGE_LENGTH;
}

export function buildNormalizedInquiryFingerprintSource(input: {
  email: string | null;
  phone: string | null;
  message: string;
  productId: string | null;
  eventDate: string | null;
}) {
  const contactIdentity = input.email || input.phone || "";

  return JSON.stringify({
    contact: contactIdentity,
    event_date: input.eventDate || "",
    message: input.message,
    product_id: input.productId || "",
  });
}

export function getCustomerInquiryFormValues(
  formData: FormData,
): CustomerInquiryFormValues {
  return {
    product_slug: normalizeSlug(normalizeText(formData.get("product_slug"))),
    customer_name: normalizeText(formData.get("customer_name")),
    email: normalizeText(formData.get("email")).toLowerCase(),
    phone: normalizePhone(normalizeText(formData.get("phone"))),
    event_date: normalizeText(formData.get("event_date")),
    quantity: normalizeText(formData.get("quantity")),
    message: normalizeMultilineText(formData.get("message")),
    submitter_timezone: normalizeText(formData.get("submitter_timezone")),
    submitter_utc_offset_minutes: normalizeText(
      formData.get("submitter_utc_offset_minutes"),
    ),
    company_name: normalizeText(formData.get("company_name")),
    turnstile_token: normalizeText(formData.get("cf-turnstile-response")),
  };
}

export function validateCustomerInquiryFormValues(
  values: CustomerInquiryFormValues,
):
  | {
      success: true;
      data: ValidatedCustomerInquiryInput;
    }
  | {
      success: false;
      fieldErrors: CustomerInquiryFieldErrors;
      values: CustomerInquiryFormValues;
    } {
  const fieldErrors: CustomerInquiryFieldErrors = {};

  if (!values.customer_name) {
    fieldErrors.customer_name = "Name is required.";
  } else if (values.customer_name.length > 120) {
    fieldErrors.customer_name = "Name must be 120 characters or fewer.";
  } else if (containsUnsafeControlCharacters(values.customer_name)) {
    fieldErrors.customer_name = "Name contains unsupported characters.";
  }

  if (values.email && !emailPattern.test(values.email)) {
    fieldErrors.email = "Enter a valid email address.";
  } else if (values.email.length > 254) {
    fieldErrors.email = "Email must be 254 characters or fewer.";
  }

  if (values.phone.length > 40) {
    fieldErrors.phone = "Phone number must be 40 characters or fewer.";
  } else if (containsUnsafeControlCharacters(values.phone)) {
    fieldErrors.phone = "Phone number contains unsupported characters.";
  }

  if (!values.email && !values.phone) {
    fieldErrors.contact_method =
      "Provide at least an email address or a phone number.";
  }

  if (values.event_date && Number.isNaN(Date.parse(values.event_date))) {
    fieldErrors.event_date = "Enter a valid event date.";
  }

  let parsedQuantity: number | null = null;
  if (values.quantity) {
    parsedQuantity = Number(values.quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      fieldErrors.quantity = "Quantity must be a whole number greater than 0.";
    } else if (parsedQuantity > CUSTOMER_INQUIRY_MAX_QUANTITY) {
      fieldErrors.quantity = "Quantity is too large.";
    }
  }

  if (!values.message) {
    fieldErrors.message = "Message is required.";
  } else if (values.message.length > 2000) {
    fieldErrors.message = "Message must be 2000 characters or fewer.";
  } else if (containsUnsafeControlCharacters(values.message)) {
    fieldErrors.message = "Message contains unsupported characters.";
  } else if (!hasMeaningfulMessageLength(values.message)) {
    fieldErrors.message = "Please include a little more detail in your message.";
  }

  if (values.product_slug.length > 160) {
    fieldErrors.product_slug = "Invalid product reference.";
  } else if (values.product_slug && !slugPattern.test(values.product_slug)) {
    fieldErrors.product_slug = "Invalid product reference.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      fieldErrors,
      values,
    };
  }

  return {
    success: true,
    data: {
      productSlug: values.product_slug || null,
      customerName: values.customer_name,
      email: values.email || null,
      phone: values.phone || null,
      eventDate: values.event_date || null,
      quantity: parsedQuantity,
      message: values.message,
      submitterTimezone: normalizeTimeZone(values.submitter_timezone),
      submitterUtcOffsetMinutes: normalizeUtcOffsetMinutes(
        values.submitter_utc_offset_minutes,
      ),
      isSpam: Boolean(values.company_name),
      turnstileToken: values.turnstile_token || null,
    },
  };
}

export type AdminInquiryListItem = {
  id: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  event_date: string | null;
  quantity: number | null;
  message: string;
  status: CustomerInquiryStatus;
  created_at: string;
  submitter_timezone: string | null;
  submitter_utc_offset_minutes: number | null;
  product:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

export function getInquiryProduct(product: AdminInquiryListItem["product"]) {
  if (Array.isArray(product)) {
    return product[0] ?? null;
  }

  return product ?? null;
}

export function getInquiryContactSummary(inquiry: {
  email: string | null;
  phone: string | null;
}) {
  if (inquiry.email && inquiry.phone) {
    return `${inquiry.email} • ${inquiry.phone}`;
  }

  return inquiry.email ?? inquiry.phone ?? "No contact info";
}

export function getStatusBadgeClasses(status: CustomerInquiryStatus) {
  switch (status) {
    case "new":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700";
    case "reviewed":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700";
    case "contacted":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700";
    case "quoted":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
    case "closed":
      return "border-slate-500/30 bg-slate-500/10 text-slate-700";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-700";
  }
}

const INQUIRY_DISPLAY_LOCALE = "en-PH";
const MANILA_TIME_ZONE = "Asia/Manila";
const inquiryDateTimeOptions = {
  dateStyle: "medium",
  timeStyle: "short",
} satisfies Intl.DateTimeFormatOptions;

const manilaInquiryDateFormatter = new Intl.DateTimeFormat(
  INQUIRY_DISPLAY_LOCALE,
  {
    ...inquiryDateTimeOptions,
    timeZone: MANILA_TIME_ZONE,
  },
);

const utcInquiryDateFormatter = new Intl.DateTimeFormat(
  INQUIRY_DISPLAY_LOCALE,
  {
    ...inquiryDateTimeOptions,
    timeZone: "UTC",
  },
);

function isValidTimeZone(timeZone: string | null) {
  if (!timeZone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat(INQUIRY_DISPLAY_LOCALE, {
      timeZone,
    }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function formatUtcOffsetMinutes(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffset / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (absoluteOffset % 60).toString().padStart(2, "0");

  return `UTC${sign}${hours}:${minutes}`;
}

function getUtcOffsetOnlyTimeZoneLabel(offsetMinutes: number | null) {
  if (offsetMinutes == null) {
    return null;
  }

  return formatUtcOffsetMinutes(offsetMinutes);
}

export function formatInquirySubmittedAtPht(createdAt: string | Date) {
  return `${manilaInquiryDateFormatter.format(new Date(createdAt))} PHT`;
}

export function getInquirySubmitterTimeZoneLabel(inquiry: {
  submitter_timezone: string | null;
  submitter_utc_offset_minutes: number | null;
}) {
  const timeZone = isValidTimeZone(inquiry.submitter_timezone)
    ? inquiry.submitter_timezone
    : null;
  const offsetLabel = getUtcOffsetOnlyTimeZoneLabel(
    inquiry.submitter_utc_offset_minutes,
  );

  if (timeZone && offsetLabel) {
    return `${timeZone} (${offsetLabel})`;
  }

  if (timeZone) {
    return timeZone;
  }

  return offsetLabel ?? "Not captured";
}

export function formatInquirySubmitterLocalTime(inquiry: {
  created_at: string;
  submitter_timezone: string | null;
  submitter_utc_offset_minutes: number | null;
}) {
  const timeZone = isValidTimeZone(inquiry.submitter_timezone)
    ? inquiry.submitter_timezone
    : null;

  if (timeZone) {
    return new Intl.DateTimeFormat(INQUIRY_DISPLAY_LOCALE, {
      ...inquiryDateTimeOptions,
      timeZone,
    }).format(new Date(inquiry.created_at));
  }

  if (inquiry.submitter_utc_offset_minutes != null) {
    const shiftedDate = new Date(
      new Date(inquiry.created_at).getTime()
      + inquiry.submitter_utc_offset_minutes * 60_000,
    );

    return `${utcInquiryDateFormatter.format(shiftedDate)} ${formatUtcOffsetMinutes(inquiry.submitter_utc_offset_minutes)}`;
  }

  return "Not captured";
}
