import { requestJson } from '@/core/app/client/lib/api';

import type {ProductRole} from '@/core/features/auth/permissions';
export type SettingsOperator = { role: ProductRole; unmaskedContacts: boolean; id: string; displayName: string; email: string; isInitial: boolean; status?: 'invited' | 'active' | 'inactive' };

export class OperatorProofRequired extends Error {
  constructor() { super('Confirm your email again before inviting an operator.'); }
}

const knownErrors: Record<string, string> = {
  'A valid operator email address is required.': 'Enter a valid email address.',
  'The initial operator can remove themselves only.': 'The setup operator can only remove their own access.',
  'Operator does not exist.': 'This operator no longer has access. Refresh the list.',
  last_owner: 'Assign another active owner before changing your own role.',
  invalid_request: 'Enter a valid email address.',
  authority_changed: 'Operator access changed during removal. Review the refreshed list before trying again.',
  invitation_conflict: 'This invitation changed during removal. Review the refreshed list before trying again.',
  operator_not_found: 'This operator no longer has access. Review the refreshed list.',
  mail_unavailable: 'Confirmation mail is unavailable. Check the mail settings, then request a new link.',
  rate_limited: 'Too many confirmation requests. Wait before requesting another link.',
};

/** Never show raw server errors: persistence failures can contain private data. */
export async function operatorAction<T>(path: string, init: RequestInit): Promise<T> {
  const response = await requestJson<T & { error?: string }>(path, init);
  if (response.status === 401) {
    window.location.assign('/signin?reason=session-ended');
    throw new Error('Your session has ended. Sign in again.');
  }
  if (response.status >= 400) {
    if (response.status === 403 && response.data.error === 'step_up_required') throw new OperatorProofRequired();
    if (response.status === 403) throw new Error('The request was denied. Refresh the page and sign in again.');
    throw new Error(knownErrors[response.data.error ?? ''] ?? 'The change could not be saved. Check the operator list, then try again.');
  }
  return response.data;
}
