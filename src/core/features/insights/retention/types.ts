export type LifecycleStage = 'new' | 'active' | 'at-risk' | 'lapsed' | 'champion';
export type ExactAmount = number | string;
export type RetentionOrder = {
  id: string; contactId: string; contactName: string; purchasedAt: number; currency: string;
  grossMinor: bigint; reversedMinor: bigint; netMinor: bigint; products: string[];
  source: string | null; form: string | null;
};
export type CustomerRfm = {
  contactId: string; displayName: string; firstOrderAt: string; lastOrderAt: string; orders: number;
  recencyDays: number; recencyScore: number; frequencyScore: number; stage: LifecycleStage;
  monetaryByCurrency: Array<{ currency: string; amountMinor: ExactAmount; score: number }>;
};
export type RetentionDatabase = D1Database | { $client: D1Database };
export const dayMs = 86_400_000;
export function exactAmount(value: bigint): ExactAmount {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : value.toString();
}
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
