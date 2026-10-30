/** Typed fetch adapter for the original CRM endpoints.
 * Keep login, error and header behavior unchanged during the first refactor.
 * Do not mix the public demo with authenticated APIs.
 */
export function createApiClient(base: string) {
  return async function request<T>(
    path: string,
    token?: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    const firstError = payload.errors
      ? Object.values(payload.errors).flat()[0]
      : undefined;
    if (!response.ok)
      throw new Error(
        firstError ?? payload.message ?? 'Không thể kết nối máy chủ.',
      );
    return payload as T;
  };
}
