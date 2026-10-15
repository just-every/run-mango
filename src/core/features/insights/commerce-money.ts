/** Decimal strings are authoritative. Never round a provider amount or invent a currency. */
export function moneyMinor(value: unknown): {amountMinor: number; currency: string} {
  const money = value as {amount?: unknown; currency?: unknown};
  if (!money || typeof money.amount !== 'string' || typeof money.currency !== 'string' || !/^[A-Z]{3}$/.test(money.currency)) throw new Error('Commerce money requires a decimal amount and currency.');
  const currency = money.currency;
  // Intl supplies the runtime ISO 4217 exponent (including zero/three/four digit currencies).
  if (!Intl.supportedValuesOf('currency').includes(currency)) throw new Error('Unsupported commerce currency.');
  const exponent = new Intl.NumberFormat('en', {style:'currency',currency}).resolvedOptions().maximumFractionDigits!;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(money.amount);
  if (!match) throw new Error('Commerce amount must be non-negative decimal money.');
  const fraction = match[2] ?? '';
  if (fraction.slice(exponent).replace(/0/g, '')) throw new Error('Commerce amount exceeds the currency precision.');
  const minor = BigInt(match[1]) * 10n ** BigInt(exponent) + BigInt(fraction.slice(0,exponent).padEnd(exponent,'0') || '0');
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Commerce amount exceeds safe integer precision.');
  return {amountMinor:Number(minor),currency};
}
export function shopMoney(value: unknown) { return moneyMinor((value as {shop?:unknown})?.shop); }
