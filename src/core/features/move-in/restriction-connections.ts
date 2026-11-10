import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import {seal,unseal} from '@/core/features/store/stripe/secrets';
import type {MailchimpOptions} from './mailchimp-transport';

export const restrictionConnectionSchema=z.object({
  dataCenter:z.string().regex(/^us[1-9][0-9]*$/),
  audienceId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  apiKey:z.string().min(16).max(512),
  consent:z.literal(true),
}).strict();
export type RestrictionConnection=MailchimpOptions & {id:string};
export async function restrictionConnections(platform:Platform):Promise<RestrictionConnection[]> {
  const rows=await platform.database.$client.prepare('SELECT id,data_center,audience_id,credentials FROM incumbent_restriction_connections').all<{id:string;data_center:string;audience_id:string;credentials:string}>();
  return Promise.all(rows.results.map(async row=>({id:row.id,dataCenter:row.data_center,audienceId:row.audience_id,
    apiKey:await unseal(row.credentials,platform.config.sessionSigningKey)})));
}
export const sealRestrictionKey=seal;
