import { useEffect, useRef, useState, type FormEvent } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { Modal } from '@/core/app/client/ui/modal';
import type { AudienceQuery, BulkOptions } from './audience-search';

type BulkAction = 'tag' | 'untag' | 'export' | 'suppress' | 'erase' | 'topic';
type BulkSelection = { contactIds: string[] } | { search: AudienceQuery };
type BulkRequest = BulkSelection & { action: BulkAction; value?: string; channel?: 'email' | 'sms' };
type BulkJob = {
  id: string; action: BulkAction; state: 'queued' | 'running' | 'complete' | 'failed';
  total: number; processed: number; succeeded: number; refused: number; error?: string;
  refusals: { contactId: string; displayName: string; reason: string }[];
};
const actionLabels: Record<BulkAction, string> = {
  tag: 'Add tag', untag: 'Remove tag', export: 'Export selected contacts',
  suppress: 'Suppress contacts', erase: 'Erase contacts', topic: 'Add to topic',
};
const active = (job: BulkJob) => job.state === 'queued' || job.state === 'running';

export function AudienceBulk({ selection, count, options, disabled, onComplete, onClear }: {
  selection: BulkSelection; count: number; options?: BulkOptions; disabled: boolean;
  onComplete: () => void; onClear: () => void;
}) {
  const [action, setAction] = useState<BulkAction>('tag');
  const [value, setValue] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [confirming, setConfirming] = useState<{ request: BulkRequest; count: number }>();
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState<BulkJob>();
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [followRun, setFollowRun] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const completed = useRef(new Set<string>());
  const completeCallback = useRef(onComplete);
  completeCallback.current = onComplete;

  useEffect(() => {
    const readLocation = () => { setJobId(new URL(window.location.href).searchParams.get('bulk') ?? ''); setJob(undefined); setFollowing(false); };
    readLocation();
    window.addEventListener('popstate', readLocation);
    return () => window.removeEventListener('popstate', readLocation);
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    setReceiptError(''); setFollowing(true);
    async function follow(resume: boolean) {
      try {
        const result = await requestJson<{ job: BulkJob; detail?: string }>(`/api/audience/bulk/${encodeURIComponent(jobId)}${resume ? '/resume' : ''}`, {
          ...(resume ? { method: 'POST' } : {}), signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!result.data.job) throw new Error(result.data.detail ?? 'The bulk receipt could not be loaded. Resume to continue.');
        const current = result.data.job;
        setJob(current);
        if (result.status >= 400) throw new Error(current.error ?? result.data.detail ?? 'The bulk action stopped. Review this receipt before continuing.');
        if (active(current)) timer = setTimeout(() => void follow(true), 1000);
        else {
          setFollowing(false);
          if (!completed.current.has(current.id)) { completed.current.add(current.id); completeCallback.current(); }
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setFollowing(false); setReceiptError(cause instanceof Error ? cause.message : 'The bulk job could not be reached. Resume to continue.');
      }
    }
    void follow(false);
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [jobId, followRun]);

  async function start(request: BulkRequest) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await requestJson<{ job: BulkJob; detail?: string }>('/api/audience/bulk', { method: 'POST', body: JSON.stringify(request) });
      if (result.status >= 400 || !result.data.job) throw new Error(result.data.detail ?? 'The bulk action could not be started.');
      const next = result.data.job;
      const location = new URL(window.location.href);
      location.searchParams.set('bulk', next.id);
      window.history.replaceState(window.history.state, '', location);
      setJob(next); setJobId(next.id); setConfirming(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The bulk action could not be started.'); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!count || disabled || busy || following || (job && active(job))) return;
    const topic = options?.topics.find(item => `${item.channel}:${item.id}` === value);
    const request: BulkRequest = { ...selection, action,
      ...(['tag', 'untag', 'topic'].includes(action) ? { value: action === 'topic' ? topic?.id ?? '' : value.trim() } : {}),
      ...(action === 'suppress' ? { channel } : action === 'topic' && topic ? { channel: topic.channel } : {}) };
    setError('');
    if (action === 'erase' || action === 'suppress') setConfirming({ request, count });
    else void start(request);
  }

  async function download() {
    if (!job || job.action !== 'export' || job.state !== 'complete') return;
    setDownloading(true); setReceiptError('');
    try {
      const response = await fetch(`/api/audience/bulk/${encodeURIComponent(job.id)}/export`, { credentials: 'same-origin' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(result.detail ?? 'The selected contacts CSV could not be downloaded.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = `audience-${job.id}.csv`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (cause) { setReceiptError(cause instanceof Error ? cause.message : 'The selected contacts CSV could not be downloaded.'); }
    finally { setDownloading(false); }
  }

  const locked = disabled || busy || following || Boolean(job && active(job));
  return <>
    {count ? <div className="audience-bulk" aria-label="Selected contact actions">
      <div className="audience-bulk__selection"><strong>{count.toLocaleString()} selected</strong><button type="button" className="text-link" onClick={onClear} disabled={busy}>Clear selection</button></div>
      <form className="audience-bulk__form" onSubmit={submit}>
        <label>Bulk action<select value={action} disabled={locked} onChange={event => { setAction(event.target.value as BulkAction); setValue(''); setError(''); }}>
          {(Object.keys(actionLabels) as BulkAction[]).map(item => <option key={item} value={item}>{actionLabels[item]}</option>)}
        </select></label>
        {action === 'tag' || action === 'untag' ? <label>Tag<input value={value} maxLength={100} required disabled={locked} onChange={event => setValue(event.target.value)} /></label> : null}
        {action === 'suppress' ? <label>Channel<select value={channel} disabled={locked} onChange={event => setChannel(event.target.value as 'email' | 'sms')}><option value="email">Email</option><option value="sms">SMS</option></select></label> : null}
        {action === 'topic' ? <label>Topic<select value={value} disabled={locked} required onChange={event => setValue(event.target.value)}><option value="">Choose a topic</option>{options?.topics.map(topic => <option value={`${topic.channel}:${topic.id}`} key={`${topic.channel}:${topic.id}`}>{topic.name} ({topic.channel === 'email' ? 'Email' : 'SMS'})</option>)}</select></label> : null}
        <button type="submit" className="secondary-action" disabled={locked}>{busy ? 'Starting…' : action === 'erase' || action === 'suppress' ? 'Review action' : 'Apply to selection'}</button>
      </form>
      {action === 'topic' ? <p className="muted-copy">Only contacts with consent covering this topic are added. Every refusal appears in the receipt.</p> : null}
      {action === 'topic' && options && !options.topics.length ? <p className="muted-copy">No topics with recorded consent evidence are available.</p> : null}
      {error && !confirming ? <p className="inline-error" role="alert">{error}</p> : null}
    </div> : null}
    {jobId ? <section className="audience-bulk-receipt" aria-labelledby="bulk-receipt-title">
      <div className="section-heading"><div><p className="eyebrow">Bulk receipt</p><h3 id="bulk-receipt-title">{job ? actionLabels[job.action] : 'Contact action'}</h3></div></div>
      <p className="audience-bulk-receipt__reference">Reference: {jobId}</p>
      {job ? <>
        <p role="status">{job.state === 'complete' ? 'Complete' : job.state === 'failed' ? 'Failed' : following ? 'In progress' : 'Waiting to continue'} · {job.processed.toLocaleString()} of {job.total.toLocaleString()} processed</p>
        <progress max={Math.max(job.total, 1)} value={job.processed} aria-label="Bulk action progress" />
        <dl className="audience-bulk-receipt__counts"><div><dt>Succeeded</dt><dd>{job.succeeded.toLocaleString()}</dd></div><div><dt>Refused</dt><dd>{job.refused.toLocaleString()}</dd></div><div><dt>Total</dt><dd>{job.total.toLocaleString()}</dd></div></dl>
        {job.error ? <p className="inline-error" role="alert">{job.error}</p> : null}
        {job.refusals.length ? <div><h4>Refused contacts ({job.refusals.length.toLocaleString()})</h4><ul className="audience-bulk-receipt__refusals">{job.refusals.map((refusal, index) => <li key={`${refusal.contactId}-${index}`}><strong>{refusal.displayName || refusal.contactId}</strong><span>{refusal.reason}</span></li>)}</ul></div> : null}
        {job.action === 'export' && job.state === 'complete' ? <button type="button" className="secondary-action" disabled={downloading} onClick={() => void download()}>{downloading ? 'Downloading…' : 'Download selected contacts CSV'}</button> : null}
      </> : following ? <p role="status">Loading saved receipt…</p> : null}
      {receiptError ? <p className="inline-error" role="alert">{receiptError}</p> : null}
      {!following && (!job || active(job)) ? <button type="button" className="secondary-action" onClick={() => setFollowRun(run => run + 1)}>Resume bulk action</button> : null}
    </section> : null}
    <Modal open={Boolean(confirming)} title={confirming?.request.action === 'erase' ? 'Erase selected contacts?' : 'Suppress selected contacts?'}
      description={confirming?.request.action === 'erase'
        ? `Permanently erase ${confirming.count.toLocaleString()} selected contacts, including their contact-owned data and retained copies. This cannot be undone. Protected opt-out hashes survive to prevent renewed contact.`
        : `Suppress ${confirming?.count.toLocaleString() ?? '0'} selected contacts for ${confirming?.request.channel === 'sms' ? 'SMS' : 'email'}. They will be excluded from future sends on this channel.`}
      onClose={() => { if (!busy) { setConfirming(undefined); setError(''); } }}>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      <div className="edit-actions"><button type="button" className="secondary-action" disabled={busy} onClick={() => { setConfirming(undefined); setError(''); }}>Cancel</button><button type="button" className="danger-action" disabled={busy} onClick={() => { if (confirming) void start(confirming.request); }}>{busy ? 'Starting…' : confirming?.request.action === 'erase' ? `Permanently erase ${confirming.count.toLocaleString()} contacts` : `Suppress ${confirming?.count.toLocaleString() ?? '0'} contacts`}</button></div>
    </Modal>
  </>;
}
