export type PreviewRegenerationTarget = {
  imageId: string;
  productId: string;
  productName: string;
};

export type PreviewRegenerationFailure = {
  productName: string;
  imageId: string;
  message: string;
};

export type PreviewRegenerationPrepareResult =
  | {
      success: true;
      total: number;
      items: PreviewRegenerationTarget[];
    }
  | {
      success: false;
      message: string;
    };

export type PreviewRegenerationItemResult =
  | {
      success: true;
      imageId: string;
      productName: string;
    }
  | {
      success: false;
      imageId: string;
      productName: string;
      message: string;
    };

export type PreviewRegenerationSummaryResult = {
  success: boolean;
  total: number;
  updated: number;
  failed: number;
  failures: PreviewRegenerationFailure[];
};

export function calculatePreviewRegenerationPercentage(
  completed: number,
  total: number,
) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}
