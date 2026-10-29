import type { Step } from '@/core/app/client/lib/types';
import type { CampaignResults, DispositionCount } from '../result-model';

const reasons: Record<string,string> = {
  'channel-not-subscribed':'unsubscribed, suppressed or without confirmed consent',
  'contact-erased':'contact removed', dormant:'no recent activity',
  'recent-product-purchase':'recent product purchase', 'unresolved-refund':'unresolved refund', 'unresolved-return':'unresolved return',
  'recipient-timezone-unknown-or-stale':'recipient time zone unknown or evidence expired',
  'recipient-country-unknown':'recipient country unknown', 'sender-not-registered':'SMS sender not registered',
  'destination-changed-after-preparation':'destination changed before handoff', 'schedule-replaced':'schedule replaced',
  'source-unavailable':'audience source unavailable',
  'deadline-passed':'send window closed', 'frequency-window':'frequency protection',
  'campaign-cancelled':'campaign cancelled', unsubscribed:'unsubscribed', suppressed:'suppressed',
  'not-subscribed':'not subscribed', 'not-eligible':'no longer eligible', 'inclusion-rule':'no longer matches audience',
  'quiet-hours-deadline':'quiet hours extend beyond send window', 'timezone-unknown':'recipient time zone unknown',
  'timezone-stale':'recipient time zone evidence expired', 'country-unknown':'recipient country unknown',
  'sender-unregistered':'SMS sender not registered', 'destination-changed':'destination changed',
};
export function dispositionLabel(bucket: DispositionCount) {
  if (bucket.disposition === 'skipped') return `Skipped — ${bucket.reason ? reasons[bucket.reason] ?? bucket.reason.replaceAll('-', ' ') : 'reason not recorded'}`;
  return ({queued:'Queued','handed-off':'Handed off',accepted:'Accepted',delivered:'Delivered',bounced:'Bounced',failed:'Failed','handoff-unknown':'Waiting for confirmation'} as Record<string,string>)[bucket.disposition] ?? bucket.disposition;
}
export function overallResult(results:CampaignResults, steps:Step[], formatDate:(value:string)=>string) {
  const sent = results.steps.filter(step => step.state === 'Sent').length;
  const parts = [`${sent} of ${results.steps.length} steps sent.`];
  for (const outcome of results.steps) {
    const step = steps.find(step => step.id === outcome.stepId);
    if (!step) continue;
    if (outcome.state === 'Missed') {
      const unsent = outcome.expiredQueuedCount + outcome.counts.filter(row => row.disposition === 'skipped' && row.reason === 'deadline-passed').reduce((sum,row) => sum+row.count,0);
      parts.push(`Step ${step.sequence} missed its send window (closed ${formatDate(step.sendByAt)}); ${unsent} ${unsent === 1 ? 'message was' : 'messages were'} not sent.`);
    } else {
      const expired = outcome.expiredQueuedCount + outcome.counts.filter(row => row.disposition === 'skipped' && row.reason === 'deadline-passed').reduce((sum,row) => sum + row.count,0);
      if (expired) parts.push(`Step ${step.sequence} left ${expired} ${expired === 1 ? 'message' : 'messages'} unsent when its send window closed (${formatDate(step.sendByAt)}).`);
      if (outcome.state !== 'Sent') parts.push(`Step ${step.sequence} ${outcome.state === 'Scheduled' ? 'is scheduled' : outcome.state === 'Sending' ? 'is sending or awaiting confirmation' : outcome.state === 'Completed' ? 'completed without a provider handoff' : `is ${outcome.state.toLowerCase()}`}.`);
    }
  }
  return parts.join(' ');
}
