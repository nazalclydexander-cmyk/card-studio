"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  updateAppearanceSettingsAction,
} from "@/app/admin/appearance/actions";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminProgressDialog } from "@/components/admin/admin-progress-dialog";
import { ProductCard } from "@/components/public/product-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COLOR_FIELD_OPTIONS,
  CURRENCY_OPTIONS,
  DEFAULT_APPEARANCE_FORM_VALUES,
  getFontOptions,
  getWatermarkFontOptions,
  mapAppearanceFormValuesToSiteSettings,
  type AppearanceFieldErrors,
  type AppearanceFormValues,
} from "@/lib/appearance-settings";
import {
  calculatePreviewRegenerationPercentage,
  type PreviewRegenerationFailure,
  type PreviewRegenerationItemResult,
  type PreviewRegenerationPrepareResult,
  type PreviewRegenerationTarget,
} from "@/lib/product-preview-regeneration-shared";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_BODY_FONT,
  DEFAULT_HEADING_FONT,
  getFontStack,
} from "@/lib/font-registry";
import type { PublicProduct } from "@/lib/public-catalog-shared";
import {
  buildSiteLogoPath,
  createSiteLogoFilename,
  getSiteAssetPublicUrl,
  SITE_ASSETS_BUCKET,
  SITE_LOGO_ALLOWED_MIME_TYPES,
  SITE_LOGO_MAX_FILE_SIZE_BYTES,
} from "@/lib/site-assets";
import { getSiteThemeVariables } from "@/lib/site-theme";
import { getWatermarkFontStack } from "@/lib/watermark-settings";

type AppearanceEditorProps = {
  initialValues: AppearanceFormValues;
};

type FeedbackState = {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  details?: string[];
};

type WatermarkPreviewState = {
  status: "idle" | "loading" | "ready" | "error";
  url: string | null;
  message: string | null;
};

type PreviewRegenerationStatus =
  | "idle"
  | "preparing"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed";

type PreviewRegenerationState = {
  status: PreviewRegenerationStatus;
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  currentName: string | null;
  message: string | null;
  failures: PreviewRegenerationFailure[];
  retrying: boolean;
};

const PREVIEW_REGENERATION_PREPARE_PATH = "/api/admin/product-previews/regeneration";

const previewProduct: PublicProduct = {
  id: "preview-product",
  name: "Elegant Floral Invitation",
  slug: "preview-product",
  short_description:
    "A refined invitation style with soft typography and a graceful, premium feel.",
  price_from: 250,
  show_price: true,
  theme: "Floral",
  customizable: true,
  category: {
    name: "Wedding Invitations",
    slug: "wedding-invitations",
  },
  images: null,
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

function ColorField({
  label,
  description,
  value,
  error,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 rounded-full border"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded border bg-transparent p-1"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          maxLength={7}
          className="max-w-[140px]"
          aria-label={`${label} hex value`}
        />
      </div>

      <FieldError message={error} />
    </div>
  );
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix,
  description,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  description: string;
  error?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
      <FieldError message={error} />
    </div>
  );
}

function buildWatermarkPreviewPayload(values: AppearanceFormValues) {
  return {
    watermark_enabled: values.watermark_enabled,
    watermark_text: values.watermark_text,
    watermark_font: values.watermark_font,
    watermark_mode: values.watermark_mode,
    watermark_color: values.watermark_color,
    watermark_light_color: values.watermark_light_color,
    watermark_dark_color: values.watermark_dark_color,
    watermark_opacity: values.watermark_opacity_percent / 100,
    watermark_rotation: values.watermark_rotation_degrees,
    watermark_font_scale: values.watermark_font_scale_percent / 100,
    watermark_spacing_x: values.watermark_spacing_x_percent,
    watermark_spacing_y: values.watermark_spacing_y_percent,
    watermark_repeat: values.watermark_repeat,
  };
}

