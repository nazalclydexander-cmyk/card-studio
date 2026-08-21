"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import {
  getPrimaryProductImage,
  type PublicProductImage,
} from "@/lib/public-catalog-shared";
import { getProductPreviewPublicUrl } from "@/lib/product-images";
import { cn } from "@/lib/utils";

type ProductImageGalleryProps = {
  images: PublicProductImage[] | null;
  productName: string;
};

function getImageAltText(
  image: PublicProductImage,
  productName: string,
  imageNumber: number,
) {
  return image.alt_text?.trim() || `${productName} image ${imageNumber}`;
}

export function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const sortedImages = useMemo(
    () =>
      [...(images ?? [])].sort((left, right) => {
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

  const initialImage =
    getPrimaryProductImage(sortedImages) ?? sortedImages[0] ?? null;
  const [selectedPath, setSelectedPath] = useState<string | null>(
    initialImage?.preview_path ?? initialImage?.storage_path ?? null,
  );

  const selectedImage =
    sortedImages.find(
      (image) => (image.preview_path ?? image.storage_path) === selectedPath,
    ) ??
    initialImage;

  if (!sortedImages.length || !selectedImage) {
    return (
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[calc(var(--site-card-radius)+0.35rem)] border px-6 text-center text-sm shadow-sm"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--site-secondary) 18%, white) 0%, color-mix(in srgb, var(--site-background) 90%, white) 100%)",
          borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
          color: "var(--site-muted)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-[10%] rounded-[calc(var(--site-card-radius)+0.1rem)] border bg-white/80 shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
          style={{
            borderColor: "color-mix(in srgb, var(--site-text) 6%, transparent)",
          }}
        />
        <div className="relative z-10 space-y-2">
          <div
            className="mx-auto h-20 w-28 rounded-2xl border bg-white/90 shadow-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--site-text) 7%, transparent)",
            }}
          />
          <p>Design gallery</p>
        </div>
      </div>
    );
  }

  const selectedUrl = getProductPreviewPublicUrl(selectedImage);

  return (
    <div className="space-y-4">
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[calc(var(--site-card-radius)+0.35rem)] border px-5 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:px-6"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--site-secondary) 16%, white) 0%, color-mix(in srgb, var(--site-background) 90%, white) 100%)",
          borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-[6%] rounded-[calc(var(--site-card-radius)+0.1rem)] border bg-white/85 shadow-[0_28px_60px_rgba(15,23,42,0.08)]"
          style={{
            borderColor: "color-mix(in srgb, var(--site-text) 6%, transparent)",
          }}
        />
        {selectedUrl ? (
          <Image
            src={selectedUrl}
            alt={getImageAltText(selectedImage, productName, 1)}
            fill
            sizes="(max-width: 1024px) 100vw, 56vw"
            draggable={false}
            className="object-contain p-5"
          />
        ) : null}
      </div>

      {sortedImages.length > 1 ? (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {sortedImages.map((image, index) => {
            const imageUrl = getProductPreviewPublicUrl(image);
            const imageKey = image.preview_path ?? image.storage_path;
            const isSelected =
              imageKey ===
              (selectedImage.preview_path ?? selectedImage.storage_path);

            if (!imageUrl) {
              return null;
            }

            return (
              <button
                key={imageKey}
                type="button"
                onClick={() => setSelectedPath(imageKey)}
                className={cn(
                  "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-24 sm:w-24",
                  isSelected && "shadow-sm",
                )}
                style={{
                  borderColor: isSelected
                    ? "var(--site-primary)"
                    : "color-mix(in srgb, var(--site-text) 10%, transparent)",
                  backgroundColor: "var(--site-surface)",
                }}
                aria-label={`View image ${index + 1} of ${productName}`}
                aria-pressed={isSelected}
              >
                <Image
                  src={imageUrl}
                  alt={getImageAltText(image, productName, index + 1)}
                  fill
                  sizes="96px"
                  draggable={false}
                  className="object-contain p-1.5"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
