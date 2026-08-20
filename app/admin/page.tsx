import { Suspense } from "react";
import Link from "next/link";

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
  description: "Temporary administrator landing page.",
};

const adminSections = ["Products", "Categories", "Appearance", "Inquiries"];

function AdminFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {adminSections.map((section) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle>{section}</CardTitle>
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
        <Card key={section}>
          <CardHeader>
            <CardTitle>
              {section === "Products" ? (
                <Link href="/admin/products" className="hover:underline">
                  {section}
                </Link>
              ) : section === "Categories" ? (
                <Link href="/admin/categories" className="hover:underline">
                  {section}
                </Link>
              ) : section === "Appearance" ? (
                <Link href="/admin/appearance" className="hover:underline">
                  {section}
                </Link>
              ) : section === "Inquiries" ? (
                <Link href="/admin/inquiries" className="hover:underline">
                  {section}
                </Link>
              ) : (
                section
              )}
            </CardTitle>
            <CardDescription>Temporary placeholder</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              CRUD screens will be added in a later milestone.
            </p>
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
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Temporary administrator landing page for authorized users only.
          </p>
        </div>

        <Suspense fallback={<AdminFallback />}>
          <AdminContent />
        </Suspense>
      </div>
    </main>
  );
}
