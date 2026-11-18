"use client";

import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalHelp } from "@/components/shared/global-help";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={250}>
        {children}
        <Suspense fallback={null}>
          <GlobalHelp />
        </Suspense>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ className: "font-sans" }}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}
