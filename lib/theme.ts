import { readableForeground } from "@/lib/utils";

export type ThemePreset = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "teal", name: "Aurora", primary: "#0F766E", secondary: "#0EA5E9", accent: "#F59E0B" },
  { id: "ocean", name: "Océano", primary: "#0369A1", secondary: "#06B6D4", accent: "#F59E0B" },
  { id: "violet", name: "Violeta", primary: "#6D28D9", secondary: "#A855F7", accent: "#F59E0B" },
  { id: "rose", name: "Rosa", primary: "#BE185D", secondary: "#EC4899", accent: "#F59E0B" },
  { id: "emerald", name: "Esmeralda", primary: "#047857", secondary: "#10B981", accent: "#F59E0B" },
  { id: "amber", name: "Ámbar", primary: "#B45309", secondary: "#F59E0B", accent: "#0F766E" },
  { id: "midnight", name: "Medianoche", primary: "#1E293B", secondary: "#C2410C", accent: "#F59E0B" },
  { id: "slate", name: "Grafito", primary: "#334155", secondary: "#64748B", accent: "#0EA5E9" },
];

export function getPreset(id: string) {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0];
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Genera variables CSS a partir de la identidad de la organización.
 * Se emiten para :root y .dark porque los portales (diálogos) viven fuera
 * del contenedor del panel.
 */
export function themeCss(primary: string, secondary: string, accent: string) {
  const safePrimary = HEX.test(primary) ? primary : "#0F766E";
  const safeSecondary = HEX.test(secondary) ? secondary : "#0EA5E9";
  const safeAccent = HEX.test(accent) ? accent : "#F59E0B";
  const foreground = readableForeground(safePrimary);
  return `:root{--primary:${safePrimary};--primary-foreground:${foreground};--ring:${safePrimary};--brand-secondary:${safeSecondary};--brand-accent:${safeAccent};}.dark{--primary:${safePrimary};--primary-foreground:${foreground};--ring:${safePrimary};--brand-secondary:${safeSecondary};--brand-accent:${safeAccent};}`;
}

export function themeStyle(primary: string, secondary: string, accent: string) {
  return {
    "--primary": primary,
    "--primary-foreground": readableForeground(primary),
    "--ring": primary,
    "--brand-secondary": secondary,
    "--brand-accent": accent,
  } as React.CSSProperties;
}
