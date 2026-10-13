export type ApiResponse<T> = {
  status: number;
  data: T;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 401) window.dispatchEvent(new Event('mango-session-lost'));
  const data = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, data };
}

export async function getJson<T>(path: string) {
  const response = await requestJson<T>(path);
  if (response.status >= 400) throw new ApiError(`Request to ${path} failed.`, response.status);
  return response.data;
}
