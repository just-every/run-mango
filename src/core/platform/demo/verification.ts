import type { Database } from '../db/client';
import type { AppConfig } from '@/core/shared/platform';
import type { SenderVerification } from '@/core/features/sender-verification/service';
import { suppressedSenderInspection } from '../suppressed-inspection';
import { demoResult } from './effect';

/** Mock the provider's verification, retaining Mango's ordinary durable approval leases. */
export function demoVerification(real: SenderVerification, database: Database, config: AppConfig): SenderVerification {
  return { ...real, inspect: sender => demoResult(() => real.inspect(sender), () => suppressedSenderInspection(database, config, sender, 'demo')) };
}
