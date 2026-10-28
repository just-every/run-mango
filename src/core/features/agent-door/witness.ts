import { ToolRefusal, type ToolDefinition } from '@/vendor/base/agent-door/index.ts';
import type { Platform } from '@/core/shared/platform';
import { nativeOperator } from './native';
import { fingerprint } from './digest';

// Product state only. Credential bytes, auth session activity, rate counters and
// the door's own admission/audit bookkeeping are outside the returned witness.
const tables = [
  'campaigns','campaign_revisions','campaign_steps','campaign_revision_links','campaign_state_transitions',
  'campaign_approval_requests','campaign_audiences','campaign_audience_channel_counts','campaign_checks',
  'recipient_steps','step_dispatches','delivery_facts','lifecycle_audit_entries',
  'contacts','contact_email_addresses','contact_phones','consent_evidence','consent_capture_metadata',
  'contact_history','contact_suppressions','contact_merges','surviving_opt_outs','audience_segments',
  'audience_erasures','integration_contact_profiles','source_records','source_sync_runs',
  'proposals','proposal_transitions','design_jobs','design_candidates','campaign_assets','campaign_templates',
  'reusable_email_blocks','reusable_email_block_placements','flow_draft_revisions','woocommerce_flows',
  'woocommerce_flow_enrollments','newsletter_archive','insight_report_schedules','insight_report_deliveries',
  'signup_settings','opt_in_modes','operator_product_roles','sending_connection','mango_agent_work',
] as const;
export function witnessTool(platform: Platform): ToolDefinition {
  return {name:'mango.witness.read',title:'Read native change witness',description:'Read native object counts and digests without network effects or credential disclosure.',
    scope:'mango.witness.read',readOnly:true,classes:['standard'],clauses:['OPER-007','BASE-OPS-003'],
    inputSchema:{type:'object',properties:{},additionalProperties:false},outputSchema:{type:'object'},
    classify:()=>[{class:'standard',facts:{measure:1}}],
    async run(_args,ctx){
      const operator=await nativeOperator(platform,ctx.person.id);
      if(!['owner','admin'].includes(operator.role))throw new ToolRefusal('role_forbidden');
      const available=new Set((await platform.database.$client.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{name:string}>()).results.map(row=>row.name));
      const objects:Record<string,{count:number;sha256:string}>={};
      for(const name of tables.filter(name=>available.has(name))){
        const values=(await platform.database.$client.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()).results;
        objects[name]={count:values.length,sha256:await fingerprint(values)};
      }
      return {result:{objects}};
    }};
}
