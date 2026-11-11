import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_NAME } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Citas y reservas para tu negocio`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Plataforma profesional de agendamiento y reservas en línea. Gestiona citas, clientes, empleados, horarios y estadísticas desde un solo lugar.",
  applicationName: APP_NAME,
  openGraph: {
    title: `${APP_NAME} — Citas y reservas`,
    description:
      "Menos llamadas, más citas. Agenda, confirma y haz seguimiento de tus reservas desde cualquier dispositivo.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#080c12" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
