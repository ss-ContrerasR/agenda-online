"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={250}>
        {children}
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
