import {readAudiencePlan} from '../import-plans';
import {containsLiteral} from './literals';
import {identifierNeedles,splitFreeText} from './needles';
import type {ErasureScope} from './types';
import {personalSourceLiterals} from './source-literals';
/** One reviewed file set per request. A plan joins the scope only when it names
 * the contact's exact id, email or phone; what this contact's own rows teach
 * (IPs, names, notes) never selects another plan, so one pass is complete. */
export async function discoverPlan(db:D1Database,scope:ErasureScope,cursor:number){
 const row=await db.prepare('SELECT rowid AS cursor,fingerprint,plan_json FROM audience_import_plans WHERE rowid>? ORDER BY rowid LIMIT 1').bind(cursor).first<{cursor:number;fingerprint:string;plan_json:string}>();
 if(!row)return {stage:-1,cursor:0};
 const plan=await readAudiencePlan(db,row);
 for(const entry of plan.entries){
  const source=entry.source.payload as Record<string,unknown>,values=source.values as Record<string,unknown>|undefined;
  if(!scope.emails.includes(String(source.email))&&!entry.effects.some(effect=>scope.ids.includes(effect.targetId)))continue;
  // Only this contact's own row teaches anything: its IPs, name and notes, all
  // matched only in rows already in scope. File names and capture sources are
  // shared by every row of a file and never select other plans or rows.
  const add=(list:string[],value:unknown)=>{if(typeof value==='string'&&value&&!list.includes(value))list.push(value);};
  for(const value of [values?.capture_ip,values?.confirmation_ip,values?.optin_ip,values?.confirm_ip])add(scope.ips,value);
  const text=splitFreeText([source.displayName,...personalSourceLiterals(values)]);
  for(const value of text.freeText)add(scope.freeText,value);
  for(const value of text.unsafeText)add(scope.unsafeText,value);
 }
 if(!scope.plans.includes(row.fingerprint)&&containsLiteral(plan,identifierNeedles(scope)))scope.plans.push(row.fingerprint);
 return {stage:-2,cursor:row.cursor};
}
