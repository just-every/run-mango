import { AsyncLocalStorage } from 'node:async_hooks';

const timings = new AsyncLocalStorage<Array<{ name: string; duration: number }>>();

export async function measureSenderWork<T>(name: string, work: () => Promise<T>): Promise<T> {
  const samples = timings.getStore();
  if (!samples) return work();
  const start = performance.now();
  try { return await work(); }
  finally { samples.push({ name, duration: performance.now() - start }); }
}

export async function collectSenderTimings<T>(work: () => Promise<T>, totalName = 'sender_total') {
  const samples: Array<{ name: string; duration: number }> = [];
  const value = await timings.run(samples, () => measureSenderWork(totalName, work));
  return { value, header: samples.map(({ name, duration }) => `${name};dur=${duration.toFixed(1)}`).join(', ') };
}
