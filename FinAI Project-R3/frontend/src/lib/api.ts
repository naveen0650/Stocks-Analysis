/** Thin typed API client with silent JWT refresh-and-retry. */

const API_BASE = "/api/v1";

const ACCESS_KEY = "finai.access";
const REFRESH_KEY = "finai.refresh";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const tokenStore = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  save(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  retry?: boolean;
}

async function parseError(response: Response): Promise<ApiError> {
  let code = "REQUEST_FAILED";
  let message = `Request failed (${response.status})`;
  try {
    const data = await response.json();
    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (data.detail?.message) {
      code = data.detail.code ?? code;
      message = data.detail.message;
    } else if (Array.isArray(data.detail)) {
      message = data.detail.map((d: { msg: string }) => d.msg).join("; ");
    }
  } catch {
    /* keep defaults */
  }
  return new ApiError(response.status, code, message);
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh();
  if (!refresh) return false;
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!response.ok) {
    tokenStore.clear();
    return false;
  }
  const data = await response.json();
  tokenStore.save(data.access_token, data.refresh_token);
  return true;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, retry = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const access = tokenStore.access();
  if (access) headers["Authorization"] = `Bearer ${access}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retry && tokenStore.refresh()) {
    const refreshed = await refreshTokens();
    if (refreshed) return api<T>(path, { ...options, retry: false });
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
