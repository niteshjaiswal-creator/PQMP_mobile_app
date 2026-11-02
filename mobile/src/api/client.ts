// HTTP client for the PQMP mobile API layer (contract: analysis/api/mobile-api-spec.md).
// Raw status codes, SAP messages and stack traces are never shown to users (SRS 8.10, 11.9, 17.2):
// every failure becomes an ApiError with a business-readable `userMessage`, and the technical detail
// stays in `cause` for internal logging only.
//
// The network call goes through a swappable `transport`. Production uses fetch; during development
// src/mock can install an in-memory backend through configureApi({ transport }) without any screen
// or endpoint module knowing about it.
import { env } from '../config/env';
import type { PageMeta } from './types';

export type ApiErrorKind =
  | 'timeout'
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'conflict'
  | 'file'
  | 'server';

const USER_MESSAGE: Record<ApiErrorKind, string> = {
  timeout: 'Temporarily Unavailable. Please try again in a moment.',
  network: 'You appear to be offline. Please check your connection and try again.',
  unauthorized: 'Your session has expired. Please log in again.',
  forbidden: 'You do not have access to this information.',
  'not-found': 'The requested record could not be found.',
  validation: 'Some details need attention before continuing.',
  conflict: 'This action is not possible for this case right now.',
  file: 'This file could not be uploaded. Use a PDF, JPG or PNG within the size limit.',
  server: 'Something went wrong on our side. Please try again later.',
};

// Kinds whose server `message` is defined as dealer-safe by the contract (spec §2.3, §12).
const SERVER_MESSAGE_ALLOWED: ApiErrorKind[] = ['conflict', 'validation', 'file', 'forbidden'];

export class ApiError extends Error {
  readonly userMessage: string;
  constructor(
    readonly kind: ApiErrorKind,
    readonly status?: number,
    /** Field-level messages from the backend, already business-readable. */
    readonly fieldErrors?: Record<string, string>,
    cause?: unknown,
    /** Machine code from the error envelope, e.g. DUPLICATE_CASE. For app logic, never for display. */
    readonly code?: string,
    serverMessage?: string,
  ) {
    super(`API ${kind}${status ? ` (${status})` : ''}`, { cause });
    this.userMessage =
      serverMessage && SERVER_MESSAGE_ALLOWED.includes(kind) ? serverMessage : USER_MESSAGE[kind];
  }
}

const kindForStatus = (status: number): ApiErrorKind =>
  status === 401 ? 'unauthorized'
  : status === 403 ? 'forbidden'
  : status === 404 ? 'not-found'
  : status === 409 ? 'conflict'
  : status === 413 || status === 415 ? 'file'
  : status === 400 || status === 422 ? 'validation'
  : status === 408 || status === 503 || status === 504 ? 'timeout'
  : 'server';

export type TransportRequest = {
  method: string;
  url: string;
  /** Path relative to the API base, with leading slash and no query, e.g. "/cases/10582". */
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  signal: AbortSignal;
};
export type TransportResponse = { status: number; body: unknown };
export type Transport = (req: TransportRequest) => Promise<TransportResponse>;

const fetchTransport: Transport = async ({ method, url, headers, body, signal }) => {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url, {
    method,
    signal,
    headers: { ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  const parsed = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  return { status: res.status, body: parsed };
};

type Config = {
  baseUrl: string;
  timeoutMs: number;
  getToken: () => string | null | undefined;
  onUnauthorized: () => void;
  /** X-App-Version, X-Platform, X-Device-Id (spec §2.1); set once at app start. */
  defaultHeaders: Record<string, string>;
  transport: Transport;
};

const config: Config = {
  baseUrl: env.apiBaseUrl,
  timeoutMs: 20_000,
  getToken: () => null,
  onUnauthorized: () => {},
  defaultHeaders: {},
  transport: fetchTransport,
};

export function configureApi(patch: Partial<Config>) {
  Object.assign(config, patch);
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  headers?: Record<string, string>;
  /** Adds an Idempotency-Key so a retry after a timeout never creates a duplicate (spec §2.1). */
  idempotent?: boolean;
};

export type Envelope<T, M = Record<string, unknown>> = { data: T; meta?: M };

// Unique per request; the server only compares keys, so no UUID library is needed.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;

function buildQuery(query: RequestOptions['query']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = Array.isArray(v) ? v.join(',') : String(v);
  }
  return out;
}

/** Full response envelope. Use for lists, where `meta` carries pagination. */
export async function requestEnvelope<T, M = Record<string, unknown>>(
  path: string,
  { method = 'GET', body, query, headers, idempotent }: RequestOptions = {},
): Promise<Envelope<T, M>> {
  const cleanPath = '/' + path.replace(/^\//, '');
  const q = buildQuery(query);
  const qs = new URLSearchParams(q).toString();
  const url = `${config.baseUrl.replace(/\/$/, '')}${cleanPath}${qs ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const token = config.getToken();

  let res: TransportResponse;
  try {
    res = await config.transport({
      method,
      url,
      path: cleanPath,
      query: q,
      body,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...config.defaultHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotent ? { 'Idempotency-Key': newId() } : {}),
        ...headers,
      },
    });
  } catch (err) {
    throw new ApiError(controller.signal.aborted ? 'timeout' : 'network', undefined, undefined, err);
  } finally {
    clearTimeout(timer);
  }

  if (res.status >= 400) {
    const kind = kindForStatus(res.status);
    if (kind === 'unauthorized') config.onUnauthorized();
    const payload = (res.body ?? {}) as { code?: string; message?: string; fieldErrors?: Record<string, string> };
    throw new ApiError(
      kind,
      res.status,
      kind === 'validation' ? payload.fieldErrors : undefined,
      res.body,
      payload.code,
      payload.message,
    );
  }
  if (res.status === 204 || res.body === undefined) return { data: undefined as T };
  const b = res.body as Record<string, unknown>;
  // The contract always wraps in { data, meta }; tolerate a bare body during backend bring-up.
  return b && typeof b === 'object' && 'data' in b ? (b as Envelope<T, M>) : { data: b as T };
}

/** The `data` part of the response. */
export async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await requestEnvelope<T>(path, options)).data;
}

/** A paginated list as { items, page, pageSize, totalItems, totalPages }. */
export async function requestPage<T>(path: string, options?: RequestOptions) {
  const { data, meta } = await requestEnvelope<T[], PageMeta>(path, options);
  const m = meta ?? { page: 1, pageSize: data.length, totalItems: data.length, totalPages: 1 };
  return { ...m, items: data };
}

export const userMessageFor = (err: unknown) =>
  err instanceof ApiError ? err.userMessage : USER_MESSAGE.server;
