/** Import the Worker-only helper only when a demo provider is actually used. */
export async function demoResult<T>(real: () => Promise<T>, success: () => T | Promise<T>): Promise<T> {
  const { demoEffect } = await import('@/vendor/base/demo/index.mjs');
  return demoEffect(real, success);
}
