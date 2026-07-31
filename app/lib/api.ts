/**
 * Django base URL (no trailing slash).
 *
 * - Set `NEXT_PUBLIC_API_BASE_URL` when the API is on another origin in production.
 * - If unset: **server** (SSR/RSC) uses `INTERNAL_API_URL` or `http://127.0.0.1:8000` (Node cannot fetch relative URLs).
 * - **Browser** uses relative `/api/...` so Next.js `rewrites` proxy to Django — avoids CORS when the admin UI is on :3001.
 */
const ENV_API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const DEFAULT_SERVER_API = (process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

function apiOrigin(): string {
  if (ENV_API_BASE) return ENV_API_BASE;
  if (typeof window === "undefined") return DEFAULT_SERVER_API;
  return "";
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const origin = apiOrigin();
  return origin ? `${origin}${p}` : p;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export type CategoryApi = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon?: string | null;
  is_active?: boolean;
};

export type CourseApi = {
  id: number;
  title: string;
  slug: string;
  description: string;
  duration: string;
  price: string;
  rating: number;
  category: number;
  is_active?: boolean;
  is_trending?: boolean;
};

export type BlogPostApi = {
  id: number;
  slug: string;
  category: string;
  title: string;
  author: string;
  date: string;
  read_time: string;
  excerpt: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
};

export type ListPageParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string | number;
  includeInactive?: boolean;
};

function buildListQuery(params: ListPageParams = {}): string {
  const qs = new URLSearchParams();
  if (params.includeInactive) qs.set("include_inactive", "1");
  if (params.page != null) qs.set("page", String(params.page));
  if (params.pageSize != null) qs.set("page_size", String(params.pageSize));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.category != null && params.category !== "") {
    qs.set("category", String(params.category));
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export function parseListResponse<T>(data: unknown): PaginatedResponse<T> {
  if (data && typeof data === "object" && Array.isArray((data as PaginatedResponse<T>).results)) {
    const p = data as PaginatedResponse<T>;
    return {
      count: Number(p.count) || 0,
      next: p.next ?? null,
      previous: p.previous ?? null,
      page: Number(p.page) || 1,
      page_size: Number(p.page_size) || (p.results?.length ?? 0),
      total_pages: Number(p.total_pages) || 1,
      results: Array.isArray(p.results) ? p.results : [],
    };
  }
  const results = Array.isArray(data) ? (data as T[]) : [];
  return {
    count: results.length,
    next: null,
    previous: null,
    page: 1,
    page_size: results.length || 10,
    total_pages: 1,
    results,
  };
}

export async function getCategories(params?: ListPageParams): Promise<CategoryApi[]> {
  const query = buildListQuery({ includeInactive: true, ...params });
  // Without page params, API returns a bare array (full list).
  if (params?.page == null && params?.pageSize == null) {
    return fetchJson<CategoryApi[]>(`/api/categories/${query || "?include_inactive=1"}`);
  }
  const data = await fetchJson<unknown>(`/api/categories/${query}`);
  return parseListResponse<CategoryApi>(data).results;
}

export async function getCategoriesPage(
  params: ListPageParams = {},
): Promise<PaginatedResponse<CategoryApi>> {
  const query = buildListQuery({
    includeInactive: true,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    search: params.search,
  });
  const data = await fetchJson<unknown>(`/api/categories/${query}`);
  return parseListResponse<CategoryApi>(data);
}

export async function getCourses(params?: ListPageParams): Promise<CourseApi[]> {
  const query = buildListQuery({ includeInactive: true, ...params });
  if (params?.page == null && params?.pageSize == null) {
    return fetchJson<CourseApi[]>(`/api/courses/${query || "?include_inactive=1"}`);
  }
  const data = await fetchJson<unknown>(`/api/courses/${query}`);
  return parseListResponse<CourseApi>(data).results;
}

export async function getCoursesPage(
  params: ListPageParams = {},
): Promise<PaginatedResponse<CourseApi>> {
  const query = buildListQuery({
    includeInactive: true,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    search: params.search,
    category: params.category,
  });
  const data = await fetchJson<unknown>(`/api/courses/${query}`);
  return parseListResponse<CourseApi>(data);
}

export async function getBlogs(params?: ListPageParams): Promise<BlogPostApi[]> {
  const query = buildListQuery(params ?? {});
  if (params?.page == null && params?.pageSize == null) {
    return fetchJson<BlogPostApi[]>(`/api/blog/${query}`);
  }
  const data = await fetchJson<unknown>(`/api/blog/${query}`);
  return parseListResponse<BlogPostApi>(data).results;
}

export async function getBlogsPage(
  params: ListPageParams = {},
): Promise<PaginatedResponse<BlogPostApi>> {
  const query = buildListQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    search: params.search,
    category: params.category,
  });
  const data = await fetchJson<unknown>(`/api/blog/${query}`);
  return parseListResponse<BlogPostApi>(data);
}

export async function createCourseApi(body: {
  title: string;
  slug: string;
  description: string;
  duration: string;
  price: string;
  rating: number;
  category: number;
}): Promise<CourseApi> {
  return fetchJson<CourseApi>("/api/courses/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
