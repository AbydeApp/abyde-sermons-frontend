import { env, useMockApi } from "@/config/env";
import type { PagedResponse, Paginated, PresignedUpload } from "@/types";

/** Backend error envelope: { statusCode, code, message, errors: { field: [msg] }, requestId } */
export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  message?: string;
  errors?: Record<string, string[] | string>;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** First message per field, ready to show next to inputs. */
    public fields?: Record<string, string>,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(status: number, body: ApiErrorBody | null): ApiError {
  const fields = body?.errors
    ? Object.fromEntries(
        Object.entries(body.errors).map(([k, v]) => [k, Array.isArray(v) ? (v[0] ?? "") : String(v)]),
      )
    : undefined;
  return new ApiError(status, body?.code ?? "UNKNOWN", body?.message ?? "Something went wrong.", fields, body?.requestId);
}

export const UNAUTHORIZED_EVENT = "abyde-sermon:unauthorized";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Params = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  signal?: AbortSignal;
  params?: Params;
  body?: unknown;
}

function buildQuery(params?: Params) {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = `${path}${buildQuery(opts.params)}`;
  try {
    if (useMockApi) {
      const { handleMock } = await import("./mock/handler");
      return (await handleMock(method, url, opts.body, opts.signal)) as T;
    }

    const res = await fetch(`${env.apiUrl}${url}`, {
      method,
      // Cookie session (httpOnly). No tokens are ever held in JavaScript.
      credentials: "include",
      signal: opts.signal,
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });

    if (res.status === 204) return undefined as T;
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) throw toApiError(res.status, data as ApiErrorBody | null);
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) {
      // /auth/me always answers 200, so any 401 means the session is gone.
      if (err.status === 401 && typeof window !== "undefined" && err.code !== "INVALID_CREDENTIALS") {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      throw err;
    }
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK", "We couldn't reach Abyde Sermon. Check your connection and try again.");
  }
}

function flatten<T>(res: PagedResponse<T>): Paginated<T> {
  return { items: res.data, total: res.meta.total, page: res.meta.page, pageSize: res.meta.pageSize };
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "body">) => request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, opts),
  /** GET a `{data, meta}` list and flatten it. */
  getPage: async <T>(path: string, opts?: Omit<RequestOptions, "body">) =>
    flatten(await request<PagedResponse<T>>("GET", path, opts)),
  /** POST (search-style) that returns a `{data, meta}` list. */
  postPage: async <T>(path: string, body: unknown, opts?: RequestOptions) =>
    flatten(await request<PagedResponse<T>>("POST", path, { ...opts, body })),
};

/** Direct browser -> object storage upload to a presigned URL, with progress. */
export function uploadToSignedUrl(
  presigned: PresignedUpload,
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (useMockApi) {
    return new Promise((resolve, reject) => {
      let pct = 0;
      const timer = setInterval(() => {
        pct = Math.min(100, pct + 8 + Math.random() * 10);
        onProgress(Math.round(pct));
        if (pct >= 100) {
          clearInterval(timer);
          resolve();
        }
      }, 180);
      signal?.addEventListener("abort", () => {
        clearInterval(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(presigned.method, presigned.uploadUrl);
    for (const [k, v] of Object.entries(presigned.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(xhr.status, "UPLOAD_FAILED", "Upload failed. Please try again."));
    xhr.onerror = () => reject(new ApiError(0, "NETWORK", "Upload failed. Check your connection."));
    signal?.addEventListener("abort", () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    });
    xhr.send(file);
  });
}
