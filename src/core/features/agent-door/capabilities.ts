import type {Capability} from '@/vendor/base/agent-door/index.ts';

/** The seed offers every implemented optional family alongside the required
 * authorization duties. Keep the public declaration and runtime identical. */
export const mangoCapabilities: readonly Capability[] = [
 'tools','policy','pause','audit','idempotency','events','resources','prompts','subscriptions',
];
