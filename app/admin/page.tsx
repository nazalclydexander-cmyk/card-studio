import Link from "next/link";
import { Suspense } from "react";

import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";

export const metadata = {
  title: "Admin",
  description: "Administrator dashboard.",
};

const adminSections = [
  {
    title: "Products",
    href: "/admin/products",
    description:
      "Manage products, pricing, visibility, and product images.",
  },
  {
    title: "Categories",
    href: "/admin/categories",
    description: "Organize and manage product categories.",
  },
  {
    title: "Appearance",
    href: "/admin/appearance",
    description:
      "Customize branding, colors, fonts, logo, and catalog settings.",
  },
  {
    title: "Inquiries",
    href: "/admin/inquiries",
    description: "Review customer inquiries and update their status.",
  },
] as const;

function AdminFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {adminSections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

async function AdminContent() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            Your account is authenticated, but it is not authorized for the
            administrator area.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {adminSections.map((section) => (
        <Card
          key={section.title}
          className="transition-shadow hover:shadow-sm"
        >
          <CardHeader>
            <CardTitle>
              <Link href={section.href} className="hover:underline">
                {section.title}
              </Link>
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href={section.href}>Open section</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Manage the catalog, branding, and customer inquiries from one
              place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/">View Website</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>

        <Suspense fallback={<AdminFallback />}>
          <AdminContent />
        </Suspense>
      </div>
    </main>
  );
}
