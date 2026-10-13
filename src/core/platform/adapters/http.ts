export async function responseJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!response.ok) {
    const detail = body.length > 1000 ? `${body.slice(0, 1000)}…` : body;
    throw new Error(`Provider request failed with ${response.status}: ${detail || response.statusText}`);
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error('Provider returned a successful response without JSON.');
  }
}

export function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

export function stringValue(value: unknown, message: string): string {
  if (typeof value !== 'string' || value === '') throw new Error(message);
  return value;
}
