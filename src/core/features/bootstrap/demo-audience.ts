import type { Platform, SourceRecordInput } from '@/core/shared/platform';
import type { createAppServices } from '@/core/app/app';
import type { SampleData } from './sample-data';

export function demoCustomerRecords(sample: SampleData, now: Date): SourceRecordInput[] {
  return sample.contacts.map(contact => ({ contactId: contact.id, sourceType: 'customer', sourceId: `demo-customer-${contact.id}`,
    occurredAt: now, payload: { email: contact.email, displayName: contact.displayName, note: contact.history[0].detail } }));
}

/** Complete the sample import with native destination identities, consent and store evidence. */
export async function seedDemoAudience(platform: Platform, audience: ReturnType<typeof createAppServices>['audienceService'], sample: SampleData, now: Date) {
  for (const contact of sample.contacts) {
    await audience.ensureContact({ email: contact.email, displayName: contact.displayName }, now);
    if (contact.emailStatus !== 'subscribed') continue;
    await audience.captureConsent({ contact: { email: contact.email, displayName: contact.displayName }, channel: 'email',
      brandOrLegalSender: platform.config.mailSender.displayName, messageCategory: 'newsletter', frequencyDisclosure: 'Monthly', destinationJurisdiction: 'AU',
      captureMethod: 'sample-import', captureSource: 'Mango demo sample data', consentText: 'Send me the monthly store newsletter.', consentVersion: 'sample-v1',
      confirmationRequired: false, occurredAt: now, idempotencyKey: `demo-consent-${contact.id}` }, now);
  }
  await audience.ingestCommerceWebhook({ provider: 'shopify', completion: 'full', adapterCompleted: true, sourceTypes: ['customer'],
    records: demoCustomerRecords(sample, now).map(record => ({ ...record, sourceType: 'customer' as const, providerSourceId: record.sourceId })) }, now);
}
