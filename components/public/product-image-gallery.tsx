"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import {
  getPrimaryProductImage,
  type PublicProductImage,
} from "@/lib/public-catalog-shared";
import { getProductImagePublicUrl } from "@/lib/product-images";

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
    initialImage?.storage_path ?? null,
  );

  const selectedImage =
    sortedImages.find((image) => image.storage_path === selectedPath) ??
    initialImage;

  if (!sortedImages.length || !selectedImage) {
    return (
      <div
        className="flex aspect-[4/3] items-center justify-center rounded-[calc(var(--site-card-radius)+0.25rem)] border border-dashed border-black/10 px-6 text-center text-sm shadow-sm"
        style={{
          backgroundColor: "color-mix(in srgb, var(--site-secondary) 12%, white)",
          color: "var(--site-muted)",
        }}
      >
        Product gallery coming soon
      </div>
    );
  }

  const selectedUrl = getProductImagePublicUrl(selectedImage.storage_path);

  return (
    <div className="space-y-4">
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[calc(var(--site-card-radius)+0.25rem)] border p-4 shadow-sm"
        style={{
          backgroundColor: "color-mix(in srgb, var(--site-secondary) 12%, white)",
          borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
        }}
      >
        {selectedUrl ? (
          <Image
            src={selectedUrl}
            alt={getImageAltText(selectedImage, productName, 1)}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-4"
          />
        ) : null}
      </div>

      {sortedImages.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {sortedImages.map((image, index) => {
            const imageUrl = getProductImagePublicUrl(image.storage_path);
            const isSelected = image.storage_path === selectedImage.storage_path;

            if (!imageUrl) {
              return null;
            }

            return (
              <button
                key={image.storage_path}
                type="button"
                onClick={() => setSelectedPath(image.storage_path)}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  sizes="80px"
                  className="object-contain p-1"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
