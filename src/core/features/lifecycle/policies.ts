import type { Channel } from './types';

const hourMs = 60 * 60_000;

export function marketingFrequencyWindowMs(channel: Channel) {
  return channel === 'email' ? 24 * hourMs : 72 * hourMs;
}
