"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createInitialCategoryFormState,
  defaultCategoryValues,
  type CategoryFieldErrors,
  type CategoryFormState,
  type CategoryFormValues,
} from "@/app/admin/categories/form-state";

function normalizeTextValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getCheckboxValue(formData: FormData, field: string) {
  return formData.get(field) === "on";
}

function getFormValues(formData: FormData): CategoryFormValues {
  return {
    name: normalizeTextValue(formData.get("name")),
    description: normalizeTextValue(formData.get("description")),
    sort_order: normalizeTextValue(formData.get("sort_order")),
    active: getCheckboxValue(formData, "active"),
  };
}

function slugifyCategoryName(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "category";
}

async function resolveUniqueCategorySlug(
  baseSlug: string,
  currentCategoryId?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("categories")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (currentCategoryId) {
    query = query.neq("id", currentCategoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to check category slug uniqueness", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return `${baseSlug}-${Date.now()}`;
  }

  const existingSlugs = new Set((data ?? []).map((category) => category.slug));

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

function validateCategoryValues(values: CategoryFormValues) {
  const fieldErrors: CategoryFieldErrors = {};

  if (!values.name) {
    fieldErrors.name = "Category name is required.";
  }

  if (!values.sort_order) {
    fieldErrors.sort_order = "Sort order is required.";
  } else {
    const parsedSortOrder = Number(values.sort_order);

    if (!Number.isInteger(parsedSortOrder)) {
      fieldErrors.sort_order = "Sort order must be a whole number.";
    } else if (parsedSortOrder < 0) {
      fieldErrors.sort_order =
        "Sort order must be greater than or equal to 0.";
    }
  }

  return fieldErrors;
}

function getSanitizedPayload(values: CategoryFormValues, slug: string) {
  return {
    name: values.name,
    slug,
    description: values.description || null,
    sort_order: Number(values.sort_order),
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
    return "A category with similar details already exists. Please review the name and try again.";
  }

  if (errorCode === "23503") {
    return "This category is still linked to existing products and cannot be removed yet.";
  }

  return "We couldn't save the category right now. Please review the form and try again.";
}

async function getProductSlugsForCategory(categoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("category_id", categoryId);

  if (error) {
    console.error("Failed to load product slugs for category revalidation", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return [] as string[];
  }

  return (data ?? [])
    .map((product) => product.slug)
    .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
}

async function revalidateCategoryRoutes(categoryId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/");

  if (categoryId) {
    revalidatePath(`/admin/categories/${categoryId}/edit`);

    const productSlugs = await getProductSlugsForCategory(categoryId);

    for (const slug of productSlugs) {
      revalidatePath(`/products/${slug}`);
    }
  }
}

async function countProductsForCategory(categoryId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (error) {
    console.error("Failed to count category products", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return null;
  }

  return count ?? 0;
}

async function countActiveProductsForCategory(categoryId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("active", true);

  if (error) {
    console.error("Failed to count active category products", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return null;
  }

  return count ?? 0;
}

export async function createCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  if (!(await ensureAdminAccess())) {
    return {
      ...createInitialCategoryFormState(getFormValues(formData)),
      message: "You are not authorized to manage categories.",
    };
  }

  const values = getFormValues(formData);
  const fieldErrors = validateCategoryValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
      values,
    };
  }

  const slug = await resolveUniqueCategorySlug(slugifyCategoryName(values.name));
  const payload = getSanitizedPayload(values, slug);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) {
    if (error) {
      console.error("Failed to create category", {
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

  await revalidateCategoryRoutes(data.id);
  redirect(`/admin/categories/${data.id}/edit?created=1`);
}

export async function updateCategoryAction(
  categoryId: string,
  currentSlug: string,
  currentName: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  if (!(await ensureAdminAccess())) {
    return {
      ...createInitialCategoryFormState(getFormValues(formData)),
      message: "You are not authorized to manage categories.",
    };
  }

  const values = getFormValues(formData);
  const fieldErrors = validateCategoryValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
      values,
    };
  }

  if (!values.active) {
    const activeProductCount = await countActiveProductsForCategory(categoryId);

    if (activeProductCount === null) {
      return {
        success: false,
        message:
          "We couldn't verify whether this category still has active products. Please try again.",
        fieldErrors: {},
        values,
      };
    }

    if (activeProductCount > 0) {
      return {
        success: false,
        message:
          "Deactivate or reassign all active products in this category before hiding the category publicly.",
        fieldErrors: {
          active:
            "This category still contains active products and cannot be deactivated yet.",
        },
        values,
      };
    }
  }

  const slug =
    values.name === currentName
      ? currentSlug
      : await resolveUniqueCategorySlug(
          slugifyCategoryName(values.name),
          categoryId,
        );

  const payload = getSanitizedPayload(values, slug);
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", categoryId);

  if (error) {
    console.error("Failed to update category", {
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

  await revalidateCategoryRoutes(categoryId);
  redirect(`/admin/categories/${categoryId}/edit?updated=1`);
}

export async function toggleCategoryActiveAction(
  categoryId: string,
  nextActive: boolean,
) {
  if (!(await ensureAdminAccess())) {
    redirect("/admin/categories?denied=1");
  }

  if (!nextActive) {
    const activeProductCount = await countActiveProductsForCategory(categoryId);

    if (activeProductCount === null) {
      redirect("/admin/categories?error=active-check");
    }

    if (activeProductCount > 0) {
      redirect("/admin/categories?error=active-products");
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ active: nextActive })
    .eq("id", categoryId);

  if (error) {
    console.error("Failed to toggle category status", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    redirect("/admin/categories?error=toggle");
  }

  await revalidateCategoryRoutes(categoryId);
  redirect("/admin/categories");
}

export async function deleteCategoryAction(
  categoryId: string,
  categoryName: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  if (!(await ensureAdminAccess())) {
    return {
      ...createInitialCategoryFormState(),
      message: "You are not authorized to delete categories.",
    };
  }

  const confirmed = formData.get("confirm_delete") === "on";
  const typedName = normalizeTextValue(formData.get("delete_name"));

  if (!confirmed || typedName !== categoryName) {
    return {
      success: false,
      message:
        "Please confirm deletion and type the category name exactly before deleting.",
      fieldErrors: {
        confirm_delete:
          "Confirmation is required before deleting this category.",
      },
      values: defaultCategoryValues,
    };
  }

  const productCount = await countProductsForCategory(categoryId);

  if (productCount === null) {
    return {
      success: false,
      message:
        "We couldn't verify whether this category is still in use. Please try again.",
      fieldErrors: {},
      values: defaultCategoryValues,
    };
  }

  if (productCount > 0) {
    return {
      success: false,
      message:
        "This category still has products assigned to it. Reassign or delete those products before deleting the category.",
      fieldErrors: {},
      values: defaultCategoryValues,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    console.error("Failed to delete category", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      message:
        "We couldn't delete the category right now. Please try again in a moment.",
      fieldErrors: {},
      values: defaultCategoryValues,
    };
  }

  await revalidateCategoryRoutes();
  redirect("/admin/categories?deleted=1");
}
