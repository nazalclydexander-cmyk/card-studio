import { Suspense } from "react";

import { AppearanceEditor } from "@/app/admin/appearance/appearance-editor";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
    <div className="space-y-8">
      <AdminPageHeader
        title="Appearance"
        description="Customize storefront branding, colors, typography, catalog pricing visibility, and business contact details."
      />

      <Suspense fallback={<AppearanceFallback />}>
        <AppearanceContent />
      </Suspense>
    </div>
  );
}
