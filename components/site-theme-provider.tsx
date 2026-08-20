import type { ReactNode } from "react";

import { getSiteSettings } from "@/lib/site-settings";
import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings-config";
import { getSiteThemeVariables } from "@/lib/site-theme";

type SiteThemeProviderProps = {
  children: ReactNode;
};

export function SiteThemeFallback({ children }: SiteThemeProviderProps) {
  return (
    <div className="site-theme" style={getSiteThemeVariables(DEFAULT_SITE_SETTINGS)}>
      {children}
    </div>
  );
}

export async function SiteThemeProvider({
  children,
}: SiteThemeProviderProps) {
  const siteSettings = await getSiteSettings();

  return (
    <div
      className="site-theme"
      data-site-name={siteSettings.site_name}
      style={getSiteThemeVariables(siteSettings)}
    >
      {children}
    </div>
  );
}
