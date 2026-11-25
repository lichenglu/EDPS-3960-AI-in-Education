export class RequestError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super(
      payload && typeof payload === 'object' && ('detail' in payload || 'error' in payload)
        ? String('detail' in payload ? payload.detail : payload.error)
        : 'The request could not be completed.',
    );
    this.status = status;
    this.payload = payload;
  }
}

export async function api<T>(path: string, token?: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload: unknown = await response.json();
  if (!response.ok) throw new RequestError(response.status, payload);
  return payload as T;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof RequestError ? error.message : fallback;
}
