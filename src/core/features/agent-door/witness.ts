import { ToolRefusal, type ToolDefinition } from '@/vendor/base/agent-door/index.ts';
import type { Platform } from '@/core/shared/platform';
import { nativeOperator } from './native';
import { fingerprint } from './digest';

// Include the whole native product schema, including frozen recipients, native
// provider attempts, settings and authority. Authentication use and the shared
// door's own decision bookkeeping must not make a refused call look effective.
const omittedTables = new Set([
  'operator_sessions','operator_magic_links','operator_bootstraps','auth_rate_limits',
  'public_token_rate_limits','mango_agent_write_admissions','d1_migrations',
]);
function nativeTable(name: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(name) || omittedTables.has(name)) return false;
  if (/^(sqlite_|_cf_|agent_door_|test_)/.test(name)) return false;
  return !name.startsWith('oa_') || ['oa_operators','oa_auth_settings','oa_domain_rules'].includes(name);
}
function stableRow(table: string, row: Record<string, unknown>) {
  // Credential use is authentication bookkeeping; revocation and scope changes
  // remain in the witness. No row or credential is returned to the caller.
  return JSON.stringify(Object.fromEntries(Object.entries(row).filter(([key]) =>
    table !== 'integration_credentials' || key !== 'last_used_at').sort(([a],[b])=>a.localeCompare(b))));
}
export function witnessTool(platform: Platform): ToolDefinition {
  return {name:'mango.witness.read',title:'Read native change witness',description:'Read native object counts and digests without network effects or credential disclosure.',
    scope:'mango.witness.read',readOnly:true,classes:['standard'],clauses:['OPER-007','BASE-OPS-003'],
    inputSchema:{type:'object',properties:{},additionalProperties:false},outputSchema:{type:'object'},
    classify:()=>[{class:'standard',facts:{measure:1}}],
    async run(_args,ctx){
      const operator=await nativeOperator(platform,ctx.person.id);
      if(!['owner','admin'].includes(operator.role))throw new ToolRefusal('role_forbidden');
      const available=(await platform.database.$client.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all<{name:string}>()).results;
      const objects:Record<string,{count:number;sha256:string}>={};
      for(const {name} of available.filter(({name})=>nativeTable(name))){
        const values=(await platform.database.$client.prepare('SELECT * FROM "'+name+'"').all<Record<string,unknown>>()).results;
        objects[name]={count:values.length,sha256:await fingerprint(values.map(row=>stableRow(name,row)).sort())};
      }
      return {result:{objects}};
    }};
}
