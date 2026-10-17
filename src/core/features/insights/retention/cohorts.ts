import { dayMs, median, type RetentionOrder } from './types';

export const cohortMethod = {
  retention: 'First-order UTC calendar-month cohorts. Each cell counts distinct original cohort customers with a qualifying order in that month, divided by all cohort customers. Month zero includes their first order; later months measure observed return purchasing, not continuous survival.',
  intervals: 'Median over every consecutive pair of a customer’s qualifying orders, in elapsed 24-hour days. Simultaneous orders contribute zero; customers with one order contribute no interval.',
  repeatPurchaseRate: 'Customers with two or more qualifying orders divided by all customers with a qualifying order, across all recorded history. Empty denominators produce null, not a zero performance claim.',
  acquisition: 'Earliest recorded consent capture before the first qualifying purchase, otherwise earliest recorded customer source before that purchase. Missing evidence stays unknown. This describes recorded acquisition, not causal marketing attribution. Form is recorded only when that capture method explicitly identifies a form, popup, landing page or kiosk.',
  productAffinity: 'Distinct retained products per qualifying order. Together counts each unordered pair once per order. Next counts each directed product pair once across immediately consecutive orders with strictly increasing purchase times; simultaneous orders cannot establish sequence. Fully refunded or cancelled purchases are excluded. Product IDs are recorded source identities, not inferred recommendations.',
} as const;

function month(instant: number): number {
  const date = new Date(instant); return date.getUTCFullYear() * 12 + date.getUTCMonth();
}
function monthName(value: number): string { return `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, '0')}`; }

export function customerOrders(orders: RetentionOrder[]): Map<string, RetentionOrder[]> {
  const customers = new Map<string, RetentionOrder[]>();
  for (const order of orders) {
    const history = customers.get(order.contactId) ?? []; history.push(order); customers.set(order.contactId, history);
  }
  for (const history of customers.values()) history.sort((a, b) => a.purchasedAt - b.purchasedAt || a.id.localeCompare(b.id));
  return customers;
}

export function cohortReport(orders: RetentionOrder[], now: Date) {
  const customers = customerOrders(orders), cohorts = new Map<number, {customers: number; months: Map<number, Set<string>>}>();
  const intervals: number[] = []; let repeatCustomers = 0;
  for (const [id, history] of customers) {
    if (history.length > 1) repeatCustomers++;
    const firstMonth = month(history[0].purchasedAt), cohort = cohorts.get(firstMonth) ?? {customers: 0, months: new Map<number, Set<string>>()};
    cohort.customers++;
    history.forEach((order, index) => {
      const offset = month(order.purchasedAt) - firstMonth, active = cohort.months.get(offset) ?? new Set<string>();
      active.add(id); cohort.months.set(offset, active);
      if (index) intervals.push((order.purchasedAt - history[index - 1].purchasedAt) / dayMs);
    });
    cohorts.set(firstMonth, cohort);
  }
  return {customers: customers.size, repeatCustomers, repeatPurchaseRate: customers.size ? repeatCustomers / customers.size : null,
    medianDaysBetweenOrders: median(intervals), interorderIntervals: intervals.length,
    cohorts: [...cohorts].sort(([a], [b]) => a - b).map(([firstMonth, cohort]) => ({month: monthName(firstMonth), customers: cohort.customers,
      months: Array.from({length: month(now.getTime()) - firstMonth + 1}, (_, offset) => ({offset, month: monthName(firstMonth + offset),
        customers: cohort.months.get(offset)?.size ?? 0, retentionRate: (cohort.months.get(offset)?.size ?? 0) / cohort.customers,
        partial: firstMonth + offset === month(now.getTime())}))}))};
}
