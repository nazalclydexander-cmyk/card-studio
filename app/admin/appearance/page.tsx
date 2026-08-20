import Link from "next/link";
import { Suspense } from "react";

import { AppearanceEditor } from "@/app/admin/appearance/appearance-editor";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { createAppearanceFormValues } from "@/lib/appearance-settings";
import { requireAdmin } from "@/lib/admin";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Appearance",
  description: "Customize the public site's appearance and branding.",
};

function AppearanceFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading appearance settings...</CardTitle>
      </CardHeader>
    </Card>
  );
}

function AccessDeniedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6 text-sm text-muted-foreground">
        Your account is authenticated, but it is not authorized to manage site
        appearance settings.
      </div>
    </Card>
  );
}

async function AppearanceContent() {
  const access = await requireAdmin();

  if (!access.isAdmin) {
    return <AccessDeniedCard />;
  }

  const siteSettings = await getSiteSettings();

  return (
    <AppearanceEditor initialValues={createAppearanceFormValues(siteSettings)} />
  );
}

export default function AppearancePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-12">
        <Link
          href="/admin"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to admin
        </Link>

        <Suspense fallback={<AppearanceFallback />}>
          <AppearanceContent />
        </Suspense>
      </div>
    </main>
  );
}
