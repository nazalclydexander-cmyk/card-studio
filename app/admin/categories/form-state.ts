export type CategoryFormValues = {
  name: string;
  description: string;
  sort_order: string;
  active: boolean;
};

export type CategoryFieldErrors = Partial<
  Record<keyof CategoryFormValues | "confirm_delete", string>
>;

export type CategoryFormState = {
  success: boolean;
  message: string;
  fieldErrors: CategoryFieldErrors;
  values: CategoryFormValues;
};

export const defaultCategoryValues: CategoryFormValues = {
  name: "",
  description: "",
  sort_order: "0",
  active: true,
};

export function createInitialCategoryFormState(
  values: CategoryFormValues = defaultCategoryValues,
): CategoryFormState {
  return {
    success: false,
    message: "",
    fieldErrors: {},
    values,
  };
}
