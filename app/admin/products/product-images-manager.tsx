"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import {
  deleteProductImageAction,
  setPrimaryProductImageAction,
  uploadProtectedProductImagesAction,
  updateProductImageDetailsAction,
} from "@/app/admin/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  getProductPreviewPublicUrl,
  type ProductImageRecord,
} from "@/lib/product-images";

type ProductImagesManagerProps = {
  productId: string;
  productName: string;
  images: ProductImageRecord[];
};

type FeedbackState = {
  tone: "default" | "destructive";
  message: string;
};

type SelectedImagePreview = {
  id: string;
  fileName: string;
  originalUrl: string;
  protectedPreviewUrl: string | null;
  status: "loading" | "ready" | "error";
  message: string | null;
};

function revokeSelectedImagePreviewUrls(previews: SelectedImagePreview[]) {
  for (const item of previews) {
    URL.revokeObjectURL(item.originalUrl);
    if (item.protectedPreviewUrl) {
      URL.revokeObjectURL(item.protectedPreviewUrl);
    }
  }
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
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
  const [imagePendingDelete, setImagePendingDelete] = useState<{
    id: string;
    fileName: string;
  } | null>(null);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<
    SelectedImagePreview[]
  >([]);

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

  function handleSelectedFilesChange(fileList: FileList | null) {
    if (!fileList?.length) {
      setSelectedFiles(null);
      setSelectedImagePreviews((current) => {
        revokeSelectedImagePreviewUrls(current);
        return [];
      });
      return;
    }

    setSelectedFiles(fileList);
  }

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    const createdOriginalUrls: string[] = [];
    const generatedPreviewUrls: string[] = [];

    async function generateSelectedPreviews(files: File[]) {
      const previewEntries = files.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        fileName: file.name,
        originalUrl: URL.createObjectURL(file),
        protectedPreviewUrl: null,
        status: "loading" as const,
        message: null,
      }));
      createdOriginalUrls.push(...previewEntries.map((entry) => entry.originalUrl));

      setSelectedImagePreviews(previewEntries);

      await Promise.all(
        previewEntries.map(async (entry, index) => {
          const file = files[index];

          try {
            const previewFormData = new FormData();
            previewFormData.set("image", file);

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
            const protectedPreviewUrl = URL.createObjectURL(previewBlob);
            generatedPreviewUrls.push(protectedPreviewUrl);

            if (!isActive) {
              URL.revokeObjectURL(protectedPreviewUrl);
              return;
            }

            setSelectedImagePreviews((current) =>
              current.map((item) =>
                item.id === entry.id
                  ? {
                      ...item,
                      protectedPreviewUrl,
                      status: "ready",
                    }
                  : item,
              ),
            );
          } catch {
            if (!isActive || controller.signal.aborted) {
              return;
            }

            setSelectedImagePreviews((current) =>
              current.map((item) =>
                item.id === entry.id
                  ? {
                      ...item,
                      status: "error",
                      message:
                        "The protected preview could not be generated right now.",
                    }
                  : item,
              ),
            );
          }
        }),
      );
    }

    const files = selectedFiles ? Array.from(selectedFiles) : [];

    if (!files.length) {
      return () => {
        isActive = false;
        controller.abort();
      };
    }

    void generateSelectedPreviews(files);

    return () => {
      isActive = false;
      controller.abort();

      for (const url of createdOriginalUrls) {
        URL.revokeObjectURL(url);
      }

      for (const url of generatedPreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [selectedFiles]);

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
    const form = event.currentTarget;
    const uploadFormData = new FormData();
    uploadFormData.set("product_id", productId);

    for (const file of Array.from(selectedFiles)) {
      uploadFormData.append("images", file);
    }

    const result = await uploadProtectedProductImagesAction(uploadFormData);

    form.reset();
    setSelectedFiles(null);

    setFeedback({
      tone: result.success ? "default" : "destructive",
      message: result.message,
    });

    if (result.success) {
      router.refresh();
    }
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
    const targetImage = images.find((image) => image.id === imageId);

    setImagePendingDelete({
      id: imageId,
      fileName:
        targetImage?.alt_text?.trim() ||
        `${productName} image${targetImage?.is_primary ? " (primary)" : ""}`,
    });
  }

  return (
    <>
      <section className="space-y-6 rounded-2xl border p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Product images</h2>
          <p className="text-sm text-muted-foreground">
            Upload JPG, PNG, or WebP images up to{" "}
            {formatBytes(PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES)} each. The first image
            becomes the primary catalog image automatically when none exists yet.
            Clean originals stay private, and a protected preview is generated
            automatically for the storefront.
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
              onChange={(event) => handleSelectedFilesChange(event.target.files)}
              disabled={isPending}
            />
          </div>

          {selectedImagePreviews.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {selectedImagePreviews.map((preview) => (
                <div key={preview.id} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {preview.fileName}
                    </p>
                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      Temporary preview
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Original selected
                      </p>
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border bg-muted/30">
                        <Image
                          src={preview.originalUrl}
                          alt={`${preview.fileName} original preview`}
                          fill
                          sizes="(max-width: 640px) 100vw, 240px"
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Protected preview
                      </p>
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border bg-muted/30">
                        {preview.protectedPreviewUrl ? (
                          <Image
                            src={preview.protectedPreviewUrl}
                            alt={`${preview.fileName} protected preview`}
                            fill
                            sizes="(max-width: 640px) 100vw, 240px"
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                            {preview.status === "loading"
                              ? "Generating protected preview..."
                              : preview.message ?? "Preview unavailable"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

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
              <ProductImageArticle
                key={image.id}
                image={image}
                productName={productName}
                isPending={isPending}
                onDelete={handleDeleteImage}
                onSetPrimary={handleSetPrimary}
                onSave={handleDetailsSave}
              />
            ))}
          </div>
        )}
      </section>

      <AdminConfirmDialog
        open={Boolean(imagePendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setImagePendingDelete(null);
          }
        }}
        title="Delete this image?"
        description={
          imagePendingDelete
            ? `This will permanently remove "${imagePendingDelete.fileName}" from the catalog and storage. This action cannot be undone.`
            : "This image will be permanently removed."
        }
        confirmLabel={isPending ? "Deleting..." : "Delete image"}
        variant="destructive"
        isLoading={isPending}
        disableClose={isPending}
        onConfirm={async () => {
          if (!imagePendingDelete) {
            return;
          }

          const imageId = imagePendingDelete.id;
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
              setImagePendingDelete(null);
              router.refresh();
            }
          });
        }}
      />
    </>
  );
}

function ProductImageArticle({
  image,
  productName,
  isPending,
  onDelete,
  onSetPrimary,
  onSave,
}: {
  image: ProductImageRecord;
  productName: string;
  isPending: boolean;
  onDelete: (imageId: string) => void;
  onSetPrimary: (imageId: string) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>, imageId: string) => void;
}) {
  const previewUrl = getProductPreviewPublicUrl(image);

  return (
    <article className="space-y-4 rounded-xl border p-4">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted/40">
        <div className="relative h-full w-full">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={getImageAltText(image, productName)}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              draggable={false}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Preview unavailable
            </div>
          )}
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

      <form onSubmit={(event) => onSave(event, image.id)} className="grid gap-4">
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
              onClick={() => onSetPrimary(image.id)}
              disabled={isPending}
            >
              Make primary
            </Button>
          ) : null}

          <Button
            type="button"
            variant="destructive"
            onClick={() => onDelete(image.id)}
            disabled={isPending}
          >
            Delete image
          </Button>
        </div>
      </form>
    </article>
  );
}
