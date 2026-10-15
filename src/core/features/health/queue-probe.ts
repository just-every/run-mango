import type { QueueCommand } from '@/core/shared/platform';

export function healthProbeCommand(): QueueCommand {
  return { kind: 'health.probe', idempotencyKey: `health:${crypto.randomUUID()}`, payload: {} };
}

/** Acknowledge before lifecycle maintenance, filtering or dispatch: health has no domain work. */
export function acknowledgeHealthProbe(message: { body: QueueCommand; ack(): void }): boolean {
  if (message.body.kind !== 'health.probe') return false;
  message.ack();
  return true;
}
