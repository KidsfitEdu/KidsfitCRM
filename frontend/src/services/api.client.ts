import { trackAppRequest } from '../lib/loading-tracker.ts';
/** Shared HTTP transport for CRM endpoints, preserving backend JSON/error contracts. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly kind: 'network' | 'timeout' | 'http';
  constructor(message: string, status: number, kind: 'network' | 'timeout' | 'http') {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.kind = kind;
  }
}

const BOOTSTRAP_TIMEOUT_MS = 12000;
const DEFAULT_TIMEOUT_MS = 30000;
const UPLOAD_TIMEOUT_MS = 60000;
const bootstrapPaths = new Set(['/login', '/me', '/health', '/channel-sales/workspace']);

export function isBackendUnavailable(error: unknown): boolean {
  return error instanceof ApiRequestError && (error.kind !== 'http' || error.status >= 500);
}

export function createApiClient(apiBase: string) {
  async function request<T>(
    path: string,
    token?: string,
    options: RequestInit = {},
  ): Promise<T> {
    const finishLoading = trackAppRequest();
    try {
      const headers = new Headers(options.headers);
      if (typeof options.body === 'string' && !headers.has('Content-Type'))
        headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const controller = new AbortController();
      const signal = options.signal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal;
      const limit = bootstrapPaths.has(path) ? BOOTSTRAP_TIMEOUT_MS
        : options.body instanceof FormData ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
      const timeout = setTimeout(() => controller.abort(), limit);

      let response: Response;
      let payload: { message?: string; errors?: Record<string, string[]> };
      try {
        response = await fetch(`${apiBase}${path}`, { ...options, headers, signal });
        payload = (await response.json().catch(() => ({}))) as typeof payload;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        if (controller.signal.aborted)
          throw new ApiRequestError('Máy chủ phản hồi quá lâu. Vui lòng thử lại.', 0, 'timeout');
        throw new ApiRequestError('Không thể kết nối đến máy chủ KIDSFIT CRM.', 0, 'network');
      } finally {
        clearTimeout(timeout);
      }
      const firstError = payload.errors
        ? Object.values(payload.errors).flat()[0]
        : undefined;
      if (!response.ok) {
        const message = firstError ?? payload.message ??
          (response.status >= 500
            ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại.'
            : 'Không thể hoàn tất yêu cầu.');
        throw new ApiRequestError(message, response.status, 'http');
      }
      return payload as T;
    } finally {
      finishLoading();
    }
  }
  return request;
}
