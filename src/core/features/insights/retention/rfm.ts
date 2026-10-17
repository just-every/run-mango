import { dayMs, exactAmount, type CustomerRfm, type LifecycleStage, type RetentionOrder } from './types';

export const rfmMethod = {
  population: 'Every surviving contact with at least one recorded, non-cancelled paid order retaining positive net revenue; all recorded history, not only attributed orders.',
  quintiles: 'Midrank percentile across this deployment’s customers, split into five equal percentile bands. Ties share a score; one customer or an all-equal population scores 3. Recency is reversed so a recent purchase scores higher. Sparse populations may leave bands empty.',
  currency: 'Recency and frequency use all qualifying orders. Monetary quintiles are separate within each currency among customers who purchased in that currency. No currency conversion or combined monetary total.',
  recomputation: 'Derived afresh on every read. Recency counts UTC calendar-day boundaries, so stages and recency update daily without a persistent cache or timer. New orders and financial corrections appear on the next read.',
  stages: 'In order: lapsed at 180 days since purchase; at-risk at 90 days; new with one order and first purchase less than 30 days ago; champion with recency and frequency scores both at least 4; otherwise active. Monetary scores are reported separately and do not combine currencies to assign a stage.',
  thresholds: {newDays: 30, atRiskDays: 90, lapsedDays: 180, championRecencyScore: 4, championFrequencyScore: 4},
  noOrders: 'A contact with no qualifying orders has no RFM scores or lifecycle stage and is excluded from the customer population; never assigned fabricated zero scores.',
} as const;

type Numeric = number | bigint;
/** O(n log n), with equal values deliberately never split by contact ID. */
function quintiles(values: Array<[string, Numeric]>, reversed = false): Map<string, number> {
  const sorted = [...values].sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
  const scores = new Map<string, number>();
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end][1] === sorted[start][1]) end++;
    const percentile = sorted.length === 1 ? 0.5 : (start + (end - start - 1) / 2) / (sorted.length - 1);
    const score = Math.min(5, Math.floor(percentile * 5) + 1);
    for (let i = start; i < end; i++) scores.set(sorted[i][0], reversed ? 6 - score : score);
    start = end;
  }
  return scores;
}

export function calculateRfm(orders: RetentionOrder[], now: Date): CustomerRfm[] {
  const people = new Map<string, {name:string;first: number; last: number; orders: number; money: Map<string, bigint>}>();
  for (const order of orders) {
    const person = people.get(order.contactId) ?? {name:order.contactName,first: order.purchasedAt, last: order.purchasedAt, orders: 0, money: new Map<string, bigint>()};
    person.first = Math.min(person.first, order.purchasedAt); person.last = Math.max(person.last, order.purchasedAt); person.orders++;
    person.money.set(order.currency, (person.money.get(order.currency) ?? 0n) + order.netMinor);
    people.set(order.contactId, person);
  }
  const today = Math.floor(now.getTime() / dayMs);
  const recency = new Map([...people].map(([id, person]) => [id, today - Math.floor(person.last / dayMs)]));
  const r = quintiles([...recency], true), f = quintiles([...people].map(([id, person]) => [id, person.orders]));
  const monetary = new Map<string, Array<[string, bigint]>>();
  for (const [id, person] of people) for (const [currency, amount] of person.money) {
    const group = monetary.get(currency) ?? []; group.push([id, amount]); monetary.set(currency, group);
  }
  const moneyScores = new Map([...monetary].map(([currency, values]) => [currency, quintiles(values)]));
  return [...people].sort(([a], [b]) => a.localeCompare(b)).map(([contactId, person]) => {
    const days = recency.get(contactId)!, recencyScore = r.get(contactId)!, frequencyScore = f.get(contactId)!;
    let stage: LifecycleStage = 'active';
    if (days >= rfmMethod.thresholds.lapsedDays) stage = 'lapsed';
    else if (days >= rfmMethod.thresholds.atRiskDays) stage = 'at-risk';
    else if (person.orders === 1 && today - Math.floor(person.first / dayMs) < rfmMethod.thresholds.newDays) stage = 'new';
    else if (recencyScore >= 4 && frequencyScore >= 4) stage = 'champion';
    return {contactId, displayName:person.name, firstOrderAt: new Date(person.first).toISOString(), lastOrderAt: new Date(person.last).toISOString(),
      orders: person.orders, recencyDays: days, recencyScore, frequencyScore, stage,
      monetaryByCurrency: [...person.money].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({currency, amountMinor: exactAmount(amount), score: moneyScores.get(currency)!.get(contactId)!}))};
  });
}
