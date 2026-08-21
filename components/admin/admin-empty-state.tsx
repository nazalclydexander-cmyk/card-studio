import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdminEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function AdminEmptyState({
  title,
  description,
  action,
}: AdminEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-muted/40">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