function createIdlePreviewRegenerationState(): PreviewRegenerationState {
  return {
    status: "idle",
    total: 0,
    completed: 0,
    failed: 0,
    percentage: 0,
    currentName: null,
    message: null,
    failures: [],
    retrying: false,
  };
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function preparePreviewRegenerationRequest() {
  const response = await fetch(PREVIEW_REGENERATION_PREPARE_PATH, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = await readJsonResponse<PreviewRegenerationPrepareResult | { message?: string }>(
    response,
  );

  if (!response.ok) {
    return {
      success: false as const,
      message:
        result && "message" in result && typeof result.message === "string"
          ? result.message
          : "Unable to regenerate previews. Please try again.",
    };
  }

  if (!result || !("success" in result) || result.success !== true) {
    return {
      success: false as const,
      message: "Unable to regenerate previews. Please try again.",
    };
  }

  return result;
}

async function regeneratePreviewByIdRequest(imageId: string) {
  const response = await fetch(
    `${PREVIEW_REGENERATION_PREPARE_PATH}/${encodeURIComponent(imageId)}`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const result = await readJsonResponse<
    PreviewRegenerationItemResult | { message?: string; productName?: string; imageId?: string }
  >(response);

  if (!response.ok) {
    return {
      success: false as const,
      imageId,
      productName:
        result && "productName" in result && typeof result.productName === "string"
          ? result.productName
          : "Product",
      message:
        result && "message" in result && typeof result.message === "string"
          ? result.message
          : "This preview could not be regenerated right now.",
    };
  }

  if (!result || !("success" in result)) {
    return {
      success: false as const,
      imageId,
      productName: "Product",
      message: "This preview could not be regenerated right now.",
    };
  }

  return result;
}

export function AppearanceEditor({ initialValues }: AppearanceEditorProps) {
  const [values, setValues] = useState<AppearanceFormValues>(initialValues);
  const [savedValues, setSavedValues] = useState<AppearanceFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<AppearanceFieldErrors>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [isSubmittingSave, setIsSubmittingSave] = useState(false);
  const [previewRegeneration, setPreviewRegeneration] = useState<PreviewRegenerationState>(
    () => createIdlePreviewRegenerationState(),
  );
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [removeLogoOnSave, setRemoveLogoOnSave] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [watermarkPreview, setWatermarkPreview] = useState<WatermarkPreviewState>({
    status: "idle",
    url: null,
    message: null,
  });
  const watermarkPreviewRequestIdRef = useRef(0);
  const isRegenerationBusy =
    previewRegeneration.status === "preparing" ||
    previewRegeneration.status === "running";

  const selectedLogoPreviewUrl = useMemo(() => {
    if (!selectedLogoFile) {
      return null;
    }

    return URL.createObjectURL(selectedLogoFile);
  }, [selectedLogoFile]);

  useEffect(() => {
    return () => {
      if (selectedLogoPreviewUrl) {
        URL.revokeObjectURL(selectedLogoPreviewUrl);
      }
    };
  }, [selectedLogoPreviewUrl]);

  const watermarkPreviewPayload = useMemo(
    () => JSON.stringify(buildWatermarkPreviewPayload(values)),
    [values],
  );

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    const requestId = watermarkPreviewRequestIdRef.current + 1;
    watermarkPreviewRequestIdRef.current = requestId;
    const previewTimer = window.setTimeout(async () => {
      setWatermarkPreview((current) => ({
        ...current,
        status: "loading",
        message: null,
      }));

      try {
        const previewFormData = new FormData();
        previewFormData.set("watermark_settings", watermarkPreviewPayload);

        const response = await fetch("/api/admin/product-images/preview", {
          method: "POST",
          body: previewFormData,
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Preview unavailable");
        }

        const previewBlob = await response.blob();
        const previewUrl = URL.createObjectURL(previewBlob);

        if (
          !isActive ||
          requestId !== watermarkPreviewRequestIdRef.current
        ) {
          URL.revokeObjectURL(previewUrl);
          return;
        }

        setWatermarkPreview((current) => {
          if (current.url) {
            URL.revokeObjectURL(current.url);
          }

          return {
            status: "ready",
            url: previewUrl,
            message: null,
          };
        });
      } catch (error) {
        if (
          !isActive ||
          controller.signal.aborted ||
          requestId !== watermarkPreviewRequestIdRef.current
        ) {
          return;
        }

        setWatermarkPreview((current) => {
          if (current.url) {
            URL.revokeObjectURL(current.url);
          }

          return {
            status: "error",
            url: null,
            message:
              error instanceof Error
                ? "The watermark preview could not be generated right now."
                : "The watermark preview could not be generated right now.",
          };
        });
      }
    }, 180);

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(previewTimer);
    };
  }, [watermarkPreviewPayload]);

  useEffect(() => {
    return () => {
      if (watermarkPreview.url) {
        URL.revokeObjectURL(watermarkPreview.url);
      }
    };
  }, [watermarkPreview.url]);

  const hasUnsavedChanges =
    JSON.stringify(values) !== JSON.stringify(savedValues) ||
    Boolean(selectedLogoFile) ||
    removeLogoOnSave;
  const fontOptions = useMemo(() => getFontOptions(), []);
  const previewSettings = useMemo(
    () =>
      mapAppearanceFormValuesToSiteSettings(
        values,
        removeLogoOnSave ? null : values.logo_path || null,
      ),
    [removeLogoOnSave, values],
  );
  const currentLogoUrl = useMemo(
    () => getSiteAssetPublicUrl(savedValues.logo_path || null),
    [savedValues.logo_path],
  );
  const previewLogoUrl = selectedLogoPreviewUrl ?? (
    removeLogoOnSave ? null : currentLogoUrl
  );
  const hasStoredLogo = Boolean(savedValues.logo_path);
  const watermarkFontOptions = useMemo(() => getWatermarkFontOptions(), []);

  function updateValue<K extends keyof AppearanceFormValues>(
    key: K,
    nextValue: AppearanceFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [key]: nextValue,
    }));
    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
    setFeedback(null);
  }

  function clearSelectedLogoFile() {
    setSelectedLogoFile(null);
    setFileInputKey((current) => current + 1);
  }

  function handleLogoSelection(fileList: FileList | null) {
    const nextFile = fileList?.[0] ?? null;
    setFeedback(null);
    setFieldErrors((current) => ({
      ...current,
      logo_path: undefined,
    }));

    if (!nextFile) {
      setSelectedLogoFile(null);
      return;
    }

    if (!SITE_LOGO_ALLOWED_MIME_TYPES.includes(nextFile.type as never)) {
      setSelectedLogoFile(null);
      setFileInputKey((current) => current + 1);
      setFieldErrors((current) => ({
        ...current,
        logo_path: "Use a PNG, JPG, or WebP logo.",
      }));
      return;
    }

    if (nextFile.size > SITE_LOGO_MAX_FILE_SIZE_BYTES) {
      setSelectedLogoFile(null);
      setFileInputKey((current) => current + 1);
      setFieldErrors((current) => ({
        ...current,
        logo_path: `Logo must be ${formatBytes(SITE_LOGO_MAX_FILE_SIZE_BYTES)} or smaller.`,
      }));
      return;
    }

    setRemoveLogoOnSave(false);
    setSelectedLogoFile(nextFile);
  }

  function runSave() {
    setFeedback(null);
    setSaveConfirmOpen(false);
    setIsSubmittingSave(true);

    startTransition(async () => {
      const supabase = createClient();
      const previousLogoPath = savedValues.logo_path.trim() || null;
      let uploadedLogoPath: string | null = null;
      let nextLogoPath = removeLogoOnSave ? null : previousLogoPath;

      if (selectedLogoFile) {
        if (!SITE_LOGO_ALLOWED_MIME_TYPES.includes(selectedLogoFile.type as never)) {
          setFieldErrors((current) => ({
            ...current,
            logo_path: "Use a PNG, JPG, or WebP logo.",
          }));
          setFeedback({
            tone: "error",
            message: "Please choose a supported logo file.",
          });
          setIsSubmittingSave(false);
          return;
        }

        if (selectedLogoFile.size > SITE_LOGO_MAX_FILE_SIZE_BYTES) {
          setFieldErrors((current) => ({
            ...current,
            logo_path: `Logo must be ${formatBytes(SITE_LOGO_MAX_FILE_SIZE_BYTES)} or smaller.`,
          }));
          setFeedback({
            tone: "error",
            message: "Please choose a smaller logo file.",
          });
          setIsSubmittingSave(false);
          return;
        }

        const generatedFilename = createSiteLogoFilename(selectedLogoFile.type);

        if (!generatedFilename) {
          setFieldErrors((current) => ({
            ...current,
            logo_path: "Use a supported image format for the logo.",
          }));
          setFeedback({
            tone: "error",
            message: "Please choose a supported logo file.",
          });
          setIsSubmittingSave(false);
          return;
        }

        uploadedLogoPath = buildSiteLogoPath(generatedFilename);
        nextLogoPath = uploadedLogoPath;

        const { error: uploadError } = await supabase.storage
          .from(SITE_ASSETS_BUCKET)
          .upload(uploadedLogoPath, selectedLogoFile, {
            cacheControl: "3600",
            contentType: selectedLogoFile.type,
            upsert: false,
          });

        if (uploadError) {
          setFeedback({
            tone: "error",
            message:
              "The logo could not be uploaded right now. Please try again.",
          });
          setIsSubmittingSave(false);
          return;
        }
      }

      const nextValues: AppearanceFormValues = {
        ...values,
        logo_path: nextLogoPath ?? "",
      };

      const result = await updateAppearanceSettingsAction(nextValues);

      if (!result.success) {
        if (uploadedLogoPath) {
          await supabase.storage.from(SITE_ASSETS_BUCKET).remove([uploadedLogoPath]);
        }

        setFieldErrors(result.fieldErrors ?? {});
        if (result.values) {
          setValues(result.values);
        }
        setFeedback({
          tone: "error",
          message: result.message,
        });
        setIsSubmittingSave(false);
        return;
      }

      let cleanupNotice = "";

      if (previousLogoPath && previousLogoPath !== nextLogoPath) {
        const { error: cleanupError } = await supabase.storage
          .from(SITE_ASSETS_BUCKET)
          .remove([previousLogoPath]);

        if (cleanupError) {
          cleanupNotice =
            " The new settings are live, but the previous logo file could not be removed automatically.";
        }
      }

      setFieldErrors({});
      setValues(nextValues);
      setSavedValues(nextValues);
      clearSelectedLogoFile();
      setRemoveLogoOnSave(false);
      setShowResetConfirm(false);
      setFeedback({
        tone: "success",
        message: `Appearance settings saved successfully.${cleanupNotice}`,
      });
      setIsSubmittingSave(false);
    });
  }

  function handleLoadDefaults() {
    setValues({
      ...DEFAULT_APPEARANCE_FORM_VALUES,
      logo_path: savedValues.logo_path,
    });
    setFieldErrors({});
    setFeedback({
      tone: "success",
      message: "Default appearance values loaded. Save to apply them.",
    });
    setShowResetConfirm(false);
    clearSelectedLogoFile();
    setRemoveLogoOnSave(false);
  }

  async function runRegenerateExistingPreviews(
    itemsToProcess?: PreviewRegenerationTarget[],
  ) {
    if (hasUnsavedChanges || isPending || isRegenerationBusy) {
      return;
    }

    setFeedback(null);

    const queuedItems = itemsToProcess ?? [];
    const retrying = queuedItems.length > 0;

    try {
      setPreviewRegeneration({
        status: "preparing",
        total: queuedItems.length,
        completed: 0,
        failed: 0,
        percentage: 0,
        currentName: null,
        message: retrying
          ? "Preparing the failed previews for another attempt."
          : "Preparing the existing protected previews for regeneration.",
        failures: [],
        retrying,
      });

      const prepareResult =
        queuedItems.length > 0
          ? {
              success: true as const,
              total: queuedItems.length,
              items: queuedItems,
            }
          : await preparePreviewRegenerationRequest();

      if (!prepareResult.success) {
        setPreviewRegeneration({
          status: "failed",
          total: 0,
          completed: 0,
          failed: 0,
          percentage: 0,
          currentName: null,
          message: prepareResult.message,
          failures: [],
          retrying: false,
        });
        setFeedback({
          tone: "error",
          message: "Unable to regenerate previews. Please try again.",
        });
        return;
      }

      if (prepareResult.total === 0) {
        setPreviewRegeneration(createIdlePreviewRegenerationState());
        setFeedback({
          tone: "info",
          message: "No existing protected previews were found to regenerate.",
        });
        return;
      }

      setPreviewRegeneration((current) => ({
        ...current,
        status: "running",
        total: prepareResult.total,
        currentName: prepareResult.items[0]?.productName ?? null,
        message: null,
      }));

      const failures: PreviewRegenerationFailure[] = [];
      let completed = 0;
      let failed = 0;

      for (const item of prepareResult.items) {
        setPreviewRegeneration((current) => ({
          ...current,
          status: "running",
          currentName: item.productName,
        }));

        let result: PreviewRegenerationItemResult;

        try {
          result = await regeneratePreviewByIdRequest(item.imageId);
        } catch {
          result = {
            success: false,
            imageId: item.imageId,
            productName: item.productName,
            message: "This preview could not be regenerated right now.",
          };
        }

        completed += 1;

        if (!result.success) {
          failed += 1;
          failures.push({
            productName: result.productName,
            imageId: result.imageId,
            message: result.message,
          });
        }

        setPreviewRegeneration((current) => ({
          ...current,
          status: "running",
          completed,
          failed,
          percentage: calculatePreviewRegenerationPercentage(
            completed,
            current.total,
          ),
          currentName:
            completed < current.total
              ? prepareResult.items[completed]?.productName ?? null
              : item.productName,
          failures: [...failures],
        }));
      }

      const updated = prepareResult.total - failed;
      const details = failures.map(
        (failure) =>
          `${failure.productName} (${failure.imageId}): ${failure.message}`,
      );

      if (failed === 0) {
        setPreviewRegeneration({
          status: "completed",
          total: prepareResult.total,
          completed: prepareResult.total,
          failed: 0,
          percentage: 100,
          currentName: null,
          message: "Watermark applied successfully",
          failures: [],
          retrying: false,
        });
        setFeedback({
          tone: "success",
          message: `${updated} preview${updated === 1 ? "" : "s"} regenerated successfully.`,
        });
        return;
      }

      const finalStatus = updated > 0 ? "completed_with_errors" : "failed";

      setPreviewRegeneration({
        status: finalStatus,
        total: prepareResult.total,
        completed: prepareResult.total,
        failed,
        percentage: 100,
        currentName: null,
        message:
          updated > 0
            ? "Regeneration completed with issues"
            : "Unable to regenerate previews.",
        failures,
        retrying: false,
      });

      setFeedback({
        tone: updated > 0 ? "warning" : "error",
        message:
          updated > 0
            ? `${updated} of ${prepareResult.total} previews regenerated. ${failed} failed.`
            : `No previews were regenerated. ${failed} failed.`,
        details,
      });
    } catch {
      setPreviewRegeneration({
        status: "failed",
        total: 0,
        completed: 0,
        failed: 0,
        percentage: 0,
        currentName: null,
        message: "Unable to regenerate previews. Please try again.",
        failures: [],
        retrying: false,
      });
      setFeedback({
        tone: "error",
        message: "Unable to regenerate previews. Please try again.",
      });
    }
  }

  function handleSaveClick() {
    if (!hasUnsavedChanges || isPending || isSubmittingSave) {
      return;
    }

    setSaveConfirmOpen(true);
  }

  function handleRegenerateExistingPreviews() {
    if (hasUnsavedChanges || isPending || isRegenerationBusy) {
      return;
    }

    setRegenerateConfirmOpen(true);
  }

  function handleCloseRegenerationProgress() {
    if (isRegenerationBusy) {
      return;
    }

    setPreviewRegeneration(createIdlePreviewRegenerationState());
  }

  function handleRetryFailedPreviews() {
    if (
      isRegenerationBusy ||
      previewRegeneration.status !== "completed_with_errors" ||
      previewRegeneration.failures.length === 0
    ) {
      return;
    }

    const failedItems: PreviewRegenerationTarget[] = previewRegeneration.failures.map(
      (failure) => ({
        imageId: failure.imageId,
        productId: "",
        productName: failure.productName,
      }),
    );

    void runRegenerateExistingPreviews(failedItems);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Appearance editor
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Update the public site&apos;s branding, colors, typography,
                shape, catalog display settings, and business contact details.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
            </div>
          </div>
        </div>

        {feedback ? (
          <AdminNotice tone={feedback.tone}>
            <div className="space-y-2">
              <p>{feedback.message}</p>
              {feedback.details?.length ? (
                <ul className="list-disc space-y-1 pl-5">
                  {feedback.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </AdminNotice>
        ) : null}

        <section className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Business &amp; Contact</h2>
            <p className="text-sm text-muted-foreground">
              Manage the public logo, contact information, and social links from
              the same site settings row.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="space-y-4 rounded-xl border p-4">
              <div className="space-y-1">
                <Label htmlFor="logo_upload">Logo</Label>
                <p className="text-sm text-muted-foreground">
                  Upload PNG, JPG, or WebP up to{" "}
                  {formatBytes(SITE_LOGO_MAX_FILE_SIZE_BYTES)}. The logo is only
                  uploaded when you save.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border bg-muted/30">
                  {previewLogoUrl ? (
                    <Image
                      src={previewLogoUrl}
                      alt={`${values.site_name} logo preview`}
                      fill
                      sizes="112px"
                      className="object-contain p-3"
                      unoptimized={previewLogoUrl.startsWith("blob:")}
                    />
                  ) : (
                    <div className="px-3 text-center text-xs text-muted-foreground">
                      No logo configured
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <Input
                    key={fileInputKey}
                    id="logo_upload"
                    type="file"
                    accept={SITE_LOGO_ALLOWED_MIME_TYPES.join(",")}
                    onChange={(event) => handleLogoSelection(event.target.files)}
                    disabled={isPending}
                  />
                  <FieldError message={fieldErrors.logo_path} />

                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {selectedLogoFile ? (
                      <span>
                        New logo selected:{" "}
                        <span className="font-medium text-foreground">
                          {selectedLogoFile.name}
                        </span>
                      </span>
                    ) : hasStoredLogo && !removeLogoOnSave ? (
                      <span>
                        Current logo will remain until you replace or remove it.
                      </span>
                    ) : removeLogoOnSave ? (
                      <span>The current logo will be removed when you save.</span>
                    ) : (
                      <span>No stored logo yet.</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedLogoFile ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => clearSelectedLogoFile()}
                        disabled={isPending}
                      >
                        Clear selected logo
                      </Button>
                    ) : null}

                    {hasStoredLogo ? (
                      removeLogoOnSave ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setRemoveLogoOnSave(false)}
                          disabled={isPending}
                        >
                          Keep current logo
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            clearSelectedLogoFile();
                            setRemoveLogoOnSave(true);
                            setFeedback(null);
                          }}
                          disabled={isPending}
                        >
                          Remove logo
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={values.contact_email}
                  onChange={(event) =>
                    updateValue("contact_email", event.target.value)
                  }
                  maxLength={320}
                  placeholder="hello@example.com"
                />
                <FieldError message={fieldErrors.contact_email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  value={values.contact_phone}
                  onChange={(event) =>
                    updateValue("contact_phone", event.target.value)
                  }
                  maxLength={40}
                  placeholder="+63 912 345 6789"
                />
                <FieldError message={fieldErrors.contact_phone} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_address">Address</Label>
              <Textarea
                id="business_address"
                value={values.business_address}
                onChange={(event) =>
                  updateValue("business_address", event.target.value)
                }
                maxLength={500}
                className="min-h-[100px]"
                placeholder="Business address"
              />
              <FieldError message={fieldErrors.business_address} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facebook_url">Facebook URL</Label>
                <Input
                  id="facebook_url"
                  type="url"
                  value={values.facebook_url}
                  onChange={(event) =>
                    updateValue("facebook_url", event.target.value)
                  }
                  maxLength={500}
                  placeholder="https://www.facebook.com/your-page"
                />
                <FieldError message={fieldErrors.facebook_url} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <Input
                  id="instagram_url"
                  type="url"
                  value={values.instagram_url}
                  onChange={(event) =>
                    updateValue("instagram_url", event.target.value)
                  }
                  maxLength={500}
                  placeholder="https://www.instagram.com/your-profile"
                />
                <FieldError message={fieldErrors.instagram_url} />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Branding</h2>
            <p className="text-sm text-muted-foreground">
              Edit the public-facing brand text and homepage hero copy.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">Site name</Label>
              <Input
                id="site_name"
                value={values.site_name}
                onChange={(event) => updateValue("site_name", event.target.value)}
                maxLength={120}
              />
              <FieldError message={fieldErrors.site_name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Textarea
                id="tagline"
                value={values.tagline}
                onChange={(event) => updateValue("tagline", event.target.value)}
                maxLength={220}
                className="min-h-[96px]"
              />
              <FieldError message={fieldErrors.tagline} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_title">Hero title</Label>
              <Textarea
                id="hero_title"
                value={values.hero_title}
                onChange={(event) =>
                  updateValue("hero_title", event.target.value)
                }
                maxLength={200}
                className="min-h-[88px]"
              />
              <FieldError message={fieldErrors.hero_title} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_subtitle">Hero subtitle</Label>
              <Textarea
                id="hero_subtitle"
                value={values.hero_subtitle}
                onChange={(event) =>
                  updateValue("hero_subtitle", event.target.value)
                }
                maxLength={360}
                className="min-h-[120px]"
              />
              <FieldError message={fieldErrors.hero_subtitle} />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Colors</h2>
            <p className="text-sm text-muted-foreground">
              Use safe hex colors only. The picker and text value stay in sync.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {COLOR_FIELD_OPTIONS.map((field) => (
              <ColorField
                key={field.key}
                label={field.label}
                description={field.description}
                value={values[field.key]}
                error={fieldErrors[field.key]}
                onChange={(nextValue) => updateValue(field.key, nextValue)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Typography</h2>
            <p className="text-sm text-muted-foreground">
              Fonts are limited to the existing approved registry.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="heading_font">Heading font</Label>
              <select
                id="heading_font"
                value={values.heading_font}
                onChange={(event) =>
                  updateValue(
                    "heading_font",
                    event.target.value as typeof values.heading_font,
                  )
                }
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.heading_font} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body_font">Body font</Label>
              <select
                id="body_font"
                value={values.body_font}
                onChange={(event) =>
                  updateValue("body_font", event.target.value as typeof values.body_font)
                }
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.body_font} />
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
            <div>
              <p
                className="text-2xl"
                style={{
                  fontFamily: getFontStack(
                    values.heading_font,
                    DEFAULT_HEADING_FONT,
                  ),
                }}
              >
                Heading Preview
              </p>
              <p
                className="mt-2 text-base"
                style={{
                  fontFamily: getFontStack(
                    values.heading_font,
                    DEFAULT_HEADING_FONT,
                  ),
                }}
              >
                Your invitation, beautifully presented
              </p>
            </div>
            <div>
              <p
                className="text-base font-medium"
                style={{
                  fontFamily: getFontStack(values.body_font, DEFAULT_BODY_FONT),
                }}
              >
                Body Preview
              </p>
              <p
                className="mt-2 text-sm leading-6"
                style={{
                  fontFamily: getFontStack(
                    values.body_font,
                    DEFAULT_BODY_FONT,
                  ),
                }}
              >
                Thoughtfully designed for your special moments.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Shape</h2>
            <p className="text-sm text-muted-foreground">
              Control corner softness with safe pixel-based values.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="card_radius">Card radius</Label>
                <span className="text-sm text-muted-foreground">
                  {values.card_radius_px}px
                </span>
              </div>
              <input
                id="card_radius"
                type="range"
                min="0"
                max="40"
                step="1"
                value={values.card_radius_px}
                onChange={(event) =>
                  updateValue("card_radius_px", Number(event.target.value))
                }
                className="w-full"
              />
              <FieldError message={fieldErrors.card_radius_px} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="button_radius">Button radius</Label>
                <span className="text-sm text-muted-foreground">
                  {values.button_radius_px}px
                </span>
              </div>
              <input
                id="button_radius"
                type="range"
                min="0"
                max="40"
                step="1"
                value={values.button_radius_px}
                onChange={(event) =>
                  updateValue("button_radius_px", Number(event.target.value))
                }
                className="w-full"
              />
              <FieldError message={fieldErrors.button_radius_px} />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Catalog</h2>
            <p className="text-sm text-muted-foreground">
              Control public price visibility and the customer-facing price
              label.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="flex items-start gap-3 rounded-xl border p-4">
              <Checkbox
                checked={values.show_prices}
                onCheckedChange={(checked) =>
                  updateValue("show_prices", checked === true)
                }
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">
                  Show prices publicly
                </span>
                <span className="block text-sm text-muted-foreground">
                  When disabled, the public catalog will hide all product prices.
                </span>
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency_code">Currency</Label>
                <select
                  id="currency_code"
                  value={values.currency_code}
                  onChange={(event) =>
                    updateValue(
                      "currency_code",
                      event.target.value as typeof values.currency_code,
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.currency_code} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hidden_price_label">Hidden price label</Label>
                <Input
                  id="hidden_price_label"
                  value={values.hidden_price_label}
                  onChange={(event) =>
                    updateValue("hidden_price_label", event.target.value)
                  }
                  maxLength={120}
                />
                <FieldError message={fieldErrors.hidden_price_label} />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Watermark</h2>
            <p className="text-sm text-muted-foreground">
              Configure the protection defaults used for future public preview
              generation. Existing stored previews stay unchanged until you
              regenerate them intentionally.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="flex items-start gap-3 rounded-xl border p-4">
              <Checkbox
                checked={values.watermark_enabled}
                onCheckedChange={(checked) =>
                  updateValue("watermark_enabled", checked === true)
                }
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">
                  Enable watermark
                </span>
                <span className="block text-sm text-muted-foreground">
                  When enabled, new public product previews are rendered with a
                  permanent burned-in text watermark.
                </span>
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="watermark_text">Watermark text</Label>
                <Input
                  id="watermark_text"
                  value={values.watermark_text}
                  onChange={(event) =>
                    updateValue("watermark_text", event.target.value)
                  }
                  maxLength={40}
                  placeholder="PREVIEW"
                />
                <FieldError message={fieldErrors.watermark_text} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="watermark_mode">Mode</Label>
                <select
                  id="watermark_mode"
                  value={values.watermark_mode}
                  onChange={(event) =>
                    updateValue(
                      "watermark_mode",
                      event.target.value as typeof values.watermark_mode,
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="adaptive">Adaptive</option>
                  <option value="manual">Manual</option>
                </select>
                <FieldError message={fieldErrors.watermark_mode} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="watermark_font">Font</Label>
                <select
                  id="watermark_font"
                  value={values.watermark_font}
                  onChange={(event) =>
                    updateValue(
                      "watermark_font",
                      event.target.value as typeof values.watermark_font,
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {watermarkFontOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.watermark_font} />
              </div>

              <div className="space-y-2">
                <Label>Watermark font preview</Label>
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    fontFamily: getWatermarkFontStack(values.watermark_font),
                  }}
                >
                  {values.watermark_text.trim() || "PREVIEW"}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ColorField
                label="Manual color"
                description="Used directly in Manual mode."
                value={values.watermark_color}
                error={fieldErrors.watermark_color}
                onChange={(nextValue) => updateValue("watermark_color", nextValue)}
              />
              <ColorField
                label="Light watermark color"
                description="Used on dark artwork in Adaptive mode."
                value={values.watermark_light_color}
                error={fieldErrors.watermark_light_color}
                onChange={(nextValue) =>
                  updateValue("watermark_light_color", nextValue)
                }
              />
              <ColorField
                label="Dark watermark color"
                description="Used on light artwork in Adaptive mode."
                value={values.watermark_dark_color}
                error={fieldErrors.watermark_dark_color}
                onChange={(nextValue) =>
                  updateValue("watermark_dark_color", nextValue)
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <RangeField
                id="watermark_opacity_percent"
                label="Opacity"
                value={values.watermark_opacity_percent}
                min={5}
                max={50}
                step={1}
                suffix="%"
                description="Controls how subtle or visible the watermark feels."
                error={fieldErrors.watermark_opacity_percent}
                onChange={(nextValue) =>
                  updateValue("watermark_opacity_percent", nextValue)
                }
              />
              <RangeField
                id="watermark_rotation_degrees"
                label="Rotation"
                value={values.watermark_rotation_degrees}
                min={-60}
                max={60}
                step={1}
                suffix="°"
                description="Angle applied to each watermark mark."
                error={fieldErrors.watermark_rotation_degrees}
                onChange={(nextValue) =>
                  updateValue("watermark_rotation_degrees", nextValue)
                }
              />
              <RangeField
                id="watermark_font_scale_percent"
                label="Size"
                value={values.watermark_font_scale_percent}
                min={60}
                max={180}
                step={5}
                suffix="%"
                description="Scales the watermark text relative to image size."
                error={fieldErrors.watermark_font_scale_percent}
                onChange={(nextValue) =>
                  updateValue("watermark_font_scale_percent", nextValue)
                }
              />
              <RangeField
                id="watermark_spacing_x_percent"
                label="Horizontal spacing"
                value={values.watermark_spacing_x_percent}
                min={60}
                max={180}
                step={5}
                suffix="%"
                description="Controls how tightly marks repeat across the width."
                error={fieldErrors.watermark_spacing_x_percent}
                onChange={(nextValue) =>
                  updateValue("watermark_spacing_x_percent", nextValue)
                }
              />
              <RangeField
                id="watermark_spacing_y_percent"
                label="Vertical spacing"
                value={values.watermark_spacing_y_percent}
                min={60}
                max={180}
                step={5}
                suffix="%"
                description="Controls how tightly marks repeat down the image."
                error={fieldErrors.watermark_spacing_y_percent}
                onChange={(nextValue) =>
                  updateValue("watermark_spacing_y_percent", nextValue)
                }
              />

              <label className="flex items-start gap-3 rounded-xl border p-4">
                <Checkbox
                  checked={values.watermark_repeat}
                  onCheckedChange={(checked) =>
                    updateValue("watermark_repeat", checked === true)
                  }
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    Repeat watermark across the image
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Turn this off to render a single centered watermark mark.
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  Apply watermark to existing previews
                </h3>
                <p className="text-sm text-muted-foreground">
                  Regenerates existing public product previews using the
                  currently saved watermark settings. Private originals are not
                  modified.
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="regenerate-existing-previews"
                  onClick={handleRegenerateExistingPreviews}
                  disabled={hasUnsavedChanges || isPending || isRegenerationBusy}
                >
                  {isRegenerationBusy
                    ? "Regenerating previews..."
                    : "Apply watermark to existing previews"}
                </Button>

                {hasUnsavedChanges ? (
                  <p className="text-sm text-muted-foreground">
                    Save appearance first.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This uses the currently saved watermark settings only.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border bg-background/95 p-6 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Save changes</h2>
              <p className="text-sm text-muted-foreground">
                Save updates to the existing site settings row when you&apos;re
                happy with the preview.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {showResetConfirm ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isPending}
                  >
                    Cancel reset
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleLoadDefaults}
                    disabled={isPending}
                  >
                    Confirm defaults
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isPending}
                >
                  Reset to defaults
                </Button>
              )}

              <Button
                type="button"
                onClick={handleSaveClick}
                disabled={isPending || isSubmittingSave || !hasUnsavedChanges}
                style={{
                  backgroundColor: "var(--site-primary)",
                  color: "var(--site-surface)",
                  borderRadius: "var(--site-button-radius)",
                }}
              >
                {isPending || isSubmittingSave ? "Saving..." : "Save appearance"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Preview</h2>
          <p className="text-sm text-muted-foreground">
            This preview uses local editor state and does not save automatically.
          </p>
        </div>

        <div
          className="site-theme overflow-hidden rounded-[calc(var(--site-card-radius)+0.35rem)] border shadow-sm"
          style={getSiteThemeVariables(previewSettings)}
        >
          <div className="space-y-6 p-5">
            <div
              className="rounded-[calc(var(--site-card-radius)+0.25rem)] border p-5"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--site-primary) 8%, white)",
                borderColor:
                  "color-mix(in srgb, var(--site-text) 10%, transparent)",
              }}
            >
              <div className="flex items-center gap-3">
                {previewLogoUrl ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-white/75">
                    <Image
                      src={previewLogoUrl}
                      alt={`${values.site_name} logo preview`}
                      fill
                      sizes="56px"
                      className="object-contain p-1.5"
                      unoptimized={previewLogoUrl.startsWith("blob:")}
                    />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold uppercase tracking-[0.24em]"
                    style={{ color: "var(--site-accent)" }}
                  >
                    {values.site_name}
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--site-muted)" }}
                  >
                    {values.tagline}
                  </p>
                </div>
              </div>

              <h3 className="mt-5 text-3xl leading-tight">{values.hero_title}</h3>
              <p
                className="mt-3 text-sm leading-6"
                style={{ color: "var(--site-muted)" }}
              >
                {values.hero_subtitle}
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: "var(--site-primary)",
                    color: "var(--site-surface)",
                    borderRadius: "var(--site-button-radius)",
                  }}
                >
                  Explore the collection
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-[calc(var(--site-card-radius)+0.15rem)] border p-4">
              <p className="text-sm font-medium" style={{ color: "var(--site-muted)" }}>
                Business contact preview
              </p>
              <div className="space-y-2 text-sm">
                {values.contact_email.trim() ? <p>{values.contact_email.trim()}</p> : null}
                {values.contact_phone.trim() ? <p>{values.contact_phone.trim()}</p> : null}
                {values.business_address.trim() ? (
                  <p style={{ color: "var(--site-muted)" }}>
                    {values.business_address.trim()}
                  </p>
                ) : null}
                {values.facebook_url.trim() || values.instagram_url.trim() ? (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {values.facebook_url.trim() ? <span>Facebook</span> : null}
                    {values.instagram_url.trim() ? <span>Instagram</span> : null}
                  </div>
                ) : null}
                {!values.contact_email.trim() &&
                !values.contact_phone.trim() &&
                !values.business_address.trim() &&
                !values.facebook_url.trim() &&
                !values.instagram_url.trim() ? (
                  <p style={{ color: "var(--site-muted)" }}>
                    Add contact details to preview them here.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: "var(--site-muted)" }}>
                Example product card
              </p>
              <ProductCard
                product={previewProduct}
                siteSettings={previewSettings}
                interactive={false}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: "var(--site-muted)" }}>
                  Watermark preview
                </p>
                <p
                  className="text-xs leading-5"
                  style={{ color: "var(--site-muted)" }}
                >
                  This uses the secure server-side renderer with a temporary
                  low-resolution sample image. Saving is still separate.
                </p>
              </div>

              <div className="overflow-hidden rounded-[calc(var(--site-card-radius)+0.15rem)] border bg-muted/20">
                <div className="relative aspect-[5/7] w-full">
                  {watermarkPreview.url ? (
                    <Image
                      src={watermarkPreview.url}
                      alt="Temporary watermark preview"
                      fill
                      sizes="(max-width: 1280px) 100vw, 420px"
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      {watermarkPreview.status === "loading"
                        ? "Generating preview..."
                        : watermarkPreview.message ?? "Preview will appear here."}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border px-3 py-1">
                  {values.watermark_mode === "adaptive"
                    ? "Adaptive contrast mode"
                    : "Manual color mode"}
                </span>
                <span className="rounded-full border px-3 py-1">
                  {values.watermark_repeat ? "Repeated pattern" : "Single mark"}
                </span>
                <span className="rounded-full border px-3 py-1">
                  Preview long edge: 800px
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <AdminConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        title="Save appearance changes?"
        description="These settings will become the saved defaults used by the storefront and future protected previews."
        confirmLabel={isPending || isSubmittingSave ? "Saving..." : "Save appearance"}
        isLoading={isPending || isSubmittingSave}
        disableClose={isPending || isSubmittingSave}
        onConfirm={runSave}
      />

      <AdminConfirmDialog
        open={regenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
        title="Apply watermark to existing previews?"
        description="This will regenerate all existing public product previews from their private originals using the currently saved watermark settings. Clean originals will remain unchanged."
        confirmLabel={isRegenerationBusy ? "Regenerating..." : "Regenerate previews"}
        isLoading={isRegenerationBusy}
        disableClose={isRegenerationBusy}
        onConfirm={async () => {
          setRegenerateConfirmOpen(false);
          await runRegenerateExistingPreviews();
        }}
      >
        <p>
          Existing public previews will be regenerated. Private originals stay
          unchanged, and the currently saved watermark settings will be used.
        </p>
      </AdminConfirmDialog>

      <AdminProgressDialog
        open={previewRegeneration.status !== "idle"}
        onOpenChange={handleCloseRegenerationProgress}
        title="Applying watermark"
        description="Regenerating protected product previews from their saved private originals."
        status={
          previewRegeneration.status === "idle"
            ? "preparing"
            : previewRegeneration.status
        }
        progressLabel={`${previewRegeneration.completed} of ${previewRegeneration.total} previews completed`}
        progressValue={previewRegeneration.completed}
        progressMax={Math.max(previewRegeneration.total, 1)}
        percentage={previewRegeneration.percentage}
        summary={
          previewRegeneration.message ??
          "Regenerating protected product previews..."
        }
        helperText={
          isRegenerationBusy
            ? "Please keep this page open until regeneration is complete."
            : previewRegeneration.status === "completed"
              ? `${previewRegeneration.total} of ${previewRegeneration.total} previews regenerated.`
              : previewRegeneration.status === "completed_with_errors"
                ? `${previewRegeneration.total - previewRegeneration.failed} of ${previewRegeneration.total} previews regenerated.`
                : previewRegeneration.status === "failed"
                  ? "Please try again."
                  : undefined
        }
        currentItemLabel={
          previewRegeneration.status === "running"
            ? previewRegeneration.currentName ??
              `Processing preview ${Math.min(
                previewRegeneration.completed + 1,
                previewRegeneration.total,
              )} of ${previewRegeneration.total}`
            : null
        }
        failureSummary={
          previewRegeneration.failed > 0
            ? `${previewRegeneration.failed} preview${previewRegeneration.failed === 1 ? "" : "s"} could not be regenerated.`
            : null
        }
        failureDetails={
          previewRegeneration.failures.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {previewRegeneration.failures.map((failure) => (
                <li key={`${failure.imageId}-${failure.message}`}>
                  {failure.productName}: {failure.message}
                </li>
              ))}
            </ul>
          ) : undefined
        }
        disableClose={isRegenerationBusy}
        onDone={handleCloseRegenerationProgress}
        onRetry={
          previewRegeneration.status === "completed_with_errors"
            ? handleRetryFailedPreviews
            : undefined
        }
        isRetrying={previewRegeneration.retrying}
      />
    </div>
  );
}
