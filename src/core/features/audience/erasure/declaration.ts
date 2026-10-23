import {portableHash} from '../portable-hashes';
import type {ErasureScope} from './types';
export type ErasureTable={table:string;where?:(s:ErasureScope)=>{sql:string;params:unknown[]};literal?:boolean;mode?:'audit'|'recipient'|'redact'|'contact-data'|'invalidate-campaign'|'invalidate-recipient'};
const set=(column:string,values:string[])=>({sql:`${column} IN (SELECT value FROM json_each(?))`,params:[JSON.stringify(values)]});
const contact=(table:string,column='contact_id'):ErasureTable=>({table,where:s=>set(column,s.ids)});
const recipient=(table:string):ErasureTable=>({table,where:s=>({sql:'recipient_step_id IN (SELECT id FROM recipient_steps WHERE contact_id IN (SELECT value FROM json_each(?)))',params:[JSON.stringify(s.ids)]}),literal:true});
/** Mango's complete contact cascade, in dependency order. Base import custody is
 * withdrawn as whole jobs because the shared helper cannot select source-only rows.
 * Independent operator identities/authentication and hash-only opt-outs are kept. */
// An unmatched provider fact belongs to the contact when its destination is one
// of the contact's own addresses or phones, as stored or in older phone formatting.
const destination="(CASE WHEN instr(json_extract(detail_json,'$.destination'),'@')>0 THEN lower(json_extract(detail_json,'$.destination')) ELSE replace(replace(replace(replace(replace(json_extract(detail_json,'$.destination'),' ',''),'(',''),')',''),'-',''),'.','') END)";
const custody=(table:string):ErasureTable=>({table,where:s=>set('job_id',s.jobs)});
// Base requires these children to be removed by its parent-delete triggers.
export const importJobCascadeChildren=['ik_d1_custody_states','ik_d1_stream_origins'] as const;
export const contactErasureTables:ErasureTable[]=[
  ...['ik_d1_preparation_receipts','ik_d1_staging_headers','ik_d1_staging_chunks','ik_d1_staging_originals','ik_d1_staging_index','ik_d1_staging_pages'].map(table=>({table,where:(s:ErasureScope)=>set('stage_id',s.stages)})),
  {table:'ik_d1_staging',where:s=>set('id',s.stages)},
  // Whole affected jobs are withdrawn, including no-effect source rows. Native
  // surviving contacts stay intact; stale resume/undo receipts become invalid.
  ...['ik_d1_native_staging_values','ik_d1_native_staging_index'].map(table=>({table,where:(s:ErasureScope)=>({sql:'stage_id IN (SELECT id FROM ik_d1_native_staging WHERE job_id IN (SELECT value FROM json_each(?)))',params:[JSON.stringify(s.jobs)]})})),
  ...['ik_d1_native_staging','ik_d1_creation_plans','ik_d1_reversal_reports','ik_d1_stream_pages','ik_d1_indexed_jobs','ik_d1_plan_index','ik_d1_plan_chunks','ik_d1_original_chunks','ik_d1_entries','ik_d1_history','ik_provenance','ik_sources','ik_originals','ik_original_sets','ik_stages','ik_batches','ik_d1_custody_revisions'].map(custody),
  {table:'ik_targets',literal:true,where:s=>set('id',s.ids)},
  {table:'ik_jobs',where:s=>set('id',s.jobs)},
  {table:'ik_d1_streams',where:s=>set('id',s.streams)},
  {table:'proposal_evidence_items',literal:true,where:s=>({sql:'source_record_id IN (SELECT source_record_id FROM source_activities WHERE contact_id IN (SELECT value FROM json_each(?)))',params:[JSON.stringify(s.ids)]})},
  {table:'commerce_refunds',literal:true,where:s=>({sql:'contact_id IN (SELECT value FROM json_each(?)) OR provider_order_id IN (SELECT provider_order_id FROM commerce_orders WHERE contact_id IN (SELECT value FROM json_each(?)))',params:[JSON.stringify(s.ids),JSON.stringify(s.ids)]})},{...contact('commerce_orders'),literal:true},
  recipient('open_estimate_facts'),recipient('open_tracking_tokens'),recipient('link_click_facts'),recipient('tracked_links'),recipient('attribution_facts'),recipient('external_cost_facts'),recipient('delivery_facts'),
  {table:'provider_fact_inbox',literal:true,where:s=>({sql:"json_extract(detail_json,'$.destinationHash') IN (SELECT value FROM json_each(?)) OR "+destination+" IN (SELECT value FROM json_each(?)) OR provider_message_id IN (SELECT provider_message_id FROM recipient_steps WHERE contact_id IN (SELECT value FROM json_each(?))) OR mango_reference IN (SELECT id FROM recipient_steps WHERE contact_id IN (SELECT value FROM json_each(?)))",params:[JSON.stringify(s.hashes),JSON.stringify([...s.emails,...s.phones]),JSON.stringify(s.ids),JSON.stringify(s.ids)]})},
  {...contact('recipient_steps'),mode:'recipient',literal:true},contact('campaign_revision_candidates'),
  contact('commerce_privacy_controls'),{...contact('commerce_observations'),literal:true},{...contact('source_activities'),literal:true},{...contact('source_records'),literal:true},
  {table:'public_token_rate_limits',where:s=>({sql:'token_digest IN (SELECT token_digest FROM public_action_tokens WHERE contact_id IN (SELECT value FROM json_each(?)) UNION SELECT token_digest FROM consent_confirmations WHERE contact_id IN (SELECT value FROM json_each(?)))',params:[JSON.stringify(s.ids),JSON.stringify(s.ids)]})},
  contact('sms_frequency_claims'),contact('sms_service_messages'),contact('sms_inbound_receipts'),contact('consent_handoff_claims'),
  contact('public_action_tokens'),contact('consent_confirmations'),contact('contact_bounce_facts'),contact('contact_bounce_states'),
  {...contact('sms_compliance_replies'),literal:true},contact('contact_import_rows'),
  {table:'audience_signup_requests',where:s=>set('destination_hash',s.signupHashes)},
  {table:'oa_limits',where:s=>set('key',[...s.signupHashes.flatMap(hash=>[`signup-email:${hash}`,`signup-sms:${hash}`]),...s.networkKeys.flatMap(key=>[key,key.replace('signup:','signup-kiosk:'),key.replace('signup:','signup-refused:')])])},
  {table:'rer_mail_development_outbox',literal:true,where:s=>({sql:"EXISTS(SELECT 1 FROM json_tree(message,'$.to') t WHERE t.type='text' AND lower(t.atom) IN (SELECT value FROM json_each(?)))",params:[JSON.stringify(s.emails)]})},
  // An archive move-in that brought the contact in withdraws its whole original archive;
  // the entry list (paths and hashes) stays, and imported history keeps only redacted text.
  {table:'move_in_archive_chunks',where:s=>({sql:'archive_id IN (SELECT id FROM move_in_archives WHERE audience_plan IN (SELECT value FROM json_each(?)) OR audience_stream IN (SELECT value FROM json_each(?)))',params:[JSON.stringify(s.plans),JSON.stringify(s.streams)]})},
  {table:'move_in_content',literal:true,mode:'redact'},
  {table:'audience_import_plan_chunks',where:s=>({sql:'fingerprint IN (SELECT value FROM json_each(?))',params:[JSON.stringify(s.plans)]})},
  {table:'audience_import_plan_contacts',where:s=>set('fingerprint',s.plans)},
  {table:'audience_import_plans',literal:true,where:s=>({sql:'fingerprint IN (SELECT value FROM json_each(?))',params:[JSON.stringify(s.plans)]})},
  // The plan index cascades with its header, after every body chunk was fenced.
  {table:'audience_segments',literal:true,mode:'redact'},
  {table:'campaigns',literal:true,mode:'redact'},
  {table:'campaign_revisions',literal:true,mode:'redact'},
  {table:'campaign_templates',literal:true,mode:'redact'},
  {table:'newsletter_archive',literal:true,mode:'redact'},
  {table:'campaign_followups',literal:true,mode:'redact'},
  {table:'campaign_draft_step_settings',literal:true,mode:'redact'},
  ...['audience_source_authority','commerce_source_coverage','source_syncs','source_sync_runs','source_sync_cursors','commerce_source_capabilities','campaign_channel_pauses','campaign_revision_links','campaign_steps','proposal_forecasts','campaign_audiences','campaign_checks','campaign_state_transitions','proposal_audiences','proposals','proposal_exclusions','proposal_steps','provider_outages','proposal_transitions','design_jobs'].map(table=>({table,literal:true,mode:'redact' as const})),
  // State-only consequences run as bounded, PK-fenced pages after literal edits.
  {table:'campaigns',mode:'invalidate-campaign',where:()=>({sql:"state<>'erasure-invalidated' AND active_revision_id IN (SELECT id FROM campaign_revisions WHERE state='erasure-invalidated')",params:[]})},
  {table:'recipient_steps',mode:'invalidate-recipient',where:()=>({sql:"transport_disposition='queued' AND revision_id IN (SELECT id FROM campaign_revisions WHERE state='erasure-invalidated')",params:[]})},
  {table:'lifecycle_audit_entries',literal:true,mode:'audit',where:s=>({sql:'(entity_type=\'contact\' AND entity_id IN (SELECT value FROM json_each(?))) OR actor_id IN (SELECT value FROM json_each(?))',params:[JSON.stringify(s.ids),JSON.stringify(s.ids)]})},
  // Shared file names, capture descriptions and historical prose can name a
  // different erased contact. Keep surviving consent, redact only its literals.
  ...['audience_import_observations','consent_capture_metadata','consent_evidence','contact_history'].map(table=>({...contact(table),literal:true,mode:'contact-data' as const})),
  {table:'contact_suppressions',where:s=>({sql:'contact_id IN (SELECT value FROM json_each(?)) OR destination_hash IN (SELECT value FROM json_each(?))',params:[JSON.stringify(s.ids),JSON.stringify(s.hashes)]})},
  // An address's portable identity stays while an opt-out or detached suppression
  // survives, so that restriction still leaves through the export (import-opt-out-lines).
  // Match the portable value too: prior mappings may use another installation's
  // hash as their key. Derive it here so already-pending erasure scopes work too.
  {table:'audience_portable_hashes',where:s=>({sql:'(destination_hash IN (SELECT value FROM json_each(?)) OR portable_hash IN (SELECT value FROM json_each(?))) AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs o WHERE o.destination_hash=audience_portable_hashes.destination_hash) AND NOT EXISTS(SELECT 1 FROM contact_suppressions c WHERE c.destination_hash=audience_portable_hashes.destination_hash)',params:[JSON.stringify(s.hashes),JSON.stringify([...s.emails,...s.phones].map(portableHash))]})},
  contact('mango_audience_hashes'),contact('mango_import_revisions'),contact('contact_email_addresses'),contact('contact_phones'),
  {table:'contact_merges',where:s=>({sql:'survivor_contact_id IN (SELECT value FROM json_each(?)) OR merged_contact_id IN (SELECT value FROM json_each(?))',params:[JSON.stringify(s.ids),JSON.stringify(s.ids)]})},
  // Append stages: persisted erasure cursors depend on every earlier index.
  contact('list_growth_attribution'),
  contact('operator_privacy_requests'),
  {...contact('imported_engagement_facts'),literal:true,mode:'contact-data'},
  contact('move_in_contact_history'),
  contact('paid_subscriptions'),
  {table:'audience_exclusion_settings',literal:true,mode:'redact'},
  contact('woocommerce_flow_enrollments'),
  {table:'analytics_settings',literal:true,mode:'redact'},
  {table:'opt_in_modes',literal:true,mode:'redact'},
  {table:'link_host_exclusions',literal:true,mode:'redact'},
  {table:'link_host_sources',literal:true,mode:'redact'},
  {table:'link_host_source_versions',literal:true,mode:'redact'},
  // Operator-only delivery markers contain no contact data: erasure is a no-op.
  {table:'sender_renewal_deliveries',where:()=>({sql:'0',params:[]})},
  // Aggregate saved reports and operator-only schedules have no contact data.
  ...['insight_saved_reports','insight_report_schedules','insight_report_deliveries'].map(table=>({table,where:()=>({sql:'0',params:[]})})),
];
