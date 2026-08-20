"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import {
  PRODUCT_IMAGES_BUCKET,
  isValidProductImagePath,
} from "@/lib/product-images";
import { createClient } from "@/lib/supabase/server";
import {
  createInitialProductFormState,
  defaultProductValues,
  isAllowedOrientation,
  type FieldErrors,
  type ProductFormState,
  type ProductFormValues,
} from "@/app/admin/products/form-state";

function normalizeTextValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getCheckboxValue(formData: FormData, field: string) {
  return formData.get(field) === "on";
}

function getFormValues(formData: FormData): ProductFormValues {
  return {
    name: normalizeTextValue(formData.get("name")),
    category_id: normalizeTextValue(formData.get("category_id")),
    short_description: normalizeTextValue(formData.get("short_description")),
    description: normalizeTextValue(formData.get("description")),
    price_from: normalizeTextValue(formData.get("price_from")),
    show_price: getCheckboxValue(formData, "show_price"),
    theme: normalizeTextValue(formData.get("theme")),
    orientation: normalizeTextValue(formData.get("orientation")),
    format: normalizeTextValue(formData.get("format")),
    customizable: getCheckboxValue(formData, "customizable"),
    featured: getCheckboxValue(formData, "featured"),
    active: getCheckboxValue(formData, "active"),
  };
}

function slugifyProductName(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "product";
}

async function resolveUniqueSlug(
  baseSlug: string,
  currentProductId?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (currentProductId) {
    query = query.neq("id", currentProductId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to check product slug uniqueness", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return `${baseSlug}-${Date.now()}`;
  }

  const existingSlugs = new Set((data ?? []).map((product) => product.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;

  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

function validateProductValues(values: ProductFormValues) {
  const fieldErrors: FieldErrors = {};

  if (!values.name) {
    fieldErrors.name = "Product name is required.";
  }

  if (!values.category_id) {
    fieldErrors.category_id = "Please select a category.";
  }

  if (
    values.orientation &&
    !isAllowedOrientation(values.orientation)
  ) {
    fieldErrors.orientation = "Please choose a valid orientation.";
  }

  if (values.price_from) {
    const parsedPrice = Number(values.price_from);

    if (Number.isNaN(parsedPrice)) {
      fieldErrors.price_from = "Price must be a valid number.";
    } else if (parsedPrice < 0) {
      fieldErrors.price_from = "Price must be greater than or equal to 0.";
    }
  }

  return fieldErrors;
}

function getSanitizedPayload(values: ProductFormValues, slug: string) {
  return {
    name: values.name,
    slug,
    category_id: values.category_id,
    short_description: values.short_description || null,
    description: values.description || null,
    price_from: values.price_from ? Number(values.price_from) : null,
    show_price: values.show_price,
    theme: values.theme || null,
    orientation: values.orientation || null,
    format: values.format || null,
    customizable: values.customizable,
    featured: values.featured,
    active: values.active,
  };
}

async function ensureAdminAccess() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return false;
  }

  return true;
}

function mapDatabaseErrorToMessage(errorCode: string | null) {
  if (errorCode === "23505") {
    return "A product with similar details already exists. Please review the name and try again.";
  }

  if (errorCode === "23503") {
    return "The selected category is no longer available. Please choose another category.";
  }

  return "We couldn't save the product right now. Please review the form and try again.";
}

function revalidateProductRoutes() {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

function revalidatePublicProductSlug(slug: string | null | undefined) {
  if (!slug) {
    return;
  }

  revalidatePath(`/products/${slug}`);
}

async function getProductSlugById(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load product slug for revalidation", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return null;
  }

  return data?.slug ?? null;
}

async function revalidateProductRoutesForId(
  productId: string,
  knownSlug?: string | null,
) {
  revalidateProductRoutes();
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePublicProductSlug(knownSlug ?? (await getProductSlugById(productId)));
}

function mapProductImageErrorToMessage(errorCode: string | null) {
  if (errorCode === "23503") {
    return "That product no longer exists. Refresh the page and try again.";
  }

  if (errorCode === "23505") {
    return "That image record already exists. Please refresh and try again.";
  }

  return "We couldn't save that image change right now. Please try again.";
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (!(await ensureAdminAccess())) {
    return {
      ...createInitialProductFormState(getFormValues(formData)),
      message: "You are not authorized to manage products.",
    };
  }

  const values = getFormValues(formData);
  const fieldErrors = validateProductValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
      values,
    };
  }

  const slug = await resolveUniqueSlug(slugifyProductName(values.name));
  const payload = getSanitizedPayload(values, slug);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) {
    if (error) {
      console.error("Failed to create product", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }

    return {
      success: false,
      message: mapDatabaseErrorToMessage(error?.code ?? null),
      fieldErrors: {},
      values,
    };
  }

  revalidateProductRoutes();
  revalidatePublicProductSlug(slug);
  redirect(`/admin/products/${data.id}/edit?created=1`);
}

