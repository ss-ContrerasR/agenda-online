export const DEFAULT_PAGE_SIZE = 12;

export type PageParams = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
};

export function resolvePage(
  value: string | string[] | undefined,
  pageSize = DEFAULT_PAGE_SIZE,
): PageParams {
  const raw = Number(Array.isArray(value) ? value[0] : value);
  const page = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

export function pageCount(total: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Construye una URL conservando los parámetros actuales. */
export function withParams(
  base: string,
  params: Record<string, string | number | null | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
