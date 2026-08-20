"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  createProductImageAction,
  deleteProductImageAction,
  setPrimaryProductImageAction,
  updateProductImageDetailsAction,
} from "@/app/admin/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRODUCT_IMAGES_BUCKET,
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  buildProductImagePath,
  createProductImageFilename,
  type ProductImageRecord,
} from "@/lib/product-images";
import { createClient } from "@/lib/supabase/client";

type ProductImagesManagerProps = {
  productId: string;
  productName: string;
  images: ProductImageRecord[];
};

type FeedbackState = {
  tone: "default" | "destructive";
  message: string;
};

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function getImagePublicUrl(storagePath: string) {
  const supabase = createClient();
  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath)
    .data.publicUrl;
}

function getImageAltText(image: ProductImageRecord, productName: string) {
  return image.alt_text?.trim() || `${productName} product image`;
}

export function ProductImagesManager({
  productId,
  productName,
  images,
}: ProductImagesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const sortedImages = useMemo(
    () =>
      [...images].sort((left, right) => {
        if (left.is_primary !== right.is_primary) {
          return left.is_primary ? -1 : 1;
        }

        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }

        return left.created_at.localeCompare(right.created_at);
      }),
    [images],
  );

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFiles?.length) {
      setFeedback({
        tone: "destructive",
        message: "Choose at least one image before uploading.",
      });
      return;
    }

    setFeedback(null);

    const supabase = createClient();
    const uploadErrors: string[] = [];
    const uploadedCount = { current: 0 };
    const form = event.currentTarget;

    for (const file of Array.from(selectedFiles)) {
      if (!PRODUCT_IMAGE_ALLOWED_MIME_TYPES.includes(file.type as never)) {
        uploadErrors.push(
          `${file.name}: unsupported file type. Use JPG, PNG, or WebP.`,
        );
        continue;
      }

      if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES) {
        uploadErrors.push(
          `${file.name}: file is larger than ${formatBytes(PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES)}.`,
        );
        continue;
      }

      const generatedFilename = createProductImageFilename(file.type);

      if (!generatedFilename) {
        uploadErrors.push(`${file.name}: unsupported file type.`);
        continue;
      }

      const storagePath = buildProductImagePath(productId, generatedFilename);
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        uploadErrors.push(`${file.name}: upload failed. Please try again.`);
        continue;
      }

      const metadataResult = await createProductImageAction({
        productId,
        storagePath,
      });

      if (!metadataResult.success) {
        await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);
        uploadErrors.push(
          `${file.name}: upload succeeded but the image record could not be saved.`,
        );
        continue;
      }

      uploadedCount.current += 1;
    }

    form.reset();
    setSelectedFiles(null);

    if (uploadedCount.current > 0) {
      router.refresh();
    }

    if (uploadErrors.length > 0) {
      setFeedback({
        tone: uploadedCount.current > 0 ? "default" : "destructive",
        message:
          uploadedCount.current > 0
            ? `Uploaded ${uploadedCount.current} image(s). Some files still need attention: ${uploadErrors.join(" ")}`
            : uploadErrors.join(" "),
      });
      return;
    }

    setFeedback({
      tone: "default",
      message: `Uploaded ${uploadedCount.current} image(s) successfully.`,
    });
  }

  function handleDetailsSave(
    event: React.FormEvent<HTMLFormElement>,
    imageId: string,
  ) {
    event.preventDefault();
    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const altText = typeof formData.get("alt_text") === "string"
      ? formData.get("alt_text")?.toString() ?? ""
      : "";
    const sortOrderValue = typeof formData.get("sort_order") === "string"
      ? formData.get("sort_order")?.toString() ?? ""
      : "";

    startTransition(async () => {
      const result = await updateProductImageDetailsAction({
        imageId,
        productId,
        altText,
        sortOrder: sortOrderValue,
      });

      setFeedback({
        tone: result.success ? "default" : "destructive",
        message: result.message,
      });

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleSetPrimary(imageId: string) {
    setFeedback(null);

    startTransition(async () => {
      const result = await setPrimaryProductImageAction({
        imageId,
        productId,
      });

      setFeedback({
        tone: result.success ? "default" : "destructive",
        message: result.message,
      });

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleDeleteImage(imageId: string) {
    const confirmed = window.confirm(
      "Delete this image from both the catalog metadata and Supabase Storage?",
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result = await deleteProductImageAction({
        imageId,
        productId,
      });

      setFeedback({
        tone: result.success ? "default" : "destructive",
        message: result.message,
      });

      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-6 rounded-2xl border p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Product images</h2>
        <p className="text-sm text-muted-foreground">
          Upload JPG, PNG, or WebP images up to{" "}
          {formatBytes(PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES)} each. The first image
          becomes the primary catalog image automatically when none exists yet.
        </p>
      </div>

      {feedback ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.tone === "destructive"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <form
        onSubmit={handleUpload}
        className="space-y-4 rounded-xl border border-dashed p-4"
      >
        <div className="space-y-2">
          <Label htmlFor="product-images-upload">Upload images</Label>
          <Input
            id="product-images-upload"
            type="file"
            accept={PRODUCT_IMAGE_ALLOWED_MIME_TYPES.join(",")}
            multiple
            onChange={(event) => setSelectedFiles(event.target.files)}
            disabled={isPending}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Working..." : "Upload selected images"}
        </Button>
      </form>

      {sortedImages.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No images uploaded yet for {productName}.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedImages.map((image) => (
            <article
              key={image.id}
              className="space-y-4 rounded-xl border p-4"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted/40">
                <div className="relative h-full w-full">
                  <Image
                    src={getImagePublicUrl(image.storage_path)}
                    alt={getImageAltText(image, productName)}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {image.is_primary ? (
                  <span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground">
                    Primary image
                  </span>
                ) : (
                  <span className="rounded-full border px-3 py-1 text-muted-foreground">
                    Secondary image
                  </span>
                )}
                <span className="rounded-full border px-3 py-1 text-muted-foreground">
                  Sort order: {image.sort_order}
                </span>
              </div>

              <form
                onSubmit={(event) => handleDetailsSave(event, image.id)}
                className="grid gap-4"
              >
                <div className="space-y-2">
                  <Label htmlFor={`alt-text-${image.id}`}>Alt text</Label>
                  <Input
                    id={`alt-text-${image.id}`}
                    name="alt_text"
                    defaultValue={image.alt_text ?? ""}
                    maxLength={160}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`sort-order-${image.id}`}>Sort order</Label>
                  <Input
                    id={`sort-order-${image.id}`}
                    name="sort_order"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={image.sort_order}
                    disabled={isPending}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="outline" disabled={isPending}>
                    Save details
                  </Button>

                  {!image.is_primary ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleSetPrimary(image.id)}
                      disabled={isPending}
                    >
                      Make primary
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDeleteImage(image.id)}
                    disabled={isPending}
                  >
                    Delete image
                  </Button>
                </div>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
