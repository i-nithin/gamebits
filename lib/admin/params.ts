export const ADMIN_PAGE_SIZES = [10, 25, 50] as const;
export type AdminPageSize = (typeof ADMIN_PAGE_SIZES)[number];
export type CatalogView = "all" | "live" | "archived";

export function parseAdminListParams(raw: {
  q?: string;
  page?: string;
  pageSize?: string;
  view?: string;
}) {
  const query = (raw.q ?? "").trim().slice(0, 80);
  const sizeNum = Number(raw.pageSize);
  const pageSize: AdminPageSize = ADMIN_PAGE_SIZES.includes(sizeNum as AdminPageSize)
    ? (sizeNum as AdminPageSize)
    : 10;
  const pageNum = Number(raw.page);
  const page = Number.isInteger(pageNum) && pageNum > 0 && pageNum < 100_000 ? pageNum : 1;
  const view: CatalogView = raw.view === "live" || raw.view === "archived" ? raw.view : "all";
  return { query, page, pageSize, view };
}

export function adminListHref(
  base: string,
  opts: { query: string; page: number; pageSize: number; view?: CatalogView },
) {
  const params = new URLSearchParams();
  if (opts.query) params.set("q", opts.query);
  params.set("pageSize", String(opts.pageSize));
  if (opts.page > 1) params.set("page", String(opts.page));
  if (opts.view && opts.view !== "all") params.set("view", opts.view);
  const search = params.toString();
  return search ? `${base}?${search}` : base;
}
