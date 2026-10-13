import type { JobDispatcher, QueueCommand } from '@/core/shared/platform';

function delayInRange(delaySeconds: number): number {
  if (!Number.isInteger(delaySeconds) || delaySeconds < 0 || delaySeconds > 43_200) {
    throw new Error('Queue retry delay must be an integer between 0 and 43200 seconds.');
  }
  return delaySeconds;
}

export function createJobDispatcher(queue: Queue<QueueCommand>): JobDispatcher {
  return {
    async enqueue(command) {
      await queue.send(command);
    },
    async retry(command, delaySeconds) {
      await queue.send(command, { delaySeconds: delayInRange(delaySeconds) });
    },
  };
}
