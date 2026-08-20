const allowedOrientations = ["portrait", "landscape", "square"] as const;

export type ProductFormValues = {
  name: string;
  category_id: string;
  short_description: string;
  description: string;
  price_from: string;
  show_price: boolean;
  theme: string;
  orientation: string;
  format: string;
  customizable: boolean;
  featured: boolean;
  active: boolean;
};

export type FieldErrors = Partial<
  Record<keyof ProductFormValues | "confirm_delete", string>
>;

export type ProductFormState = {
  success: boolean;
  message: string;
  fieldErrors: FieldErrors;
  values: ProductFormValues;
};

export const defaultProductValues: ProductFormValues = {
  name: "",
  category_id: "",
  short_description: "",
  description: "",
  price_from: "",
  show_price: true,
  theme: "",
  orientation: "",
  format: "",
  customizable: true,
  featured: false,
  active: true,
};

export function createInitialProductFormState(
  values: ProductFormValues = defaultProductValues,
): ProductFormState {
  return {
    success: false,
    message: "",
    fieldErrors: {},
    values,
  };
}

export function isAllowedOrientation(value: string) {
  return allowedOrientations.includes(
    value as (typeof allowedOrientations)[number],
  );
}
