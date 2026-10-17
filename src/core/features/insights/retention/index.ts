import { readOrders } from './data';
import { calculateRfm, rfmMethod } from './rfm';
import { cohortMethod, cohortReport } from './cohorts';
import { acquisitionValue, productAffinity } from './value';
import type { CustomerRfm, LifecycleStage, RetentionDatabase } from './types';

export type { CustomerRfm, LifecycleStage, RetentionDatabase } from './types';

function validNow(now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error('Retention reporting requires a valid observation time.');
}

export async function readRetention(database: RetentionDatabase, now = new Date()) {
  validNow(now);
  const orders = await readOrders(database, now), rfm = calculateRfm(orders, now);
  const stages: Record<LifecycleStage, number> = {new: 0, active: 0, 'at-risk': 0, lapsed: 0, champion: 0};
  for (const person of rfm) stages[person.stage]++;
  return {asOf: now.toISOString(), scoringDay: now.toISOString().slice(0, 10),
    status: orders.length ? 'observed-orders' as const : 'no-qualifying-orders' as const,
    method: {...rfmMethod, ...cohortMethod,
      financial: 'Paid and partially paid non-test orders retaining positive net cash; cancelled, voided, unpaid and fully refunded orders are excluded. Monetary value is cash received capped at order total, less the greater of reported refunds and successful refund transactions, capped at gross. Partial refunds reduce value. All figures use the latest recorded financial state, including later corrections; an earlier asOf filters purchase times but is not a historical financial snapshot.',
      products: 'Affinity uses original purchased line quantity minus successfully refunded line quantity, retaining each product once per order. A deleted catalogue product with no recorded product ID contributes no affinity identity.',
      coverage: 'Only persisted, contact-linked commerce orders are included; erased or unlinked customers and unsupported or unimported historical orders are not inferred. Figures describe recorded store history, not full lifetime value or measured marketing lift.'},
    ...cohortReport(orders, now), stages, rfm,
    valueByAcquisitionSource: acquisitionValue(orders, 'source'), valueByForm: acquisitionValue(orders, 'form'),
    productAffinity: productAffinity(orders)};
}

/** Population-wide scores: callers must not calculate quintiles from a selected
 * segment or a single contact. This helper can be shared across one review. */
export async function readContactRfm(database: RetentionDatabase, now = new Date()): Promise<Map<string, CustomerRfm>> {
  validNow(now);
  return new Map(calculateRfm(await readOrders(database, now), now).map(person => [person.contactId, person]));
}

export async function contactRfm(database: RetentionDatabase, contactId: string, now = new Date()): Promise<CustomerRfm | null> {
  return (await readContactRfm(database, now)).get(contactId) ?? null;
}

/** Named values for a real rule resolver; absence stays unavailable rather than
 * becoming zero or an invented lifecycle stage. Money requires one currency. */
export function rfmRuleValue(person: CustomerRfm | null | undefined, field: string, currency = 'USD'): string | number | null {
  if (!person) return null;
  if (field === 'rfmStage') return person.stage;
  if (field === 'rfmRecencyDays') return person.recencyDays;
  if (field === 'rfmRecencyScore') return person.recencyScore;
  if (field === 'rfmFrequency') return person.orders;
  if (field === 'rfmFrequencyScore') return person.frequencyScore;
  const money = person.monetaryByCurrency.find(value => value.currency === currency);
  if (field === 'rfmMonetaryScore') return money?.score ?? null;
  if (field === 'rfmMonetaryMinor') return money?.amountMinor ?? null;
  throw new Error(`Unknown RFM rule field: ${field}`);
}

export type RetentionReport = Awaited<ReturnType<typeof readRetention>>;
