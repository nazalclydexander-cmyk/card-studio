import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";

import {
  SiteThemeFallback,
  SiteThemeProvider,
} from "@/components/site-theme-provider";
import { getSiteSettings } from "@/lib/site-settings";
import { getSiteOrigin } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings();
  const siteOrigin = getSiteOrigin();

  return {
    metadataBase: new URL(siteOrigin),
    applicationName: siteSettings.site_name,
    title: {
      default: siteSettings.site_name,
      template: `%s | ${siteSettings.site_name}`,
    },
    description: siteSettings.tagline,
    openGraph: {
      title: siteSettings.site_name,
      description: siteSettings.tagline,
      siteName: siteSettings.site_name,
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<SiteThemeFallback>{children}</SiteThemeFallback>}>
            <SiteThemeProvider>{children}</SiteThemeProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
