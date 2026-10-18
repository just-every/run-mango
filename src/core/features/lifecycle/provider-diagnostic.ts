/** Keep only named provider diagnostic fields, bounded independently of the webhook body's limit. */
export const providerDiagnostic = (value: unknown) => typeof value === 'string' && value.trim() ? value.slice(0, 1024) : undefined;
