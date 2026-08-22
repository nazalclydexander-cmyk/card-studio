"use client";

import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type AdminConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
  disableClose?: boolean;
};

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
  children,
  disableClose = false,
}: AdminConfirmDialogProps) {
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
          {children ? (
            <div className="pt-1 text-sm text-muted-foreground">{children}</div>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} className="mt-0">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
            className={cn(variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