export async function updateProductAction(
  productId: string,
  currentSlug: string,
  currentName: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (!(await ensureAdminAccess())) {
    return {
      ...createInitialProductFormState(getFormValues(formData)),
      message: "You are not authorized to manage products.",
    };
  }

  const values = getFormValues(formData);
  const fieldErrors = validateProductValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
      values,
    };
  }

  const slug =
    values.name === currentName
      ? currentSlug
      : await resolveUniqueSlug(slugifyProductName(values.name), productId);

  const payload = getSanitizedPayload(values, slug);
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", productId);

  if (error) {
    console.error("Failed to update product", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      message: mapDatabaseErrorToMessage(error.code),
      fieldErrors: {},
      values,
    };
  }

  revalidateProductRoutes();
  revalidatePublicProductSlug(currentSlug);
  revalidatePublicProductSlug(slug);
  redirect(`/admin/products/${productId}/edit?updated=1`);
}

export async function toggleProductActiveAction(
  productId: string,
  nextActive: boolean,
) {
  if (!(await ensureAdminAccess())) {
    redirect("/admin/products?denied=1");
  }

  const currentSlug = await getProductSlugById(productId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active: nextActive })
    .eq("id", productId);

  if (error) {
    console.error("Failed to toggle product status", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    redirect("/admin/products?error=toggle");
  }

  revalidateProductRoutes();
  revalidatePublicProductSlug(currentSlug);
  redirect("/admin/products");
}

export async function deleteProductAction(
  productId: string,
  productName: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (!(await ensureAdminAccess())) {
    return {
      ...createInitialProductFormState(),
      message: "You are not authorized to delete products.",
    };
  }

  const confirmed = formData.get("confirm_delete") === "on";
  const typedName = normalizeTextValue(formData.get("delete_name"));

  if (!confirmed || typedName !== productName) {
    return {
      success: false,
      message:
        "Please confirm deletion and type the product name exactly before deleting.",
      fieldErrors: {
        confirm_delete: "Confirmation is required before deleting this product.",
      },
      values: defaultProductValues,
    };
  }

  const supabase = await createClient();
  const currentSlug = await getProductSlugById(productId);
  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    console.error("Failed to delete product", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      message:
        "We couldn't delete the product right now. Please try again in a moment.",
      fieldErrors: {},
      values: defaultProductValues,
    };
  }

  revalidateProductRoutes();
  revalidatePublicProductSlug(currentSlug);
  redirect("/admin/products?deleted=1");
}

export async function createProductImageAction({
  productId,
  storagePath,
}: {
  productId: string;
  storagePath: string;
}) {
  if (!(await ensureAdminAccess())) {
    return {
      success: false,
      message: "You are not authorized to add product images.",
    };
  }

  if (!isValidProductImagePath(storagePath) || !storagePath.startsWith(`products/${productId}/`)) {
    return {
      success: false,
      message: "The uploaded image path is invalid.",
    };
  }

  const supabase = await createClient();
  const [{ data: existingImages, error: existingImagesError }] = await Promise.all([
    supabase
      .from("product_images")
      .select("id, is_primary, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
  ]);

  if (existingImagesError) {
    console.error("Failed to inspect existing product images", {
      code: existingImagesError.code,
      message: existingImagesError.message,
      details: existingImagesError.details,
      hint: existingImagesError.hint,
    });

    return {
      success: false,
      message: mapProductImageErrorToMessage(existingImagesError.code),
    };
  }

  const nextSortOrder =
    (existingImages ?? []).reduce((highest, image) => {
      return image.sort_order > highest ? image.sort_order : highest;
    }, -1) + 1;

  const shouldBePrimary = !(existingImages ?? []).some((image) => image.is_primary);
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_text: null,
    sort_order: nextSortOrder,
    is_primary: shouldBePrimary,
  });

  if (error) {
    console.error("Failed to create product image record", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      message: mapProductImageErrorToMessage(error.code),
    };
  }

  await revalidateProductRoutesForId(productId);

  return {
    success: true,
    message: "Image uploaded successfully.",
  };
}

