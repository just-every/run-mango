import { createLocalApp } from '../../src/core/app/local-app';
export default { fetch(request: Request, environment: any) {
  // The OS assigns the listener's port. Configure the fixture's public origin
  // from that request without restarting workerd to change its bindings.
  const bindings = { ...environment, MANGO_PUBLIC_BASE_URL: new URL(request.url).origin };
  return createLocalApp(bindings).fetch(request, bindings);
} };
