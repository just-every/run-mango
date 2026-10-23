import type {Platform} from '@/core/shared/platform';
import {readContactProfile} from '@/core/features/audience/contact-profile';
import {IntegrationError} from './schema';

/** Use the operator profile's rule matcher; stale-source memberships remain
 * unavailable rather than being represented as a negative match. */
export async function readProfileMemberships(platform:Platform,contactId:string) {
  if(!contactId||contactId.length>160)throw new IntegrationError('invalid_contact_id',400);
  if(!await platform.database.$client.prepare('SELECT id FROM contacts WHERE id=? AND merge_lock IS NULL').bind(contactId).first())throw new IntegrationError('contact_not_found',404);
  return {contactId,segments:(await readContactProfile(platform,contactId)).segments};
}
