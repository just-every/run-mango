import { BlockedLinkHosts } from './blocked-link-hosts';
import { CampaignAttributionSummary } from './campaign-attribution';
import {ApprovalRequests} from '@/core/features/auth/ui/approval-requests';
import {usePermissions} from '@/core/features/auth/ui/permissions';
import {TestSendHistory,type TestSendAccess} from './test-send-history';
import {FollowupParent} from './campaign-followup';
import { DuplicateCampaign, SaveCampaignTemplate } from './campaign-reuse';
import { Modal } from '@/core/app/client/ui/modal';
import { Disclosure } from '@/core/app/client/ui/disclosure';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { type FieldErrors } from '@/core/app/client/ui/field-errors';
import { compositionFieldErrors } from './composition-field-errors';
import { approvalFieldErrors } from './approval-field-errors';
import { summarizeAudienceRules } from '../audience-summary';
import { Link, useParams, useBlocker, useLoaderData } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { requestJson } from '@/core/app/client/lib/api';
import type { ApprovalBlocker, CampaignDetail, Check, Revision } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState } from '@/core/app/client/ui/layout';
import { CampaignStatusPill } from './campaign-status-pill';

import { ApprovalCheckList, approvalFindingDescription } from './approval-check-list';
import { AudienceSnapshot } from './audience-snapshot';
import { CampaignCompositionEditor } from './composition-editor';
import { DeliveryPlan } from './delivery-plan';
import { toDraftComposition, type DraftComposition } from './draft-composition';
import { RevisionPreviews } from './revision-previews';

type ReviewData = CampaignDetail & { blockers: ApprovalBlocker[] };

