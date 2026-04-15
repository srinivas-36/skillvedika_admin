export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const ADMIN_IDENTIFIER_KEY = "admin_identifier";

export type JwtClaims = Record<string, unknown>;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** JSON requests (do not use with `FormData`). */
export function authHeadersJson(): HeadersInit {
  const t = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (t) headers.Authorization = `Bearer ${t}`;
  return headers;
}

/** Multipart uploads — omit Content-Type so the browser sets the boundary. */
export function authHeadersMultipart(): HeadersInit {
  const t = getAccessToken();
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

/** DELETE / GET mutations that do not send a body. */
export function authHeadersBearer(): HeadersInit {
  const t = getAccessToken();
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_IDENTIFIER_KEY);
}

export function getStoredAdminIdentifier(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_IDENTIFIER_KEY);
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      return window.atob(padded);
    }
    return null;
  } catch {
    return null;
  }
}

export function getAccessTokenClaims(): JwtClaims | null {
  const token = getAccessToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = decodeBase64Url(parts[1]);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as JwtClaims;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
