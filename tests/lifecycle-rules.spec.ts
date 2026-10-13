import { expect, test } from '@playwright/test';

import { parseStructuredRules } from '../src/core/features/lifecycle/rules';
import { resolveLocalInstant } from '../src/core/features/lifecycle/schedule';
import { contract } from './contract.js';

contract('CAMP-006', 'rejects nonexistent and unresolved ambiguous DST wall times', () => {
  expect(resolveLocalInstant('2027-03-14T02:30', 'America/New_York')).toMatchObject({ status: 'nonexistent' });
  const ambiguous = resolveLocalInstant('2027-11-07T01:30', 'America/New_York');
  expect(ambiguous).toMatchObject({ status: 'ambiguous' });
  if (ambiguous.status !== 'ambiguous') throw new Error('Expected an ambiguous DST instant.');
  expect(ambiguous.choices).toHaveLength(2);
  expect(new Set(ambiguous.choices).size).toBe(2);
  expect(resolveLocalInstant('2027-07-10T09:00', 'Australia/Brisbane')).toMatchObject({
    status: 'resolved',
    instant: '2027-07-09T23:00:00.000Z',
  });
});

test('structured audience rules reject prose and derive every required source type', () => {
  expect(parseStructuredRules('Saved a product', '[]')).toMatchObject({ ok: false });
  const parsed = parseStructuredRules(JSON.stringify({
    version: 1,
    operator: 'all',
    predicates: [
      { sourceType: 'browsing', field: 'saved', comparator: 'eq', value: true },
      { sourceType: 'cart', field: 'status', comparator: 'eq', value: 'abandoned' },
    ],
  }), JSON.stringify([{
    version: 1,
    reason: 'already-purchased',
    predicate: { sourceType: 'order', field: 'productId', comparator: 'eq', value: 'product-1' },
  }]));
  expect(parsed).toMatchObject({ ok: true });
  if (!parsed.ok) throw new Error(parsed.detail);
  expect(parsed.sourceTypes).toEqual(['browsing', 'cart', 'order']);
});
