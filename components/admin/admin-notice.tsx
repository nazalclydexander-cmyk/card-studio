import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type AdminNoticeTone = "success" | "error" | "warning" | "info";

const toneStyles: Record<
  AdminNoticeTone,
  { wrapper: string; icon: typeof CheckCircle2 }
> = {
  success: {
    wrapper: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    icon: CheckCircle2,
  },
  error: {
    wrapper: "border-destructive/30 bg-destructive/5 text-destructive",
    icon: AlertCircle,
  },
  warning: {
    wrapper: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    icon: TriangleAlert,
  },
  info: {
    wrapper: "border-border bg-background text-foreground",
    icon: Info,
  },
};

type AdminNoticeProps = {
  tone?: AdminNoticeTone;
  children: ReactNode;
  className?: string;
};

export function AdminNotice({
  tone = "info",
  children,
  className,
}: AdminNoticeProps) {
  const config = toneStyles[tone];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        config.wrapper,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
