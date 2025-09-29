import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import LayoutDebugger from "@/components/debug/LayoutDebugger";
import "./globals.compiled.css";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <LayoutDebugger />
      </AuthProvider>
    </ThemeProvider>
  );
}