export async function updateProductImageDetailsAction({
  imageId,
  productId,
  altText,
  sortOrder,
}: {
  imageId: string;
  productId: string;
  altText: string;
  sortOrder: string;
}) {
  if (!(await ensureAdminAccess())) {
    return {
      success: false,
      message: "You are not authorized to update product images.",
    };
  }

  const parsedSortOrder = Number(sortOrder);

  if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
    return {
      success: false,
      message: "Sort order must be a whole number greater than or equal to 0.",
    };
  }

  const normalizedAltText = altText.trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_images")
    .update({
      alt_text: normalizedAltText || null,
      sort_order: parsedSortOrder,
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    console.error("Failed to update product image details", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      message: mapProductImageErrorToMessage(error.code),
    };
  }

  await revalidateProductRoutesForId(productId);

  return {
    success: true,
    message: "Image details saved.",
  };
}

export async function setPrimaryProductImageAction({
  imageId,
  productId,
}: {
  imageId: string;
  productId: string;
}) {
  if (!(await ensureAdminAccess())) {
    return {
      success: false,
      message: "You are not authorized to update product images.",
    };
  }

  const supabase = await createClient();
  const { data: targetImage, error: targetImageError } = await supabase
    .from("product_images")
    .select("id")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (targetImageError || !targetImage) {
    if (targetImageError) {
      console.error("Failed to load product image for primary update", {
        code: targetImageError.code,
        message: targetImageError.message,
        details: targetImageError.details,
        hint: targetImageError.hint,
      });
    }

    return {
      success: false,
      message: "We couldn't find that product image anymore.",
    };
  }

  const { error: clearError } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .neq("id", imageId);

  if (clearError) {
    console.error("Failed to clear previous primary image", {
      code: clearError.code,
      message: clearError.message,
      details: clearError.details,
      hint: clearError.hint,
    });

    return {
      success: false,
      message: mapProductImageErrorToMessage(clearError.code),
    };
  }

  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    console.error("Failed to set primary product image", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      message: mapProductImageErrorToMessage(error.code),
    };
  }

  await revalidateProductRoutesForId(productId);

  return {
    success: true,
    message: "Primary image updated.",
  };
}

export async function deleteProductImageAction({
  imageId,
  productId,
}: {
  imageId: string;
  productId: string;
}) {
  if (!(await ensureAdminAccess())) {
    return {
      success: false,
      message: "You are not authorized to delete product images.",
    };
  }

  const supabase = await createClient();
  const { data: image, error: imageError } = await supabase
    .from("product_images")
    .select("id, storage_path, is_primary")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (imageError || !image) {
    if (imageError) {
      console.error("Failed to load product image for deletion", {
        code: imageError.code,
        message: imageError.message,
        details: imageError.details,
        hint: imageError.hint,
      });
    }

    return {
      success: false,
      message: "We couldn't find that product image anymore.",
    };
  }

  const { error: deleteRowError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId);

  if (deleteRowError) {
    console.error("Failed to delete product image record", {
      code: deleteRowError.code,
      message: deleteRowError.message,
      details: deleteRowError.details,
      hint: deleteRowError.hint,
    });

    return {
      success: false,
      message: mapProductImageErrorToMessage(deleteRowError.code),
    };
  }

  const { error: storageError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([image.storage_path]);

  if (storageError) {
    console.error("Failed to delete product image from storage", {
      message: storageError.message,
    });

    return {
      success: false,
      message:
        "The image record was removed, but the storage file could not be deleted automatically. Please try the cleanup again.",
    };
  }

  if (image.is_primary) {
    const { data: nextImage, error: nextImageError } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextImageError) {
      console.error("Failed to load replacement primary image", {
        code: nextImageError.code,
        message: nextImageError.message,
        details: nextImageError.details,
        hint: nextImageError.hint,
      });
    } else if (nextImage) {
      const { error: promoteError } = await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", nextImage.id)
        .eq("product_id", productId);

      if (promoteError) {
        console.error("Failed to promote replacement primary image", {
          code: promoteError.code,
          message: promoteError.message,
          details: promoteError.details,
          hint: promoteError.hint,
        });

        return {
          success: false,
          message:
            "The image was deleted, but we couldn't assign a new primary image automatically. Refresh the page and choose one manually.",
        };
      }
    }
  }

  await revalidateProductRoutesForId(productId);

  return {
    success: true,
    message: "Image deleted successfully.",
  };
}
