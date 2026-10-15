import type {SourceRecordInput} from '@/core/shared/platform';
import type {CommerceWebhookEvent} from '@/core/features/audience/service';
import type {CommerceSourceType} from './service';

/** Both snapshot and webhook ingestion use these same facts. Source consent is
 * retained as evidence only: it does not manufacture Mango channel permission. */
export function commerceProjection(record: SourceRecordInput): CommerceWebhookEvent['records'][number] {
  const p = record.payload;
  const customer = p.customer && typeof p.customer === 'object' ? p.customer as Record<string, unknown> : p;
  const email = typeof customer.email === 'string' ? customer.email : undefined;
  const phone = typeof customer.phone === 'string' ? customer.phone : undefined;
  const kind = record.sourceType as 'order' | 'refund' | 'cart' | 'browsing-event' | 'customer';
  const activityKind = p.observation !== 'privacy_revoked' && ['order','refund','cart','browsing-event','customer'].includes(kind);
  const lines = Array.isArray(p.lines) ? p.lines as Record<string, unknown>[] : [];
  const products = [...new Set(lines.map(l => l.productId ?? (l.line as Record<string, unknown> | undefined)?.productId).filter((id): id is string => typeof id === 'string'))];
  if (typeof p.productId === 'string') products.push(p.productId);
  const state = kind === 'order' ? String(p.financialStatus ?? 'unknown') : kind === 'refund' ? String(p.financialState ?? 'UNKNOWN') : String(p.observation ?? 'observed');
  const activity = activityKind ? {kind, state} : undefined;
  return {sourceType: record.sourceType as CommerceSourceType, providerSourceId: record.sourceId,
    occurredAt: record.occurredAt, providerUpdatedAt: record.updatedAt ?? record.occurredAt, payload: p,
    contact: email || phone ? {email, phone, displayName: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || undefined} : undefined,
    contactId: record.contactId,
    activity, activities: activity ? (products.length ? products.map(productId => ({...activity, productId})) : [activity]) : []};
}
