"use client";

import { useState, useTransition } from "react";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { Button } from "@/components/ui/button";

type ActionResult =
  | void
  | {
      success?: boolean;
      message?: string;
    };

type AdminListActionConfirmProps = {
  triggerLabel: string;
  triggerVariant?: "default" | "secondary" | "outline" | "destructive";
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  loadingLabel?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => Promise<ActionResult> | ActionResult;
};

export function AdminListActionConfirm({
  triggerLabel,
  triggerVariant = "outline",
  dialogTitle,
  dialogDescription,
  confirmLabel,
  loadingLabel,
  confirmVariant = "default",
  onConfirm,
}: AdminListActionConfirmProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setFeedback(null);

    startTransition(async () => {
      const result = await onConfirm();

      if (result && typeof result === "object" && result.success === false) {
        setFeedback(result.message ?? "We couldn't complete that action.");
        setOpen(false);
        return;
      }

      setOpen(false);
    });
  }

  const pendingLabel = loadingLabel ?? confirmLabel;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        disabled={isPending}
        onClick={() => {
          setFeedback(null);
          setOpen(true);
        }}
      >
        {isPending ? pendingLabel : triggerLabel}
      </Button>

      {feedback ? <p className="text-sm text-destructive">{feedback}</p> : null}

      <AdminConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={isPending ? pendingLabel : confirmLabel}
        variant={confirmVariant}
        isLoading={isPending}
        disableClose={isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
