import type { InclusionRule } from '../lifecycle/rules';

type Predicate = InclusionRule['predicates'][number];

/** The editor and every summary use the same labels, including imported fields. */
export const audienceRuleFields = [
  ['contact', 'id', 'Contact ID'],
  ['contact', 'emailStatus', 'Email subscription status'],
  ['contact', 'smsStatus', 'SMS subscription status'],
  ['contact', 'displayName', 'Contact name'],
  ['contact', 'email', 'Email address'],
  ['contact', 'property', 'Contact property'],
  ['contact', 'tags', 'Tags'],
  ['contact', 'consent', 'Confirmed channel consent'],
  ['contact', 'topic', 'Confirmed topic consent'],
  ['contact', 'usState', 'US state'],
  ['contact', 'zip', 'US ZIP code'],
  ['contact', 'distanceMiles', 'Distance in miles from ZIP (Census area points)'],
  ['contact', 'clicked', 'Human click'],
  ['contact', 'paidMember', 'Paid topic member'],
  ['contact', 'rfmStage', 'RFM lifecycle stage'],
  ['contact', 'rfmRecencyDays', 'RFM days since last order'],
  ['contact', 'rfmRecencyScore', 'RFM recency score'],
  ['contact', 'rfmFrequency', 'RFM order frequency'],
  ['contact', 'rfmFrequencyScore', 'RFM frequency score'],
  ['contact', 'rfmMonetaryScore', 'RFM monetary score'],
  ['contact', 'rfmMonetaryMinor', 'RFM monetary value (minor currency units)'],
  ['order', 'count', 'Placed Order count'],
  ['order', 'boughtProductId', 'Bought product ID'],
  ['order', 'boughtCollectionId', 'Bought collection ID'],
  ['order', 'boughtCategory', 'Bought category'],
  ['order', 'productId', 'Purchased product ID'],
  ['order', 'total', 'Order total'],
  ['cart', 'productId', 'Cart product ID'],
  ['browsing', 'productId', 'Viewed product ID'],
] as const;

export function audienceRuleFieldLabel(predicate: Pick<Predicate, 'sourceType' | 'field'>): string {
  return audienceRuleFields.find(([source, field]) => source === predicate.sourceType && field === predicate.field)?.[2]
    ?? `${predicate.sourceType}: ${predicate.field}`;
}

export const audienceRuleComparisons = [
  ['eq', 'is'], ['neq', 'is not'], ['contains', 'contains'],
  ['gt', 'is greater than'], ['gte', 'is at least'], ['lt', 'is less than'],
  ['lte', 'is at most'], ['in', 'is one of'],
] as const satisfies ReadonlyArray<readonly [Predicate['comparator'], string]>;
