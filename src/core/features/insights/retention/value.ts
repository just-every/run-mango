import { customerOrders } from './cohorts';
import { exactAmount, type RetentionOrder } from './types';

export function acquisitionValue(orders: RetentionOrder[], dimension: 'source' | 'form') {
  const groups = new Map<string | null, {customers: number; orders: number; money: Map<string, {gross: bigint; reversed: bigint; net: bigint; customers: Set<string>}>}>();
  for (const [contactId, history] of customerOrders(orders)) {
    const key = history[0][dimension], group = groups.get(key) ?? {customers: 0, orders: 0, money: new Map()};
    group.customers++;
    for (const order of history) {
      group.orders++;
      const total = group.money.get(order.currency) ?? {gross: 0n, reversed: 0n, net: 0n, customers: new Set<string>()};
      total.gross += order.grossMinor; total.reversed += order.reversedMinor; total.net += order.netMinor; total.customers.add(contactId);
      group.money.set(order.currency, total);
    }
    groups.set(key, group);
  }
  return [...groups].sort(([a], [b]) => (a ?? '').localeCompare(b ?? '')).map(([source, group]) => ({source, evidence: source === null ? 'unknown' as const : 'recorded' as const,
    customers: group.customers, orders: group.orders,
    valueByCurrency: [...group.money].sort(([a], [b]) => a.localeCompare(b)).map(([currency, total]) => ({currency,
      customers: total.customers.size, grossAmountMinor: exactAmount(total.gross), reversedAmountMinor: exactAmount(total.reversed),
      amountMinor: exactAmount(total.net),
      // An exact rational avoids silently rounding or overflowing monetary means.
      meanCustomerValue: {amountMinorNumerator: exactAmount(total.net), customersDenominator: total.customers.size}}))}));
}

export function productAffinity(orders: RetentionOrder[]) {
  const together = new Map<string, {productA: string; productB: string; orders: number; contacts: Set<string>}>();
  const next = new Map<string, {fromProduct: string; toProduct: string; transitions: number; contacts: Set<string>}>();
  for (const order of orders) for (let a = 0; a < order.products.length; a++) for (let b = a + 1; b < order.products.length; b++) {
    const productA = order.products[a], productB = order.products[b], key = JSON.stringify([productA, productB]);
    const pair = together.get(key) ?? {productA, productB, orders: 0, contacts: new Set<string>()};
    pair.orders++; pair.contacts.add(order.contactId); together.set(key, pair);
  }
  let ambiguousSimultaneousOrders = 0;
  for (const [contactId, history] of customerOrders(orders)) {
    for (let index = 1; index < history.length; index++) {
      const previous = history[index - 1], current = history[index];
      // A timestamp tie cannot establish which order came next. Neither side of
      // a simultaneous group is used for directional product claims.
      if (current.purchasedAt === previous.purchasedAt) { ambiguousSimultaneousOrders++; continue; }
      if (index > 1 && history[index - 2].purchasedAt === previous.purchasedAt) continue;
      if (history[index + 1]?.purchasedAt === current.purchasedAt) continue;
      for (const fromProduct of previous.products) for (const toProduct of current.products) {
        const key = JSON.stringify([fromProduct, toProduct]), pair = next.get(key) ?? {fromProduct, toProduct, transitions: 0, contacts: new Set<string>()};
        pair.transitions++; pair.contacts.add(contactId); next.set(key, pair);
      }
    }
  }
  return {together: [...together.values()].map(pair => ({productA: pair.productA, productB: pair.productB, orders: pair.orders, customers: pair.contacts.size}))
      .sort((a, b) => b.orders - a.orders || a.productA.localeCompare(b.productA) || a.productB.localeCompare(b.productB)),
    next: [...next.values()].map(pair => ({fromProduct: pair.fromProduct, toProduct: pair.toProduct, transitions: pair.transitions, customers: pair.contacts.size}))
      .sort((a, b) => b.transitions - a.transitions || a.fromProduct.localeCompare(b.fromProduct) || a.toProduct.localeCompare(b.toProduct)),
    ambiguousSimultaneousOrders};
}
