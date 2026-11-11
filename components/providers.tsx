"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
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
