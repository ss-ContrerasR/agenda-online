import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    agentFeedback: true,
    // Recharts y los iconos se importan por nombre; limitar los módulos que
    // entran al bundle del cliente reduce el JS inicial de las páginas.
    optimizePackageImports: ["recharts", "lucide-react", "date-fns"],
    // Mantiene las páginas dinámicas en la caché del navegador unos segundos
    // para que volver atrás o repetir una navegación sea instantáneo.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // AVIF pesa ~20% menos que WebP; WebP queda como respaldo.
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 90],
    // Las imágenes de Supabase no siempre envían Cache-Control; 31 días evita
    // revalidar el mismo logo o foto en cada visita.
    minimumCacheTTL: 2678400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