export function CampaignReviewPage() {
  const {can}=usePermissions();
  const { id } = useParams({ from: '/app/campaigns_/$id_/review' });
  const { modules } = useLoaderData({ from: '/app' });
  const { data, error, loading, reload, replace } = useResource<ReviewData>(`/api/campaigns/${id}/review`);
  const testAccess=useResource<TestSendAccess>(`/api/campaigns/${id}/test-sends`);
  const authoring = useResource<{timezone:string}>('/api/campaign-authoring');
  const [draft, setDraft] = useState<DraftComposition | undefined>(() => data?.revision ? toDraftComposition(data.revision, data.links, data.steps) : undefined);
  const [notice, setNotice] = useState<string>();
  const [noticeKind, setNoticeKind] = useState<'success'|'error'>('error');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validationRequest, setValidationRequest] = useState(0);
  const [testErrors, setTestErrors] = useState<FieldErrors>({});
  const [actionBlockers, setActionBlockers] = useState<ApprovalBlocker[]>();
  const [busy, setBusy] = useState<'save' | 'approve' | 'test' | 'reload' | 'acknowledge' | undefined>();
  const [needsCanonicalRead, setNeedsCanonicalRead] = useState(false);
  const [testChannel, setTestChannel] = useState<'email' | 'sms'>('email');
  const [testDestination, setTestDestination] = useState('');
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  useEffect(()=>{
    if (!testAccess.data) return;
    const delay=Math.max(0,Date.parse(testAccess.data.allowance.resetsAt)-Date.now());
    const timer=setTimeout(()=>void testAccess.reload(),Math.min(delay+100,2147483647));
    return ()=>clearTimeout(timer);
  },[testAccess.data?.allowance.resetsAt]);
  const savedComposition = data?.revision ? JSON.stringify(toDraftComposition(data.revision, data.links, data.steps)) : undefined;

  useEffect(() => {
    // Repeated reads of the same saved composition must not overwrite edits made while they were in flight.
    if (savedComposition) setDraft(JSON.parse(savedComposition));
  }, [data?.revision?.id, savedComposition]);

  const hasUnsavedChanges = Boolean(data?.revision && draft && JSON.stringify(draft) !== JSON.stringify(toDraftComposition(data.revision, data.links, data.steps)));
  const navigation = useBlocker({shouldBlockFn: () => hasUnsavedChanges, enableBeforeUnload: hasUnsavedChanges, withResolver: true});

  if (loading && !data) return <LoadState />;
  if (!data || !data.revision) return <LoadState error={error ?? 'This review could not find a saved revision.'} />;
  if (!draft) return <LoadState />;
  const revision = data.revision;
  const editable = data.campaign.state === 'draft' && can('draft.write');
  const savedDraft = toDraftComposition(revision, data.links, data.steps);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const findings = [...(actionBlockers ?? data.blockers), ...(data.checks ?? [])].filter((check, index, all) =>
    all.findIndex(other => other.kind === check.kind && other.detail === check.detail && other.status === check.status && other.blocking === check.blocking) === index);
  const blockingFindings = findings.filter(check => check.blocking);
  const approvalBlocked = needsCanonicalRead || blockingFindings.length > 0;
  const sourceBlocked = blockingFindings.some(check => check.kind === 'audience.source-freshness');

  const recheckSources = async () => {
    if (busy || dirty || needsCanonicalRead) return;
    setBusy('reload'); setNotice(undefined); setNoticeKind('error');
    try {
      const response = await requestJson(`/api/campaigns/${id}/checks`, {
        method: 'POST', body: JSON.stringify({revisionId: revision.id}),
      });
      if (response.status >= 300) {setNotice('Checks could not be refreshed. Reload the saved revision and try again.'); return;}
      await reload(); setActionBlockers(undefined);
    } catch {setNotice('Checks could not be refreshed. Check your connection and try again.');}
    finally {setBusy(undefined);}
  };

  const action = async (kind: 'approve' | 'test') => {
    if (busy) return;
    setNoticeKind('error');
    if (needsCanonicalRead) {setNotice('Reload the saved revision before approving or sending a test.'); return;}
    if (dirty) {setNotice('Save or discard your changes before using the saved revision.'); return;}
    if (kind === 'approve' && approvalBlocked) {setNotice('Resolve the blocking approval checks before scheduling.'); return;}
    if (kind === 'test' && !testDestination.trim()) {
      setNotice('Enter an operator-approved test destination before requesting a test send.');
      return;
    }
    setBusy(kind);
    setNotice(undefined);
    setActionBlockers(undefined);
    try {
    const response = await requestJson<{ status?: string; blockers?: ApprovalBlocker[]; error?: string; disposition?: 'accepted' | 'handoff-unknown'; results?: Array<{to:string}> }>(
      `/api/campaigns/${id}/${kind === 'test' ? 'test-send' : 'approve'}`,
      {
        method: 'POST',
        body: JSON.stringify(kind === 'test'
          ? { revisionId: revision.id, channel: testChannel, to: testAccess.data?.canType ? testDestination.split(',').map(value=>value.trim()).filter(Boolean) : testDestination }
          : { revisionId: revision.id, idempotencyKey: crypto.randomUUID() }),
      },
    );
    if (response.status === 409 && response.data.blockers) {
      setActionBlockers(response.data.blockers);
      setFieldErrors(approvalFieldErrors(response.data.blockers, draft));
      if (kind === 'approve') setValidationRequest(request => request + 1);
      setNotice(kind === 'test' ? `${response.data.results?.length ? 'Tests already sent to '+response.data.results.map(item=>item.to).join(', ')+'. ' : ''}Test stopped. Resolve the blockers below before trying again.` : 'Not approved. Resolve the blockers below and try again.');
      return;
    }
    if (response.status < 300 && response.data.status === 'scheduled') {
      setNoticeKind('success');
      setNotice('The exact saved revision is approved and scheduled.');
      await reload();
      return;
    }
    if (response.status < 300 && response.data.status === 'test-sent') {
      setNoticeKind('success');
      setNotice(response.data.disposition === 'accepted'
        ? 'The test send was accepted by the provider.'
        : 'The test send has an unknown provider outcome and will be reconciled.');
      await reload();
      return;
    }
    if (kind === 'test') setTestErrors({destination: response.data.error === 'test_destination_not_allowed' ? 'Use a destination approved by your operator in the test allowlist.' : 'Check the approved destination and sender in Settings before sending a test.'});
    setNotice('This action is unavailable. Check the approval checks and sending configuration, then try again.');
    } catch {setNotice('The result could not be confirmed. Reload this campaign before trying again.');}
    finally {setBusy(undefined);if(kind==='test')void testAccess.reload();}
  };

  const acknowledge = async (check: Check) => {
    if (busy || dirty || needsCanonicalRead || !check.findingIdentity) return;
    setBusy('acknowledge');
    setNotice(undefined);
    setNoticeKind('error');
    try {
      const response = await requestJson<{error?: string}>(`/api/campaigns/${id}/checks/${check.id}/acknowledge`, {
        method: 'POST', body: JSON.stringify({revisionId: revision.id, findingIdentity: check.findingIdentity}),
      });
      const saved = await reload();
      if (response.status >= 300) {
        setNotice('The advisory changed or is no longer available. Review the saved findings before acknowledging.');
      } else if (!saved?.revision) {
        setNotice('Acknowledgement saved, but review could not be reloaded. Reload to see its record.');
      } else {
        setNoticeKind('success');
        setNotice('Advisory acknowledged. All approval checks still apply.');
      }
    } catch {setNotice('Acknowledgement could not be confirmed. Reload this campaign to check its record.');}
    finally {setBusy(undefined);}
  };

  const save = async () => {
    if (busy) return;
    setBusy('save');
    setNoticeKind('error');
    // A write may change the same revision ID. Local edits/discard cannot re-authorize its old preview.
    setNeedsCanonicalRead(true);
    setActionBlockers(undefined);
    try {
    setNotice(undefined);
    const response = await requestJson<{ revision?: Pick<Revision, 'id' | 'campaignId'>; review?: ReviewData; checksRefreshed?: boolean; error?: string; detail?:string; fields?: unknown; fieldErrors?: unknown; issues?: unknown }>(
      `/api/campaign-revisions/${revision.id}?review=true`,
      { method: 'PATCH', body: JSON.stringify({...draft,steps:draft.steps.map(step=>({...step,scheduledAt:step.scheduledAt||undefined,sendByAt:step.sendByAt||undefined}))}) },
    );
    if (response.status < 300 && response.data.revision) {
      const saved = response.data.review;
      if (!saved?.revision) {
        setNotice('Draft saved, but the saved revision could not be reloaded. Reload this campaign before approving.');
        return;
      }
      replace(saved);
      // Explicit acknowledgement also reconciles editor-only fields when normalization saved identical bytes.
      setDraft(toDraftComposition(saved.revision, saved.links, saved.steps));
      setFieldErrors({});
      setValidationRequest(request => request + 1);
      setNeedsCanonicalRead(false);
      setNoticeKind('success');
      setNotice(response.data.checksRefreshed ? 'Draft saved. Preview and checks are up to date.' : 'Full draft saved. Review checks could not be refreshed; approval will check the saved revision again.');
      setBusy(undefined);
      return;
    }
    setBusy(undefined);
    setFieldErrors(compositionFieldErrors(response.data.fields ?? response.data.fieldErrors, response.data.issues, draft));
    if(response.data.error==='email_too_large') {setNotice(response.data.detail ?? 'Email is too large. Your changes are still here.');return;}
    if (response.data.error === 'stale_revision') {setNotice('Another operator changed this draft. Your edits are still here. Copy any changes you want to keep, then discard your edits and reload the saved revision before editing again.'); return;}
    setNotice(response.data.error === 'revision_not_draft' ? 'Only draft revisions can be changed.' : 'Draft was not saved. Your changes are still here.');
    } catch {setNotice('Save could not be confirmed. Your changes are still here; reload to check the saved revision.');}
    finally {setBusy(undefined);}
  };

  const recover = async () => {
    if (busy || dirty) return;
    setBusy('reload');
    try {
      const saved = await reload();
      if (!saved?.revision) return;
      setDraft(toDraftComposition(saved.revision, saved.links, saved.steps));
      setNeedsCanonicalRead(false);
      setActionBlockers(undefined);
      setNoticeKind('success');
      setNotice('Saved revision reloaded. Review its content and checks before approving or sending a test.');
    } finally {setBusy(undefined);}
  };

  return (
    <div className="page-flow review-page">
      <FollowupParent campaignId={id} />
      <ApprovalRequests campaignId={id} revisionId={revision.id} dirty={dirty}/>
      <Modal open={navigation.status === 'blocked'} onClose={() => {if (navigation.status === 'blocked') navigation.reset();}} title="Leave without saving?" description="Your changes to this draft will be discarded.">
        <div className="detail-actions"><button className="secondary-action" type="button" onClick={() => {if (navigation.status === 'blocked') navigation.reset();}}>Keep editing</button><button className="danger-action--line" type="button" onClick={() => {if (navigation.status === 'blocked') navigation.proceed();}}>Discard and leave</button></div>
      </Modal>
      <Modal open={confirmingApproval} onClose={() => setConfirmingApproval(false)} title="Approve and schedule?" description={`Mango will send revision ${revision.version} exactly as saved to its eligible contacts at the scheduled time. Until it sends, you can cancel it from the campaign page.`}>
        <div className="detail-actions"><button className="secondary-action" type="button" onClick={() => setConfirmingApproval(false)}>Keep reviewing</button><button className="primary-action" type="button" disabled={Boolean(busy) || dirty || approvalBlocked} onClick={() => {setConfirmingApproval(false); void action('approve');}}>Approve &amp; schedule</button></div>
      </Modal>
      <header className="page-head review-heading">
        <div className="page-head__text">
          <Link className="back-link" to="/app/campaigns">
            ← Back to campaigns
          </Link>
          <p className="eyebrow">Review campaign</p>
          <h1>{revision.name}</h1>
          <p className="page-head__meta review-heading__meta"><span>Revision {revision.version}</span> · <CampaignStatusPill state={data.campaign.state} results={data.results} /></p>
        </div>
        {<div className="page-head__actions review-heading__actions">
          <DuplicateCampaign campaignId={id} disabled={dirty||Boolean(busy)}/>
          {editable && sourceBlocked ? <button className="secondary-action" type="button" disabled={Boolean(busy) || dirty || needsCanonicalRead} onClick={() => void recheckSources()}>{busy === 'reload' ? 'Checking…' : 'Recheck sources'}</button> : null}
          {editable ? <button className="primary-action" type="button" aria-describedby={!dirty && blockingFindings.length ? 'approval-blocked-reason' : undefined} onClick={() => dirty ? (document.getElementById('campaign-composer') as HTMLFormElement | null)?.requestSubmit() : setConfirmingApproval(true)} disabled={Boolean(busy) || (!dirty && (approvalBlocked || !can('campaign.approve')))}>
            {busy === 'save' ? 'Saving…' : busy === 'approve' ? 'Checking…' : dirty ? 'Save changes' : can('campaign.approve') ? 'Approve & schedule' : 'Save changes'}
          </button> : null}
          {data.results ? <Link className="primary-action" to="/app/campaigns/$id/scheduled" params={{id}}>View schedule and results</Link> : null}
        </div>}
      </header>
      <CampaignAttributionSummary attribution={data.attribution} version={revision.version}/>
      {editable && blockingFindings.length ? <p id="approval-blocked-reason" className="notice-note" role="status">Approval blocked: {approvalFindingDescription(blockingFindings[0])}{blockingFindings.length > 1 ? ` Review all ${blockingFindings.length} blocking checks below.` : ''}</p> : null}
      {dirty ? <div className="unsaved-notice" role="status"><span>Unsaved changes. Save before approving.</span><button type="button" className="text-link" disabled={Boolean(busy)} onClick={() => {setDraft(savedDraft); setNotice(undefined);}}>Discard changes</button></div> : null}
      {notice ? <p className={noticeKind === 'success' ? 'action-notice' : 'inline-error'} role={noticeKind === 'success' ? 'status' : 'alert'}>{notice}</p> : null}
      {needsCanonicalRead ? <section className="panel" role="region" aria-labelledby="canonical-read-title">
        <p className="eyebrow" id="canonical-read-title">Saved revision needs reloading</p>
        <p>The displayed saved preview and checks are out of date. Approval and test sends are unavailable until the saved revision is reloaded.</p>
        <p>{dirty ? 'Your edits are still here. Save them, or discard them before reloading the saved revision.' : 'Reload the saved revision, then review its content and checks.'}</p>
        <button className="secondary-action" type="button" onClick={() => void recover()} disabled={Boolean(busy) || dirty}>Reload saved revision</button>
      </section> : null}
      <ApprovalCheckList checks={findings} onAcknowledge={can('campaign.approve') ? check => void acknowledge(check) : undefined} acknowledgementDisabled={Boolean(busy) || dirty || needsCanonicalRead} title="Approval checks" eyebrow="Saved revision" emptyMessage="Approval will check this saved revision and current consent." />
      <BlockedLinkHosts campaignId={id} blockedHosts={data.blockedHosts} findings={findings} links={data.links} canAllow={can('campaign.approve')} disabled={Boolean(busy) || dirty || needsCanonicalRead} onAllowed={async () => {await reload(); setActionBlockers(undefined);}} />
      <p className="saved-audience-summary notice-note"><strong>Saved audience:</strong> {revision.audienceMasked?'Audience conditions are restricted by your role.':summarizeAudienceRules(revision.inclusionRuleJson, revision.exclusionRulesJson)}</p>
      <SaveCampaignTemplate key={revision.id} revisionId={revision.id} name={revision.name} disabled={dirty||needsCanonicalRead||Boolean(busy)}/>
      <div className="review-layout">
        {editable ? authoring.loading ? <LoadState /> : authoring.error || !authoring.data?.timezone
          ? <LoadState error="Campaign authoring is unavailable: the configured store time zone could not be loaded." />
          : <CampaignCompositionEditor campaignId={id} draft={draft} savedEmailBody={revision.emailBody} mediaOrigin={data.mediaOrigin} busy={Boolean(busy)} storeTimezone={authoring.data.timezone} onChange={setDraft} serverErrors={fieldErrors} validationRequest={validationRequest} onSave={() => void save()} />
          : <RevisionPreviews revision={revision} links={data.links} mediaOrigin={data.mediaOrigin} smsPreview={data.smsPreview} />}
        <div className="review-facts">
          {editable ? <section className="review-previews">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Previews</p>
                <h2>Saved revision content</h2>
              </div>
            </div>
            <RevisionPreviews revision={revision} links={data.links} mediaOrigin={data.mediaOrigin} smsPreview={data.smsPreview} />
          </section> : null}
          {editable && can('campaign.test') ? <Disclosure className="panel test-send-panel" title="Send a test">
            <p className="muted-copy">Uses the saved revision. {testAccess.data?.canType ? 'Enter up to five email addresses, separated by commas.' : 'Choose a configured test destination.'} Unsubscribed and suppressed addresses are refused. SMS tests use the configured test destinations.</p>
            {testAccess.data ? <p role="status" aria-label="Daily test allowance">{testAccess.data.allowance.remaining} of {testAccess.data.allowance.limit} test recipient hand-offs remaining today. Resets at 00:00 UTC. Uncertain outcomes count.</p> : <LoadState error={testAccess.error} />}

            {!testDestination.trim() ? <p>Enter a test destination to send a test.</p> : null}
            {!revision.fromEmail || !revision.senderName ? <p>Email tests are unavailable until you save a sender identity in Settings and update this draft.</p> : null}
            {dirty ? <p>Save your changes before sending a test of this revision.</p> : null}
            <ValidationForm className="test-send-fields" aria-label="Send a test" serverErrors={testErrors} onValidSubmit={() => void action('test')}>
              <label>Test channel<select aria-label="Test channel" value={testChannel} onChange={event => setTestChannel(event.target.value as 'email' | 'sms')}><option value="email">Email</option>{modules.sms ? <option value="sms">SMS</option> : null}</select></label>
              {testAccess.data?.canType ? <label>Test destination (required)<Field name="destination" label="Test destination" required validate={() => {const values=testDestination.split(',').map(value=>value.trim()).filter(Boolean);return values.length>5?'Enter at most five destinations.':values.some(value=>testChannel==='sms'?!/^\+[1-9]\d{6,14}$/.test(value):!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))?'Enter valid email addresses, or SMS numbers with their country code.':undefined;}}><input aria-label="Test destination" type="text" inputMode={testChannel === 'email' ? 'email' : 'tel'} value={testDestination} onChange={event => setTestDestination(event.target.value)} /></Field></label> : <label>Configured test destination<select aria-label="Configured test destination" value={testDestination} required onChange={event=>setTestDestination(event.target.value)}><option value="">Choose a destination</option>{testAccess.data?.destinations[testChannel].map(to=><option key={to} value={to}>{to}</option>)}</select></label>}
              <button className="secondary-action" type="submit" disabled={!testAccess.data || Boolean(busy) || dirty || needsCanonicalRead || !revision.fromEmail || !revision.senderName}>{busy === 'test' ? 'Checking…' : 'Send test'}</button>
            </ValidationForm>
            <TestSendHistory tests={testAccess.data?.tests??[]} />
          </Disclosure> : null}
          <AudienceSnapshot revision={revision} audience={data.audience} channelCounts={data.audienceChannelCounts} exclusions={data.audience ? JSON.parse(data.audience.exclusions).map((item: {reason:string;count:number}) => ({...item,id:item.reason})) : []} />
          <DeliveryPlan steps={data.steps} />
        </div>
      </div>
    </div>
  );
}
