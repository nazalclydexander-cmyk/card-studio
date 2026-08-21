import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin";
import {
  backfillLegacyProductImage,
  inspectProductImageBackfill,
} from "@/lib/product-image-storage";
import { createClient } from "@/lib/supabase/server";

type BackfillQueryRow = {
  id: string;
  product_id: string;
  storage_path: string;
  preview_path: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  product:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
  original:
    | {
        storage_path: string;
      }
    | {
        storage_path: string;
      }[]
    | null;
};

export async function POST(request: Request) {
  const access = await getAdminAccess();

  if (!access.userId) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication is required.",
      },
      { status: 401 },
    );
  }

  if (!access.isAdmin) {
    return NextResponse.json(
      {
        success: false,
        message: "Administrator access is required.",
      },
      { status: 403 },
    );
  }

  let mode: "single" | "all" | null = null;
  let confirmAll = false;
  let dryRun = false;
  let limit = 50;
  let productId: string | null = null;

  try {
    const payload = (await request.json()) as
      | {
          mode?: "single" | "all";
          confirm?: boolean;
          dryRun?: boolean;
          limit?: number;
          productId?: string;
        }
      | null;

    mode = payload?.mode === "single" || payload?.mode === "all"
      ? payload.mode
      : null;
    confirmAll = payload?.confirm === true;
    dryRun = payload?.dryRun === true;

    if (typeof payload?.limit === "number" && Number.isFinite(payload.limit)) {
      limit = Math.max(1, Math.min(200, Math.trunc(payload.limit)));
    }

    if (typeof payload?.productId === "string" && payload.productId.trim()) {
      productId = payload.productId.trim();
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "A JSON body is required. Use mode='single' with a productId, or mode='all' with confirm=true.",
      },
      { status: 400 },
    );
  }

  if (mode === "single" && !productId) {
    return NextResponse.json(
      {
        success: false,
        message: "Single-product backfill requires a productId.",
      },
      { status: 400 },
    );
  }

  if (mode === "all" && !confirmAll) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Bulk backfill requires confirm=true so all images are not migrated accidentally.",
      },
      { status: 400 },
    );
  }

  if (!mode) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Specify mode='single' with productId, or mode='all' with confirm=true.",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from("product_images")
    .select(
      `
        id,
        product_id,
        storage_path,
        preview_path,
        alt_text,
        sort_order,
        is_primary,
        product:products!product_images_product_id_fkey (
          name
        ),
        original:product_image_originals (
          storage_path
        )
      `,
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (productId) {
    query = query.eq("product_id", productId);
  } else if (mode === "all") {
    query = query.is("preview_path", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load legacy product images for backfill", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Legacy product images could not be loaded.",
      },
      { status: 500 },
    );
  }

  const rows = ((data ?? []) as BackfillQueryRow[]).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    storage_path: row.storage_path,
    preview_path: row.preview_path,
    product_name: Array.isArray(row.product) ? row.product[0]?.name ?? null : row.product?.name ?? null,
    original_storage_path: Array.isArray(row.original)
      ? row.original[0]?.storage_path ?? null
      : row.original?.storage_path ?? null,
    alt_text: row.alt_text,
    sort_order: row.sort_order,
    is_primary: row.is_primary,
  }));

  if (dryRun) {
    const inspections = await Promise.all(
      rows.map((image) =>
        inspectProductImageBackfill({
          supabase,
          image,
        }),
      ),
    );

    return NextResponse.json({
      dryRun: true,
      mode,
      productId,
      wouldProcess: inspections.length,
      images: inspections.map((inspection) => ({
        product: inspection.productName,
        productId: inspection.productId,
        imageId: inspection.imageId,
        currentLegacyStoragePath: inspection.legacyStoragePath,
        previewPath: inspection.previewPath,
        previewPathExistsInDatabase: inspection.previewPathExistsInDatabase,
        previewObjectExists: inspection.previewObjectExists,
        originalStoragePath: inspection.originalStoragePath,
        originalRecordExists: inspection.originalRecordExists,
        originalObjectExists: inspection.originalObjectExists,
        legacyObjectExists: inspection.legacyObjectExists,
        migrationNeeded: inspection.migrationNeeded,
      })),
    });
  }

  const results: Array<{
    product: string | null;
    imageId: string;
    productId: string;
    success: boolean;
    changed: boolean;
    reused: boolean;
    skipped: boolean;
    repaired: string[];
    originalCreated: boolean;
    originalReused: boolean;
    previewCreated: boolean;
    previewReused: boolean;
    legacyDeleted: boolean;
    message: string;
  }> = [];

  for (const image of rows) {
    const result = await backfillLegacyProductImage({
      supabase,
      image,
    });

    results.push({
      product: image.product_name,
      imageId: image.id,
      productId: image.product_id,
      success: result.success,
      changed: result.changed,
      reused: result.reused,
      skipped: result.skipped,
      repaired: result.repaired,
      originalCreated: result.originalCreated,
      originalReused: result.originalReused,
      previewCreated: result.previewCreated,
      previewReused: result.previewReused,
      legacyDeleted: result.legacyDeleted,
      message: result.message,
    });
  }

  const processed = results.length;
  const protectedCount = results.filter((result) => result.success && result.changed).length;
  const reused = results.filter((result) => result.reused).length;
  const skipped = results.filter((result) => result.skipped && !result.reused).length;
  const legacyDeleted = results.filter((result) => result.legacyDeleted).length;
  const failures = results.filter((result) => !result.success);

  return NextResponse.json({
    success: failures.length === 0,
    mode,
    dryRun: false,
    processed,
    protected: protectedCount,
    reused,
    skipped,
    legacyDeleted,
    failures: failures.map((result) => ({
      product: result.product,
      imageId: result.imageId,
      productId: result.productId,
      message: result.message,
    })),
    results,
  });
}
