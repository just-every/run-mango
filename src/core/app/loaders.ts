import { createServerFn } from '@tanstack/react-start';
import { redirect } from '@tanstack/react-router';
import { senderIdentitySchema } from '@/core/features/settings/sender-validation';

// Every private server function authenticates independently of document routing.
async function operatorState(setup = false) {
  const [{getRequest}, {createAppServices}, {currentPlatform}, {loadSenderSettings}] = await Promise.all([
    import('@tanstack/react-start/server'), import('./app'), import('./request-platform'),
    import('@/core/features/settings/sender-persistence'),
  ]);
  const platform = currentPlatform();
  const operator = await createAppServices(platform).authService.authenticate(getRequest());
  if (!operator) {
    if (setup) throw redirect({href: '/signin?reason=session-required&returnTo=%2Fsetup'});
    throw new Error('unauthenticated');
  }
  const identity = await loadSenderSettings(platform);
  // Optional modules shown in navigation and on the desk only when this installation enables them.
  const modules = {store: Boolean(platform.commerce), ai: Boolean(platform.ai), sms: Boolean(platform.sms)};
  return {displayName: operator.displayName, email: operator.email, identity, modules,
    setupComplete: senderIdentitySchema.safeParse(identity).success};
}
export const loadOperator = createServerFn({method: 'GET'}).handler(async () => {
  const state = await operatorState();
  if (!state.setupComplete) throw redirect({to: '/setup'});
  return {displayName: state.displayName, email: state.email, modules: state.modules};
});
export const loadSetup = createServerFn({method: 'GET'}).handler(async () => {
  const state = await operatorState(true);
  if (state.setupComplete) throw redirect({to: '/app'});
  // The owner's own address is the natural sender and reply-to until they say otherwise.
  return {identity: state.identity, ownerEmail: state.email};
});
