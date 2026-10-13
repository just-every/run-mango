export type NativeRow = Record<string, string | number | null>;
export type AudienceSnapshot = { tables: Record<string, NativeRow[]>; hashes: string[]; identities: Array<{channel: string; destination: string; hash: string}> };
export type ImportFile = { name: string; csv: string; preset: string; mapping?: Record<string, string> };
/** `origin` names a source reviewed elsewhere (an archive move-in): each origin gets its own plan. */
export type ImportInput = { files: ImportFile[]; consent?: Record<string, string>; fingerprint?: string; origin?: string };
export const presetStatuses: Record<string, string> = {
  'csv-subscribed': 'subscribed', 'csv-unsubscribed': 'unsubscribed',
  'csv-cleaned': 'suppressed', 'csv-non-subscribed': 'non-subscribed', mango: 'non-subscribed',
};
export const defaultMapping: Record<string, readonly string[]> = {
  email: ['email address', 'email'],
  status: ['email marketing status', 'email marketing', 'marketing status', 'status', 'email_status'],
  first_name: ['first name'], last_name: ['last name'],
  occurred_at: ['optin_time', 'occurred_at'], capture_ip: ['optin_ip', 'capture_ip'],
  confirmed_at: ['confirm_time', 'confirmed_at'], confirmation_ip: ['confirm_ip', 'confirmation_ip'],
};
