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
      style={{
        backgroundColor: "var(--site-surface)",
        borderColor: "color-mix(in srgb, var(--site-text) 10%, transparent)",
        borderRadius: "var(--site-card-radius)",
      }}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {actionHref && actionLabel ? (
        <div className="px-6 pb-6">
          <Button asChild variant="outline">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
