import { Modal } from '@/core/app/client/ui/modal';
import { Disclosure } from '@/core/app/client/ui/disclosure';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { type FieldErrors } from '@/core/app/client/ui/field-errors';
import { compositionFieldErrors } from './composition-field-errors';
import { approvalFieldErrors } from './approval-field-errors';
import { summarizeAudienceRules } from '../audience-summary';
import { Link, useParams, useBlocker } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { requestJson } from '@/core/app/client/lib/api';
import type { ApprovalBlocker, CampaignDetail, Revision } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState, StatusPill } from '@/core/app/client/ui/layout';

import { ApprovalCheckList } from './approval-check-list';
import { AudienceSnapshot } from './audience-snapshot';
import { CampaignCompositionEditor } from './composition-editor';
import { DeliveryPlan } from './delivery-plan';
import { toDraftComposition, type DraftComposition } from './draft-composition';
import { RevisionPreviews } from './revision-previews';

type ReviewData = CampaignDetail & { blockers: ApprovalBlocker[] };

export function CampaignReviewPage() {
  const { id } = useParams({ from: '/app/campaigns_/$id_/review' });
  const { data, error, loading, reload } = useResource<ReviewData>(`/api/campaigns/${id}/review`);
  const authoring = useResource<{timezone:string}>('/api/campaign-authoring');
  const [draft, setDraft] = useState<DraftComposition>();
  const [notice, setNotice] = useState<string>();
  const [noticeKind, setNoticeKind] = useState<'success'|'error'>('error');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validationRequest, setValidationRequest] = useState(0);
  const [testErrors, setTestErrors] = useState<FieldErrors>({});
  const [actionBlockers, setActionBlockers] = useState<ApprovalBlocker[]>();
  const [busy, setBusy] = useState<'save' | 'approve' | 'test' | 'reload' | undefined>();
  const [needsCanonicalRead, setNeedsCanonicalRead] = useState(false);
  const [testChannel, setTestChannel] = useState<'email' | 'sms'>('email');
  const [testDestination, setTestDestination] = useState('');
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
  const editable = data.campaign.state === 'draft';
  const savedDraft = toDraftComposition(revision, data.links, data.steps);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const findings = [...(actionBlockers ?? data.blockers), ...(data.checks ?? [])].filter((check, index, all) =>
    all.findIndex(other => other.kind === check.kind && other.detail === check.detail && other.status === check.status) === index);


  const action = async (kind: 'approve' | 'test') => {
    if (busy) return;
    setNoticeKind('error');
    if (needsCanonicalRead) {setNotice('Reload the saved revision before approving or sending a test.'); return;}
    if (dirty) {setNotice('Save or discard your changes before using the saved revision.'); return;}
    if (kind === 'test' && !testDestination.trim()) {
      setNotice('Enter an operator-approved test destination before requesting a test send.');
      return;
    }
    setBusy(kind);
    setNotice(undefined);
    setActionBlockers(undefined);
    try {
    const response = await requestJson<{ status?: string; blockers?: ApprovalBlocker[]; error?: string; disposition?: 'accepted' | 'handoff-unknown' }>(
      `/api/campaigns/${id}/${kind === 'test' ? 'test-send' : 'approve'}`,
      {
        method: 'POST',
        body: JSON.stringify(kind === 'test'
          ? { revisionId: revision.id, channel: testChannel, to: testDestination.trim() }
          : { revisionId: revision.id, idempotencyKey: crypto.randomUUID() }),
      },
    );
    setBusy(undefined);
    if (response.status === 409 && response.data.blockers) {
      setActionBlockers(response.data.blockers);
      setFieldErrors(approvalFieldErrors(response.data.blockers, draft));
      if (kind === 'approve') setValidationRequest(request => request + 1);
      setNotice('Campaign unchanged. Resolve the blockers below and try again.');
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
    const response = await requestJson<{ revision?: Revision; error?: string; fields?: unknown; fieldErrors?: unknown; issues?: unknown }>(
      `/api/campaign-revisions/${revision.id}`,
      { method: 'PATCH', body: JSON.stringify({...draft,steps:draft.steps.map(step=>({...step,scheduledAt:step.scheduledAt||undefined,sendByAt:step.sendByAt||undefined}))}) },
    );
    if (response.status < 300 && response.data.revision) {
      const checks = await requestJson(`/api/campaigns/${id}/checks`, {method: 'POST', body: JSON.stringify({revisionId: revision.id})});
      const saved = await reload();
      if (!saved?.revision) {
        setNotice('Draft saved, but the saved revision could not be reloaded. Reload this campaign before approving.');
        return;
      }
      // Explicit acknowledgement also reconciles editor-only fields when normalization saved identical bytes.
      setDraft(toDraftComposition(saved.revision, saved.links, saved.steps));
      setFieldErrors({});
      setValidationRequest(request => request + 1);
      setNeedsCanonicalRead(false);
      setNoticeKind('success');
      setNotice(checks.status < 300 ? 'Draft saved. Preview and checks are up to date.' : 'Full draft saved. Review checks could not be refreshed; approval will check the saved revision again.');
      setBusy(undefined);
      return;
    }
    setBusy(undefined);
    setFieldErrors(compositionFieldErrors(response.data.fields ?? response.data.fieldErrors, response.data.issues, draft));
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
      <Modal open={navigation.status === 'blocked'} onClose={() => {if (navigation.status === 'blocked') navigation.reset();}} title="Leave without saving?" description="Your changes to this draft will be discarded.">
        <div className="detail-actions"><button className="secondary-action" type="button" onClick={() => {if (navigation.status === 'blocked') navigation.reset();}}>Keep editing</button><button className="danger-action--line" type="button" onClick={() => {if (navigation.status === 'blocked') navigation.proceed();}}>Discard and leave</button></div>
      </Modal>
      <header className="page-head review-heading">
        <div className="page-head__text">
          <Link className="back-link" to="/app/campaigns">
            ← Back to campaigns
          </Link>
          <p className="eyebrow">Review campaign</p>
          <h1>{revision.name}</h1>
          <p className="page-head__meta review-heading__meta"><span>Revision {revision.version}</span> · <StatusPill value={data.campaign.state} /></p>
        </div>
        {editable || data.results ? <div className="page-head__actions review-heading__actions">
          {editable ? <button className="primary-action" type="button" onClick={() => dirty ? (document.getElementById('campaign-composer') as HTMLFormElement | null)?.requestSubmit() : void action('approve')} disabled={Boolean(busy) || (!dirty && needsCanonicalRead)}>
            {busy === 'save' ? 'Saving…' : busy === 'approve' ? 'Checking…' : dirty ? 'Save changes' : 'Approve & schedule'}
          </button> : null}
          {data.results ? <Link className="primary-action" to="/app/campaigns/$id/scheduled" params={{id}}>View schedule and results</Link> : null}
        </div> : null}
      </header>
      {dirty ? <div className="unsaved-notice" role="status"><span>Unsaved changes. Save before approving.</span><button type="button" className="text-link" disabled={Boolean(busy)} onClick={() => {setDraft(savedDraft); setNotice(undefined);}}>Discard changes</button></div> : null}
      {notice ? <p className={noticeKind === 'success' ? 'action-notice' : 'inline-error'} role={noticeKind === 'success' ? 'status' : 'alert'}>{notice}</p> : null}
      {needsCanonicalRead ? <section className="panel" role="region" aria-labelledby="canonical-read-title">
        <p className="eyebrow" id="canonical-read-title">Saved revision needs reloading</p>
        <p>The displayed saved preview and checks are out of date. Approval and test sends are unavailable until the saved revision is reloaded.</p>
        <p>{dirty ? 'Your edits are still here. Save them, or discard them before reloading the saved revision.' : 'Reload the saved revision, then review its content and checks.'}</p>
        <button className="secondary-action" type="button" onClick={() => void recover()} disabled={Boolean(busy) || dirty}>Reload saved revision</button>
      </section> : null}
      <ApprovalCheckList checks={findings} title="Approval checks" eyebrow="Saved revision" emptyMessage="Approval will check this saved revision and current consent." />
      <p className="saved-audience-summary notice-note"><strong>Saved audience:</strong> {summarizeAudienceRules(revision.inclusionRuleJson, revision.exclusionRulesJson)}</p>
      <div className="review-layout">
        {editable ? authoring.loading ? <LoadState /> : authoring.error || !authoring.data?.timezone
          ? <LoadState error="Campaign authoring is unavailable: the configured store time zone could not be loaded." />
          : <CampaignCompositionEditor draft={draft} busy={Boolean(busy)} storeTimezone={authoring.data.timezone} onChange={setDraft} serverErrors={fieldErrors} validationRequest={validationRequest} onSave={() => void save()} />
          : <RevisionPreviews revision={revision} links={data.links} />}
        <div className="review-facts">
          {editable ? <section className="review-previews">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Previews</p>
                <h2>Saved revision content</h2>
              </div>
            </div>
            <RevisionPreviews revision={revision} links={data.links} />
          </section> : null}
          {editable ? <Disclosure className="panel test-send-panel" title="Send a test">
            <p className="muted-copy">Uses the saved revision and an approved test destination. Configure approved destinations in the operations guide.</p>
            {!testDestination.trim() ? <p>Enter an approved test destination to send a test.</p> : null}
            {!revision.fromEmail || !revision.senderName ? <p>Email tests are unavailable until you save a sender identity in Settings and update this draft.</p> : null}
            {dirty ? <p>Save your changes before sending a test of this revision.</p> : null}
            <ValidationForm className="test-send-fields" aria-label="Send a test" serverErrors={testErrors} onValidSubmit={() => void action('test')}>
              <label>Test channel<select aria-label="Test channel" value={testChannel} onChange={event => setTestChannel(event.target.value as 'email' | 'sms')}><option value="email">Email</option><option value="sms">SMS</option></select></label>
              <label>Test destination (required)<Field name="destination" label="Test destination" required validate={() => testChannel === 'sms' && !/^\+[1-9]\d{6,14}$/.test(testDestination.trim()) ? 'Enter a phone number with its country code, such as +61412345678.' : undefined}><input aria-label="Test destination" type={testChannel === 'email' ? 'email' : 'tel'} value={testDestination} onChange={event => setTestDestination(event.target.value)} /></Field></label>
              <button className="secondary-action" type="submit" disabled={Boolean(busy) || dirty || needsCanonicalRead || !revision.fromEmail || !revision.senderName}>{busy === 'test' ? 'Checking…' : 'Send test'}</button>
            </ValidationForm>
          </Disclosure> : null}
          <AudienceSnapshot revision={revision} audience={data.audience} channelCounts={data.audienceChannelCounts} />
          <DeliveryPlan steps={data.steps} />
        </div>
      </div>
    </div>
  );
}
