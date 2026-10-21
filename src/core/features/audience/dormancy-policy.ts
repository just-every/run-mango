import { z } from 'zod';
export const dormancyPolicySchema=z.object({enabled:z.boolean(),windowDays:z.number().int().min(1).max(3650),includeOpenOnly:z.boolean()}).strict();
export type DormancyPolicy=z.infer<typeof dormancyPolicySchema>;
export const defaultDormancyPolicy:DormancyPolicy={enabled:true,windowDays:365,includeOpenOnly:false};
/** Undefined is the pre-migration native default; malformed saved policy fails closed. */
export function readDormancyPolicy(json?:string):DormancyPolicy {
  return json===undefined?{...defaultDormancyPolicy}:dormancyPolicySchema.parse(JSON.parse(json));
}
export async function installationDormancyPolicy(db:D1Database) {
  const row=await db.prepare('SELECT policy_json FROM audience_exclusion_settings WHERE id=1').first<{policy_json:string}>();
  return readDormancyPolicy(row?.policy_json);
}
