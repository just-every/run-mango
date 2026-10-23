import {useEffect, useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import {Can} from '@/core/features/auth/ui/permissions';

export type PaidTier = {paidTopic: string; freeTopic: string; priceId: string; automaticTax: true};
export type PaidReaders = {paidTopic: number; consentMissing: number; paymentFailed: number; statusUnconfirmed: number; canceled: number};

/** The paid tier runs on the owner's own Stripe account; payment never grants consent. */
export function SettingsPaidTier({tier, readers, onSaved}: {tier: PaidTier | null; readers: PaidReaders; onSaved: () => Promise<unknown>}) {
  const [draft, setDraft] = useState({paidTopic: tier?.paidTopic ?? '', freeTopic: tier?.freeTopic ?? '', priceId: tier?.priceId ?? ''});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState('');
  useEffect(() => {if (tier) setDraft({paidTopic: tier.paidTopic, freeTopic: tier.freeTopic, priceId: tier.priceId});}, [tier]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSaved('');
    try {
      const response = await requestJson('/api/settings/stripe/paid-tier', {method: 'PUT', body: JSON.stringify({...draft, automaticTax: true})});
      if (response.status !== 200) {setError('Paid tier refused. Use an active recurring Stripe price on the connected account.'); return;}
      setSaved('Paid tier saved.'); await onSaved();
    } catch {setError('Could not save the paid tier. Try again.');} finally {setBusy(false);}
  }
  return <div className="paid-tier" aria-labelledby="paid-tier-title">
    <h3 id="paid-tier-title">Paid tier</h3>
    {tier ? <p>Paid topic <strong>{tier.paidTopic}</strong> · free topic <strong>{tier.freeTopic}</strong> · price <code>{tier.priceId}</code> · US sales tax by Stripe Tax.</p> : <p>No paid tier.</p>}
    <ul className="paid-tier__readers" aria-label="Paid readers">
      <li>{readers.paidTopic} on the paid topic</li>
      <li>{readers.consentMissing} paid, consent missing (not mailed)</li>
      <li>{readers.paymentFailed} back on the free topic after an observed failed payment</li>
      <li>{readers.statusUnconfirmed} back on the free topic because paid status could not be confirmed</li>
      <li>{readers.canceled} back on the free topic after cancellation</li>
    </ul>
    <Can permission="provider.connect"><form onSubmit={event => void save(event)} className="integration-create">
      <label htmlFor="paid-topic">Paid topic<input id="paid-topic" required maxLength={80} value={draft.paidTopic} onChange={event => setDraft({...draft, paidTopic: event.target.value})} /></label>
      <label htmlFor="free-topic">Free topic<input id="free-topic" required maxLength={80} value={draft.freeTopic} onChange={event => setDraft({...draft, freeTopic: event.target.value})} /></label>
      <label htmlFor="paid-price">Stripe price ID<input id="paid-price" required maxLength={255} value={draft.priceId} onChange={event => setDraft({...draft, priceId: event.target.value})} /></label>
      <label htmlFor="paid-tax"><input id="paid-tax" type="checkbox" checked readOnly aria-describedby="paid-tax-note" /> Collect US sales tax with Stripe Tax</label>
      <p id="paid-tax-note">Checkout always enables Stripe Tax. Payment never subscribes anyone: readers join the paid topic only with their own confirmed email consent.</p>
      <button type="submit" className="primary-action" disabled={busy}>{busy ? 'Saving…' : 'Save paid tier'}</button>
    </form></Can>
    {saved ? <p role="status">{saved}</p> : null}
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
  </div>;
}
