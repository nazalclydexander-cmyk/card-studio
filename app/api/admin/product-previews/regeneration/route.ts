import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { prepareProtectedPreviewRegeneration } from "@/lib/product-preview-regeneration";

export async function POST() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return NextResponse.json(
      {
        success: false,
        message: "You are not authorized to regenerate product previews.",
      },
      { status: 403 },
    );
  }

  const result = await prepareProtectedPreviewRegeneration();

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: result.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
