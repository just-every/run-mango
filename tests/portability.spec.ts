import {accountExport} from './move-in/archive';
import {consentEvidence} from './move-in/support';
import {seedFollowup} from './campaign-results/followup-fixture';
import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { portabilityRuntime } from './portability/runtime.mjs';
import { runCommand } from '../scripts/installer/run-command.mjs';
import { readArchive } from '../src/vendor/base/portability/index.mjs';
import { stageArchive } from './portability/flows';
import { png } from './support/images';

// Admission refusals reuse the smaller archives already produced by the erasure
// journey, leaving the populated CLI round-trip within its existing time budget.
async function refuseWrongPrivateAuthority(records: any[]) {
    const manifest = records[0];
    const wrong = await portabilityRuntime({ restore: true, key: 'different-private-key-at-least-thirty-two-bytes' });
    try {
      const request = (path: string, body: unknown, method = 'POST') => wrong.call('/api/portability/' + path, { method, cookie: wrong.cookie, body });
      const id = (await (await request('imports', { confirmed: true, manifest })).json()).id;
      for (const part of records.filter(record => record.kind === 'part')) expect((await request(`imports/${id}/parts/${part.index}`, part, 'PUT')).status).toBe(200);
      expect((await request(`imports/${id}/finalize`, { contentHash: records.at(-1).contentHash, archiveHash: records.at(-1).archiveHash })).status).toBe(409);
      expect((await wrong.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
      expect((await wrong.bucket.list()).objects).toEqual([]);
    } finally { await wrong.close(); }
}

async function refuseOpeningHistory(target: Awaited<ReturnType<typeof portabilityRuntime>>, records: any[]) {
    // A migration baseline with former subscribers is real history, even when
    // no contacts remain. Only the fresh zero-count baseline is replaceable.
    await target.db.prepare("UPDATE list_growth_baseline SET subscribed=1 WHERE channel='email'").run();
    const historicalId = await stageArchive(target, records);
    const historical = await target.call(`/api/portability/imports/${historicalId}/finalize`, {method:'POST',cookie:target.cookie,
      body:{contentHash:records.at(-1).contentHash,archiveHash:records.at(-1).archiveHash}});
    expect(historical.status).toBe(409);
    expect(await historical.json()).toEqual({error:'target_not_empty:list_growth_baseline'});
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
    expect(await target.db.prepare("SELECT subscribed FROM list_growth_baseline WHERE channel='email'").first()).toEqual({subscribed:1});
    expect((await target.call(`/api/portability/imports/${historicalId}/abort`, {method:'POST',cookie:target.cookie,body:{}})).status).toBe(200);
    await target.db.prepare("UPDATE list_growth_baseline SET subscribed=0 WHERE channel='email'").run();
}

test('[DATA-001] complete native records and uploaded assets round-trip without restoring login authority', async () => {
  test.setTimeout(180000);
  const source = await portabilityRuntime({beforeMigration:async(file:string,db:D1Database)=>{
    if(file==='0093_recipient_unsubscribe_method.sql')await db.batch([
      db.prepare("INSERT INTO recipient_steps(id,campaign_id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,transport_disposition,attempt_count,send_by_at,created_at,updated_at) VALUES('synthetic-mango-historic-recipient','synthetic-mango-old-campaign','synthetic-mango-old-revision','synthetic-mango-old-step','prior-upgrade','prior-upgrade','email','prior@example.test','synthetic-mango-historic-recipient','accepted',1,3,1,1)"),
      db.prepare("INSERT INTO public_action_tokens(id,contact_id,channel,recipient_step_id,purpose,token_digest,expires_at,used_at,created_at,updated_at) VALUES('synthetic-mango-historic-unsubscribe','prior-upgrade','email','synthetic-mango-historic-recipient','unsubscribe','synthetic-mango-historic-digest',3,2,1,2)")]);
    if(file==='0092_link_host_sources.sql')await db.prepare("INSERT INTO link_host_settings(id,hosts,updated_at,operator_id) VALUES(1,'legacy.example.test',1,'portable-operator')").run();
    if(file==='0081_imported_engagement.sql')await db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('prior-upgrade','prior@example.test','Prior data','unsubscribed','never-subscribed',1,1)").run();
    if(file==='0090_analytics_tagging.sql')await db.batch([db.prepare("INSERT INTO campaigns(id,state,active_revision_id,created_at,updated_at) VALUES('synthetic-mango-old-campaign','draft','synthetic-mango-old-revision',1,1)"),db.prepare("INSERT INTO campaign_revisions(id,campaign_id,version,state,name,email_subject,email_body,email_text,sms_body,sender_name,from_email,created_at,updated_at) VALUES('synthetic-mango-old-revision','synthetic-mango-old-campaign',1,'draft','Historic draft','Historic subject','<p>Historic</p>','Historic','','Mango','sender@example.test',1,1)")]);
    if(file==='0089_signup_capacity.sql')await db.prepare("INSERT INTO signup_settings(id,frequency_disclosure,updated_by,updated_at) VALUES('newsletter','Monthly','portable-operator',1)").run();
    if(file==='0087_paid_state_authority.sql') await db.batch([
      db.prepare("INSERT INTO paid_subscriptions(subscription_id,customer_id,contact_id,state,stripe_status,tax_amount,currency,state_event_id,state_at,created_at,updated_at) VALUES('synthetic-mango-21','synthetic-mango-22','prior-upgrade','active','active',80,'usd','synthetic-mango-23',1,1,1)"),
      db.prepare("INSERT INTO commerce_receipts(id,digest,received_at) VALUES('synthetic-mango-24','synthetic-mango-25',1)")]);
  }}), target = await portabilityRuntime({ restore: true });
  try {
    expect(await source.db.prepare("SELECT message_unsubscribed_at,unsubscribe_method FROM recipient_steps WHERE id='synthetic-mango-historic-recipient'").first()).toEqual({message_unsubscribed_at:2,unsubscribe_method:null});
    expect(await source.db.prepare("SELECT display_name FROM contacts WHERE id='prior-upgrade'").first()).toEqual({display_name:'Prior data'});
    expect((await source.db.prepare('SELECT count(*) n FROM imported_engagement_facts').first()).n).toBe(0);
    expect(await source.db.prepare("SELECT state,tax_amount,read_started_at FROM paid_subscriptions WHERE subscription_id='synthetic-mango-21'").first()).toEqual({state:'active',tax_amount:80,read_started_at:0});
    expect(await source.db.prepare("SELECT stripe_applied_at FROM commerce_receipts WHERE id='synthetic-mango-24'").first()).toEqual({stripe_applied_at:null});
    expect(await source.db.prepare("SELECT challenge_enabled,frequency_disclosure FROM signup_settings WHERE id='newsletter'").first()).toEqual({challenge_enabled:1,frequency_disclosure:'Monthly'});
    await source.db.prepare("INSERT INTO signup_allowance_levels(name,effective_at,value,operator_id,updated_at) VALUES('globalHour',1,1200,'portable-operator',1)").run();
    expect(await source.db.prepare("SELECT email_subject,utm_policy_json FROM campaign_revisions WHERE id='synthetic-mango-old-revision'").first()).toEqual({email_subject:'Historic subject',utm_policy_json:null});
    const analytics={enabled:true,source:'synthetic-mango',emailMedium:'email',smsMedium:'sms',campaign:'portable',content:''};
    expect((await source.call('/api/settings/analytics',{method:'PUT',cookie:source.cookie,body:analytics})).status).toBe(200);
    expect((await source.call('/api/settings/opt-in/hosted',{method:'PUT',cookie:source.cookie,body:{mode:'single'}})).status).toBe(200);
    expect((await source.call('/api/settings/opt-in/manual',{method:'PUT',cookie:source.cookie,body:{mode:'single'}})).status).toBe(200);
    const hand=await source.call('/api/contacts/consent',{method:'POST',cookie:source.cookie,body:{contact:{email:'synthetic-mango-portable-manual@example.test',displayName:'Portable market visitor'},channel:'email',brandOrLegalSender:'Mango',messageCategory:'newsletter',frequencyDisclosure:'Monthly',destinationJurisdiction:'AU',captureMethod:'operator-entry',captureSource:'Market permission card',permissionMethod:'written',affirmed:true,properties:{interest:'Seedlings'},consentText:'Please send the monthly newsletter.',consentVersion:'manual-entry-v1',occurredAt:new Date(Date.now()-60000).toISOString()}});
    expect(hand.status,await hand.clone().text()).toBe(201);const handEvidence=(await hand.json()).evidence;
    expect(await source.db.prepare('SELECT hosts,auto_sources FROM link_host_settings WHERE id=1').first()).toEqual({hosts:'legacy.example.test',auto_sources:0});
    expect((await source.call('/api/settings/link-hosts',{method:'PUT',cookie:source.cookie,body:{hosts:'portable.example.test'}})).status).toBe(200);
    const flowDraft={name:'synthetic-mango-103',trigger:'Email confirmation',nodes:[{id:'start',kind:'trigger',label:'Confirmed',next:['end']},{id:'end',kind:'exit',label:'Exit',next:[]}]};
    expect((await source.call('/api/flow-drafts',{method:'POST',cookie:source.cookie,body:flowDraft})).status).toBe(201);
    const sourceBundle={files:[{name:'synthetic-mango-150.csv',preset:'klaviyo',csv:'email,status,consent_timestamp,capture_method,lists\nsynthetic-mango-150@example.test,subscribed,2026-03-01T00:00:00Z,signup form,Garden topic'}],consent:consentEvidence,attestations:[{nonce:crypto.randomUUID(),sourceKey:'klaviyo:synthetic-mango-150.csv',typedSource:'Klaviyo — synthetic-mango-150.csv',answers:{brand:'yes',category:'yes',frequency:'yes',jurisdiction:'yes',wording:'yes',notPurchased:'yes'}}],sourceExtras:{notes:['Abandoned cart stays an unsupported outline.'],templates:[{name:'synthetic-mango-150-template',html:'<p>Portable source template</p>'}],segments:[{name:'Garden topic',conditions:'Imported membership snapshot.'}],history:[{email:'synthetic-mango-150@example.test',kind:'order',occurredAt:'2026-03-02T00:00:00Z',data:{orderId:'synthetic-mango-150-order'}}]}};
    const sourcePreview=await source.call('/api/audience/import-preview',{method:'POST',cookie:source.cookie,body:sourceBundle});expect(sourcePreview.status,await sourcePreview.clone().text()).toBe(200);
    const sourceImport=await source.call('/api/audience/imports',{method:'POST',cookie:source.cookie,body:{fingerprint:(await sourcePreview.json()).fingerprint}});expect(sourceImport.status,await sourceImport.clone().text()).toBe(200);expect((await sourceImport.json()).job.state).toBe('completed');
    const bytesArchive=await accountExport();
    const uploadArchive=async(path:string,fingerprint?:string)=>{
      const form=new FormData();form.set('archive',new File([bytesArchive],'account-export.zip',{type:'application/zip'}));form.set('consent',JSON.stringify(consentEvidence));if(fingerprint)form.set('fingerprint',fingerprint);
      const response=await fetch(source.origin+path,{method:'POST',headers:{Origin:source.origin,Cookie:source.cookie},body:form});expect(response.status,await response.clone().text()).toBe(200);return response.json();
    };
    const preview=await uploadArchive('/api/audience/archive-preview');
    let {archive:importedArchive}=await uploadArchive('/api/audience/archives',preview.fingerprint);
    while(importedArchive.state==='applying'){
      const response=await source.call(`/api/audience/archives/${importedArchive.id}/continue`,{method:'POST',cookie:source.cookie,body:{}});expect(response.status,await response.clone().text()).toBe(200);({archive:importedArchive}=await response.json());
    }
    expect(importedArchive.summary.engagement.imported).toBe(3);
    const importedFacts=(await source.db.prepare('SELECT * FROM imported_engagement_facts ORDER BY id').all()).results;
    const importedCoverage=(await source.db.prepare('SELECT * FROM move_in_contact_history ORDER BY id').all()).results;
    const draft = await source.call('/api/campaigns' , { method: 'POST', cookie: source.cookie, body: { mode: 'blank' } });
    expect(draft.status).toBe(201);
    const reusable=await source.call('/api/campaign-templates',{method:'POST',cookie:source.cookie,body:{revisionId:(await draft.clone().json()).revisionId,name:'Portable newsletter template'}});
    expect(reusable.status).toBe(201);
    const portableReusable=await source.call('/api/reusable-email-blocks',{method:'POST',cookie:source.cookie,body:{name:'synthetic-mango-154 footer',block:{html:'<p>synthetic-mango-154 reusable footer</p>'}}});expect(portableReusable.status).toBe(201);const portableBlock=await portableReusable.json();
    const portablePlacement=await source.call(`/api/reusable-email-blocks/${portableBlock.id}/place`,{method:'POST',cookie:source.cookie,body:{version:portableBlock.version,target:{kind:'campaign',id:(await draft.clone().json()).revisionId}}});expect(portablePlacement.status).toBe(200);

    await source.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('portable-contact','contact@example.test','Contact','unsubscribed','never-subscribed',1,1)").run();
    await source.db.prepare("INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at) VALUES('portable-opt-out','already-hashed','email','unsubscribed',1,1,1)").run();
    const followupSource=await seedFollowup(source.db,{config:{mailSender:{displayName:'Orchard Studio'}}} as any);
    const followup=await source.call(`/api/campaigns/${followupSource.campaignId}/followup`,{method:'POST',cookie:source.cookie,body:{subject:'A portable follow-up',delayHours:48,metric:'click'}});
    expect(followup.status).toBe(201);const followupDraft=await followup.json();
    const bytes = Uint8Array.from([0, 255, 127, 1]);
    await source.bucket.put('campaigns/original.png', bytes, { httpMetadata: { contentType: 'image/png' }, customMetadata: { label: 'Original' } });
    const image = png(5, 4);
    const form = new FormData();
    form.append('file', new Blob([image]), 'original.png');
    const uploaded = await fetch(`${source.origin}/api/campaign-assets`, { method: 'POST', body: form, headers: { Origin: source.origin, Cookie: source.cookie } });
    expect(uploaded.status).toBe(201);
    const campaignImage = (await uploaded.json()).asset;
    const archive = join(source.directory, 'source.ndjson'), session = join(source.directory, 'session');
    await writeFile(session, source.cookie, { mode: 0o600 });
    const command = (args: string[]) => runCommand('node', [resolve('src/vendor/base/portability/cli.mjs'), ...args], { write: () => {} });
    // Provider authority stays private and destination-owned; the non-secret
    // branded host is ordinary portable configuration.
    await source.db.prepare('INSERT INTO stripe_connection(id,key_cipher,signing_cipher,mode,last_four,connected_by,connected_at) VALUES(1,?,?,?,?,?,?)')
      .bind('synthetic-encrypted-api-key','synthetic-encrypted-signing-key','test','1234','owner@example.test',1).run();
    await source.db.prepare('INSERT INTO woocommerce_connection(slot,id,url,credentials,generation,connected_by,connected_at) VALUES(1,?,?,?,?,?,?)')
      .bind('synthetic-mango-11','https://woo.example.test/','synthetic-mango-12','synthetic-mango-13','portable-operator',1).run();
    await source.db.prepare("INSERT INTO sending_connection(id,generation,state,account_id,account_name,secret_cipher,last_four,broader,connected_by,connected_at) VALUES(1,'synthetic-mango-91','connected','synthetic-mango-92','Synthetic Mango','synthetic-mango-93','o-93',0,'portable-operator',1)").run();
    await source.db.prepare('INSERT INTO tracking_domain(id,host,updated_at,operator_id) VALUES(1,?,?,?)')
      .bind('links.example.test',1,'portable-operator').run();
    const allTables = (await source.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND sql IS NOT NULL").all()).results;
    await command(['export', '--origin', source.origin, '--session-file', session, '--out', archive]);
    const records = [];
    for await (const record of readArchive(new Response(await readFile(archive)).body!)) records.push(record);
    const manifest = records[0], original = records.filter(record => record.kind === 'part').flatMap(part => part.items).filter(item => item.kind === 'row');
    // Inventory before export creates temporary snapshot tables. Every source
    // table is archived or explicitly excluded by the maintained policy.
    for (const { name } of allTables) expect([...manifest.tables.map(table => table.name), ...manifest.excludedTables]).toContain(name);
    expect(original.some(row=>row.table==='consent_attestations'&&row.row.source_name==='Klaviyo — synthetic-mango-150.csv')).toBe(true);
    expect(original.some(row=>row.table==='campaign_templates'&&row.row.name==='synthetic-mango-150-template')).toBe(true);
    expect(original.some(row=>row.table==='contact_history'&&row.row.kind==='incumbent-order'&&row.row.occurred_at===Date.parse('2026-03-02T00:00:00Z'))).toBe(true);
    expect(original.some(row=>row.table==='flow_draft_revisions'&&JSON.parse(row.row.graph_json).name===flowDraft.name)).toBe(true);
    expect(original.some(row => row.table === 'campaign_templates' && row.row.name === 'Portable newsletter template')).toBe(true);
    expect(original.some(row=>row.table==='reusable_email_blocks'&&row.row.id===portableBlock.id)).toBe(true);expect(original.some(row=>row.table==='reusable_email_block_placements'&&row.row.block_id===portableBlock.id)).toBe(true);
    expect(original.some(row => row.table === 'campaign_followups' && row.row.campaign_id === followupDraft.campaignId)).toBe(true);
    expect(original.some(row => row.table === 'contacts' && row.row.id === 'portable-contact')).toBe(true);
    expect(original.some(row => row.table === 'surviving_opt_outs' && row.row.id === 'portable-opt-out')).toBe(true);
    expect(original.some(row => row.table.startsWith('oa_'))).toBe(false);
    expect(original.some(row => row.table === 'stripe_connection')).toBe(false);
    expect(original.some(row => row.table === 'woocommerce_connection')).toBe(false);
    expect(original.some(row=>row.table==='sending_connection'||row.table==='sending_proposals')).toBe(false);
    expect(JSON.stringify(original)).not.toContain('synthetic-mango-82');
    expect(JSON.stringify(original)).not.toContain('synthetic-mango-12');
    expect(JSON.stringify(original)).not.toContain('synthetic-encrypted-api-key');
    expect(original.filter(row => row.table === 'tracking_domain').map(row => row.row.host)).toEqual(['links.example.test']);
    expect((await target.call('/api/campaigns', { method: 'POST', cookie: target.cookie, body: { mode: 'blank' } })).status).toBe(503);
    expect((await target.call('/l/invalid-link-during-restore')).status).toBe(503);
    expect((await target.call('/subscribe/info')).status).toBe(503);
    expect((await target.call('/api/portability/exports', { method: 'POST', body: {} })).status).toBe(401);
    expect((await target.call('/api/portability/exports', { method: 'POST', cookie: target.cookie, body: {}, origin: 'https://other.example.test' })).status).toBe(403);
    await writeFile(session, target.cookie, { mode: 0o600 });
    await command(['import', '--origin', target.origin, '--session-file', session, '--from', archive]);
    // Restore and erasure cannot share a running app: only restore mode can
    // publish R2 objects, and that mode rejects deletion of an existing contact.
    expect((await target.call('/api/contacts/portable-contact', {method:'DELETE',cookie:target.cookie})).status).toBe(503);
    expect((await target.db.prepare("SELECT email FROM contacts WHERE id='portable-contact'").first()).email).toBe('contact@example.test');
    expect((await target.db.prepare('SELECT count(*) AS n FROM audience_erasures').first()).n).toBe(0);
    expect((await target.db.prepare('SELECT count(*) AS n FROM stripe_connection').first()).n).toBe(0);
    expect((await target.db.prepare('SELECT count(*) AS n FROM woocommerce_connection').first()).n).toBe(0);
    expect((await target.db.prepare('SELECT count(*) AS n FROM sending_connection').first()).n).toBe(0);
    expect((await target.db.prepare('SELECT host FROM tracking_domain WHERE id=1').first()).host).toBe('links.example.test');
    expect(await target.db.prepare("SELECT value FROM signup_allowance_levels WHERE name='globalHour'").first()).toEqual({value:1200});
    expect(JSON.parse((await target.db.prepare('SELECT policy_json FROM analytics_settings WHERE id=1').first()).policy_json)).toEqual(analytics);
    expect(await target.db.prepare("SELECT mode FROM opt_in_modes WHERE point='hosted'").first()).toEqual({mode:'single'});
    expect(await target.db.prepare('SELECT host FROM link_host_exclusions WHERE host=?').bind('legacy.example.test').first()).toEqual({host:'legacy.example.test'});
    expect(await target.db.prepare('SELECT capture_method,capture_source,confirmation_required FROM consent_evidence WHERE id=?').bind(handEvidence.id).first()).toEqual({capture_method:'operator-recorded',capture_source:handEvidence.captureSource,confirmation_required:0});
    expect(await target.db.prepare("SELECT challenge_enabled,frequency_disclosure FROM signup_settings WHERE id='newsletter'").first()).toEqual({challenge_enabled:1,frequency_disclosure:'Monthly'});
    expect((await target.db.prepare('SELECT * FROM imported_engagement_facts ORDER BY id').all()).results).toEqual(importedFacts);
    expect((await target.db.prepare('SELECT * FROM move_in_contact_history ORDER BY id').all()).results).toEqual(importedCoverage);
    expect(await target.db.prepare("SELECT message_unsubscribed_at,unsubscribe_method FROM recipient_steps WHERE id='synthetic-mango-historic-recipient'").first()).toEqual({message_unsubscribed_at:2,unsubscribe_method:null});
    await target.resume();
    expect((await(await target.call('/api/settings/link-hosts',{cookie:target.cookie})).json()).hosts).toEqual(['portable.example.test']);
    await writeFile(session, target.cookie, { mode: 0o600 });
    expect((await target.call('/api/portability/imports',{method:'POST',cookie:target.cookie,body:{confirmed:true,manifest}})).status).toBe(401);
    expect((await target.call('/api/portability/imports/prior-transfer/finalize',{method:'POST',cookie:target.cookie,body:{}})).status).toBe(401);
    expect(new Uint8Array(await (await target.bucket.get('campaigns/original.png'))!.arrayBuffer())).toEqual(bytes);
    expect((await target.call('/api/operator', { cookie: source.cookie })).status).toBe(401);
    expect((await target.call('/api/operator', { cookie: target.cookie })).status).toBe(200);
    const restoredFollowup=await target.call(`/api/campaigns/${followupDraft.campaignId}/followup-parent`,{cookie:target.cookie});
    expect(restoredFollowup.status).toBe(200);expect((await restoredFollowup.json()).followup.sourceCampaignId).toBe(followupSource.campaignId);
    const media = await target.call(`/media/${campaignImage.sha256}`);
    expect(media.status).toBe(200);
    expect(media.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await media.arrayBuffer())).toEqual(image);
    const asset = await target.bucket.get('campaigns/original.png');
    expect(new Uint8Array(await asset!.arrayBuffer())).toEqual(bytes);
    expect(asset!.httpMetadata.contentType).toBe('image/png');
    expect(asset!.customMetadata).toEqual({ label: 'Original' });
    const restored = join(target.directory, 'restored.ndjson');
    await command(['export', '--origin', target.origin, '--session-file', session, '--out', restored]);
    const roundTrip = [];
    for await (const record of readArchive(new Response(await readFile(restored)).body!)) roundTrip.push(record);
    const rows = roundTrip.filter(record => record.kind === 'part').flatMap(part => part.items).filter(item => item.kind === 'row');
    for (const row of original) expect(rows.some(restored => restored.table === row.table && JSON.stringify(restored.row) === JSON.stringify(row.row))).toBe(true);
    // Authentication adds only its current profile after import; domain records are unchanged.
    expect(rows.filter(row => row.table !== 'operators')).toEqual(original.filter(row => row.table !== 'operators'));
    expect((await target.db.prepare('SELECT id FROM oa_operators').all()).results).toEqual([{ id: target.actor.id }]);
    // Restored triggers fence paid-state writes; restore itself resumes no sends.
    const generation=async()=>Number((await target.db.prepare('SELECT generation FROM audience_source_authority WHERE id=1').first()).generation);
    for (const sql of [
      "UPDATE paid_subscriptions SET state='canceled' WHERE subscription_id='synthetic-mango-21'",
      "DELETE FROM paid_subscriptions WHERE subscription_id='synthetic-mango-21'",
      "INSERT INTO paid_subscriptions(subscription_id,customer_id,state,stripe_status,state_event_id,state_at,created_at,updated_at) VALUES('synthetic-mango-26','synthetic-mango-27','canceled','canceled','synthetic-mango-28',1,1,1)",
    ]) {const before=await generation();await target.db.prepare(sql).run();expect(await generation()).toBeGreaterThan(before);}

  } finally { await source.close(); await target.close(); }
});

test('[CONT-030] current erasure authority refuses an old archive on an empty restore target', async () => {
  test.setTimeout(180000);
  const source=await portabilityRuntime(),target=await portabilityRuntime({restore:true});
  const archive=async()=>{
    const response=await source.call('/api/portability/exports',{cookie:source.cookie,method:'POST',body:{}});
    expect(response.status).toBe(201);const {id}=await response.json();let status;
    do {const next=await source.call(`/api/portability/exports/${id}/advance`,{cookie:source.cookie,method:'POST',body:{}});expect(next.status).toBe(200);status=await next.json();}while(status.phase!=='complete');
    const download=await source.call(`/api/portability/exports/${id}/download`,{cookie:source.cookie});expect(download.status).toBe(200);
    const records=[];for await(const record of readArchive(download.body!))records.push(record);return records;
  };
  try {
    const email='archive-erasure-canary@example.test',name='ArchivePrivateCanary';
    const preview=await source.call('/api/audience/import-preview',{cookie:source.cookie,method:'POST',body:{files:[{name:'canary.csv',preset:'csv-unsubscribed',csv:`Email Address,First Name\n${email},${name}`}]}});
    expect(preview.status).toBe(200);const {fingerprint}=await preview.json();
    const started=await source.call('/api/audience/imports',{cookie:source.cookie,method:'POST',body:{fingerprint}});expect(started.status).toBe(200);let {job}=await started.json();
    while(['queued','applying'].includes(job.state)){const next=await source.call(`/api/audience/imports/${job.id}/resume`,{cookie:source.cookie,method:'POST',body:{}});expect(next.status).toBe(200);({job}=await next.json());}
    expect(job.state).toBe('completed');
    const contact=await source.db.prepare('SELECT id FROM contacts WHERE email=?').bind(email).first();
    await source.db.prepare("INSERT INTO paid_subscriptions(subscription_id,customer_id,contact_id,state,stripe_status,state_event_id,state_at,created_at,updated_at) VALUES('synthetic-mango-31','synthetic-mango-32',?,'active','active','synthetic-mango-33',1,1,1)").bind(contact.id).run();
    // A failed private-authority restore must also refuse a real R2 object.
    await source.bucket.put('synthetic-mango-171-original.png', png(5, 4), {httpMetadata:{contentType:'image/png'}});
    const before=await archive();expect(before[0].objects.length).toBeGreaterThan(0);expect(JSON.stringify(before)).toContain(email);
    expect(JSON.stringify(before)).toContain('synthetic-mango-31');
    await refuseWrongPrivateAuthority(before);
    const artifacts=(await source.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'rer_portability_snap_*' OR name GLOB 'rer_portability_stage_*')").all()).results.map(row=>row.name);
    artifacts.push('rer_portability_segments','rer_portability_parts','rer_portability_owned','rer_portability_jobs');
    let discarded=0;for(const table of artifacts)discarded+=(await source.db.prepare(`SELECT count(*) AS n FROM "${table.replaceAll('"','""')}"`).first()).n;
    expect(discarded).toBeGreaterThan(0);
    const erased=await source.call(`/api/contacts/${contact.id}`,{cookie:source.cookie,method:'DELETE'});expect(erased.status).toBe(202);let {receipt}=await erased.json();
    while(receipt.state==='pending'){const next=await source.call(`/api/audience/erasures/${receipt.reference}/resume`,{cookie:source.cookie,method:'POST',body:{}});expect([200,202]).toContain(next.status);({receipt}=await next.json());}
    expect(receipt.removed.transfer_artifacts).toBe(discarded);
    expect(receipt.removed.paid_subscriptions).toBe(1);
    expect((await source.db.prepare('SELECT count(*) AS n FROM paid_subscriptions WHERE contact_id=?').bind(contact.id).first()).n).toBe(0);
    const after=await archive();expect(JSON.stringify(after)).not.toContain('synthetic-mango-31');expect(JSON.stringify(after)).not.toContain(email);expect(JSON.stringify(after)).not.toContain(name);
    const latest=after[0];expect(latest.journal).toEqual([]);
    const request=(path:string,body:unknown,method='POST')=>target.call('/api/portability/'+path,{cookie:target.cookie,method,body});
    const created=await request('imports',{confirmed:true,manifest:before[0]});expect(created.status).toBe(201);const {id}=await created.json();
    for(const part of before.filter(record=>record.kind==='part'))expect((await request(`imports/${id}/parts/${part.index}`,part,'PUT')).status).toBe(200);
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
    const restored=await request(`imports/${id}/finalize`,{contentHash:before.at(-1).contentHash,archiveHash:before.at(-1).archiveHash,laterJournal:{sourceIdentity:latest.sourceIdentity,epoch:latest.epoch,journal:latest.journal}});
    const refusal=await restored.json();expect(restored.status,JSON.stringify(refusal)).toBe(400);expect(refusal.error).toBe('erasure_epoch');
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
    expect((await target.call('/api/operator',{cookie:target.cookie})).status).toBe(200);
    expect((await request(`imports/${id}/abort`,{})).status).toBe(200);
    await refuseOpeningHistory(target,after);
    const currentId=await stageArchive(target,after);
    const current=await request(`imports/${currentId}/finalize`,{contentHash:after.at(-1).contentHash,archiveHash:after.at(-1).archiveHash,laterJournal:{sourceIdentity:latest.sourceIdentity,epoch:latest.epoch,journal:[]}});
    expect(current.status,await current.clone().text()).toBe(200);
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
    const exportedRows=after.filter(record=>record.kind==='part').flatMap(part=>part.items).filter(item=>item.kind==='row');
    const optouts=(await target.db.prepare('SELECT * FROM surviving_opt_outs').all()).results;
    expect(optouts).toEqual(exportedRows.filter(item=>item.table==='surviving_opt_outs').map(item=>item.row));
    expect(optouts.length).toBeGreaterThan(0);
    // Current authority is now durable locally; an old manifest fails before staging.
    expect((await request('imports',{confirmed:true,manifest:before[0]})).status).toBe(400);
  } finally {await source.close();await target.close();}
});
