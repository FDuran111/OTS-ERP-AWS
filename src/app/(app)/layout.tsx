import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { TutorialProvider } from "@/components/help/TutorialContext";
import LayoutDebugger from "@/components/debug/LayoutDebugger";
import HelpButton from "@/components/help/HelpButton";
import "./globals.compiled.css";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TutorialProvider>
          {children}
          <LayoutDebugger />
          <HelpButton />
        </TutorialProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
