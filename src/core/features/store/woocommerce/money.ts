import {moneyMinor} from '@/core/features/insights/commerce-money';
import type {WooObject} from './normalize';
export function wooMoney(amount: unknown, currency: unknown) {
  moneyMinor({amount, currency}); return {shop: {amount: amount as string, currency: currency as string}};
}
export function refundTotal(refunds: WooObject[], currency: string) {
  const minor = refunds.reduce((sum, item) => sum + BigInt(moneyMinor({amount: item.amount, currency}).amountMinor), 0n);
  const exponent = new Intl.NumberFormat('en', {style: 'currency', currency}).resolvedOptions().maximumFractionDigits!;
  const scale = 10n ** BigInt(exponent);
  return exponent ? `${minor / scale}.${String(minor % scale).padStart(exponent, '0')}` : String(minor);
}
