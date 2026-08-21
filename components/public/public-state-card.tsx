"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PublicStateCardProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function PublicStateCard({
  title,
  description,
  actionHref,
  actionLabel,
}: PublicStateCardProps) {
  return (
    <Card
      className="rounded-[calc(var(--site-card-radius)+0.18rem)] shadow-[0_14px_36px_rgba(15,23,42,0.04)]"
      style={{
        backgroundColor: "var(--site-surface)",
        borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
      }}
    >
      <CardHeader className="space-y-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-2xl leading-6">
          {description}
        </CardDescription>
      </CardHeader>
      {actionHref && actionLabel ? (
        <div className="px-6 pb-6">
          <Button asChild variant="outline" style={{ borderRadius: "var(--site-button-radius)" }}>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
