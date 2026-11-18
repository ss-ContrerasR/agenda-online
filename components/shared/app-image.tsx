import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Hosts que el optimizador de Next.js puede procesar. El resto de URLs
 * (avatares externos, logos de terceros, etc.) se sirven con `<img>` nativo
 * para no romper la imagen ni abrir el optimizador a cualquier dominio.
 */
const OPTIMIZABLE_HOSTS = [
  /(^|\.)supabase\.co$/i,
  /^images\.unsplash\.com$/i,
];

export function canOptimizeImage(src: string) {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return true;
  }

  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    // El optimizador rechaza SVG remotos salvo que se habilite explícitamente.
    if (/\.svg$/i.test(url.pathname)) return false;
    return OPTIMIZABLE_HOSTS.some((pattern) => pattern.test(url.hostname));
  } catch {
    return false;
  }
}

type AppImageProps = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  preload?: boolean;
  quality?: number;
  style?: CSSProperties;
};

/**
 * Imagen con optimización automática cuando el origen es seguro y con un
 * fallback nativo (lazy + decoding async) cuando no lo es. Evita que una URL
 * externa rompa el render o bloquee la carga inicial.
 */
export function AppImage({
  src,
  alt,
  className,
  fill = false,
  width,
  height,
  sizes,
  loading,
  fetchPriority,
  preload = false,
  quality,
  style,
}: AppImageProps) {
  if (!src) return null;

  if (canOptimizeImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        preload={preload}
        quality={quality}
        style={style}
      />
    );
  }

  const fallbackStyle: CSSProperties | undefined = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        ...style,
      }
    : style;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={preload ? "eager" : (loading ?? "lazy")}
      fetchPriority={fetchPriority}
      decoding="async"
      style={fallbackStyle}
    />
  );
}
