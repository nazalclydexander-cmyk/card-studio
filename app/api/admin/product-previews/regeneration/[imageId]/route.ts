import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { regenerateProtectedPreviewByImageId } from "@/lib/product-preview-regeneration";

export async function POST(
  _request: Request,
  context: { params: Promise<{ imageId: string }> },
) {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return NextResponse.json(
      {
        success: false,
        imageId: "unknown",
        productName: "Authorization",
        message: "You are not authorized to regenerate product previews.",
      },
      { status: 403 },
    );
  }

  const { imageId } = await context.params;
  const result = await regenerateProtectedPreviewByImageId(imageId);

  return NextResponse.json(result, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
