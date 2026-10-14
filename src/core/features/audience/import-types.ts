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
  phone: ['phone', 'phone_e164', 'mobile', 'phone number'],
  sms_status: ['sms_status', 'sms marketing status'],
  sms_occurred_at: ['sms_occurred_at', 'sms optin time'], sms_confirmed_at: ['sms_confirmed_at', 'sms confirm time'],
  sms_brand: ['sms_brand'], sms_program: ['sms_program'], sms_category: ['sms_category'],
  sms_frequency: ['sms_frequency'], sms_jurisdiction: ['sms_jurisdiction'],
  sms_consent_text: ['sms_consent_text'], sms_consent_version: ['sms_consent_version'],
  sms_capture_ip: ['sms_capture_ip'], sms_confirmation_ip: ['sms_confirmation_ip'],
  sms_capture_method: ['sms_capture_method'], sms_capture_source: ['sms_capture_source'],
  sms_time_zone: ['sms_time_zone'], sms_location_source: ['sms_location_source'], sms_location_recorded_at: ['sms_location_recorded_at'],
  status: ['email marketing status', 'email marketing', 'marketing status', 'status', 'email_status'],
  first_name: ['first name'], last_name: ['last name'],
  occurred_at: ['optin_time', 'occurred_at'], capture_ip: ['optin_ip', 'capture_ip'],
  confirmed_at: ['confirm_time', 'confirmed_at'], confirmation_ip: ['confirm_ip', 'confirmation_ip'],
};
