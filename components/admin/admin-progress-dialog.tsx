"use client";

import type { ReactNode } from "react";

import { AlertCircle, CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AdminProgressDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  status: "preparing" | "running" | "completed" | "completed_with_errors" | "failed";
  progressLabel: string;
  progressValue: number;
  progressMax: number;
  percentage: number;
  summary: string;
  helperText?: string;
  currentItemLabel?: string | null;
  failureSummary?: string | null;
  failureDetails?: ReactNode;
  disableClose?: boolean;
  doneLabel?: string;
  onDone?: () => void;
  retryLabel?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
};

export function AdminProgressDialog({
  open,
  onOpenChange,
  title,
  description,
  status,
  progressLabel,
  progressValue,
  progressMax,
  percentage,
  summary,
  helperText,
  currentItemLabel,
  failureSummary,
  failureDetails,
  disableClose = false,
  doneLabel = "Done",
  onDone,
  retryLabel = "Retry failed previews",
  onRetry,
  isRetrying = false,
}: AdminProgressDialogProps) {
  const isBusy = status === "preparing" || status === "running";
  const showRetry = status === "completed_with_errors" && Boolean(onRetry);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (disableClose && !nextOpen) {
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (disableClose) {
            event.preventDefault();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-5" aria-live="polite">
          <div className="flex items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3">
            {status === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            ) : status === "completed_with_errors" ? (
              <TriangleAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />
            ) : status === "failed" ? (
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
            ) : (
              <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">{summary}</p>
              {helperText ? (
                <p className="text-sm text-muted-foreground">{helperText}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{progressLabel}</span>
              <span className="text-muted-foreground">{percentage}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Preview regeneration progress"
              aria-valuemin={0}
              aria-valuemax={progressMax}
              aria-valuenow={progressValue}
              className="h-3 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-[var(--site-primary)] transition-[width] duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {currentItemLabel ? (
            <div className="space-y-1 rounded-xl border px-4 py-3 text-sm">
              <p className="font-medium">Currently processing</p>
              <p className="text-muted-foreground">{currentItemLabel}</p>
            </div>
          ) : null}

          {failureSummary ? (
            <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">{failureSummary}</p>
              {failureDetails}
            </div>
          ) : null}
        </div>

        {!isBusy ? (
          <AlertDialogFooter>
            {showRetry ? (
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void onRetry?.();
                }}
                disabled={isRetrying}
              >
                {isRetrying ? "Retrying..." : retryLabel}
              </AlertDialogAction>
            ) : null}
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                onDone?.();
              }}
              disabled={isRetrying}
            >
              {doneLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
