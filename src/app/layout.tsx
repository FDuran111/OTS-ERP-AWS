import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import LayoutDebugger from "@/components/debug/LayoutDebugger";
import StagingRibbon from "@/components/layout/StagingRibbon";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ortmeier Technical Service - Job Management",
  description: "Job management and scheduling platform for electrical contractors",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ortmeier Technical Service",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: "#1976d2",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <head>
        {/* Additional mobile-specific meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="HandheldFriendly" content="true" />
      </head>
      <body className="overflow-x-hidden">
        <StagingRibbon />
        <ThemeProvider>
          <AuthProvider>
            {children}
            <LayoutDebugger />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}