import { createServerFn } from '@tanstack/react-start';
import { redirect } from '@tanstack/react-router';
import { senderIdentitySchema } from '@/core/features/settings/sender-validation';

// Reuse admission only during the same authenticated document request. Every
// standalone private server-function request authenticates through native auth.
async function operatorState(setup = false) {
  const [{getRequest}, {createAppServices}, {currentPlatform, documentAdmission}, {loadSenderSettings}] = await Promise.all([
    import('@tanstack/react-start/server'), import('./app'), import('./request-platform'),
    import('@/core/features/settings/sender-persistence'),
  ]);
  const platform = currentPlatform();
  const admitted = documentAdmission.getStore();
  const operator = admitted?.operator ?? await createAppServices(platform).authService.authenticate(getRequest());
  if (!operator) {
    if (setup) throw redirect({href: '/signin?reason=session-required&returnTo=%2Fsetup'});
    throw new Error('unauthenticated');
  }
  const identity = admitted ? platform.config.mailSender : await loadSenderSettings(platform);
  // Optional modules shown in navigation and on the desk only when this installation enables them.
  const modules = {store: Boolean(platform.commerce), ai: Boolean(platform.ai), sms: Boolean(platform.sms)};
  const business=await platform.database.$client.prepare("SELECT json_extract(document,'$.values.display_name') AS name FROM bs_settings WHERE singleton=1 AND stopped=0").first<{name:string|null}>();
  return {businessName:business?.name??null,operator, displayName: operator.displayName, email: operator.email, identity, modules,
    setupComplete: senderIdentitySchema.safeParse(identity).success};
}
export const loadOperator = createServerFn({method: 'GET'}).validator((value: unknown) => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || !('pathname' in value) || !('search' in value)
    || typeof value.pathname !== 'string' || value.pathname.length > 2048
    || typeof value.search !== 'string' || value.search.length > 4096) throw new Error('Invalid page location.');
  return {pathname: value.pathname, search: value.search};
}).handler(async ({data}) => {
  const state = await operatorState();
  if (!state.setupComplete) throw redirect({to: '/setup'});
  if(state.operator.role==='support'&&data?.pathname==='/app')throw redirect({href:'/app/audience'});
  if(state.operator.role==='analyst'&&data?.pathname==='/app')throw redirect({href:'/app/insights'});
  const {readPageResources} = await import('./page-resources');
  // Stream the head and its route assets while the fresh page reads finish.
  // The page's Suspense boundary resolves only with the complete snapshot.
  const resources = data ? readPageResources(data, state.operator) : Promise.resolve({});
  return {businessName:state.businessName,displayName: state.displayName, email: state.email, role: state.operator.role, unmaskedContacts: state.operator.unmaskedContacts, modules: state.modules,
    locationKey: data ? data.pathname + data.search : '', resources};
});
export const loadSetup = createServerFn({method: 'GET'}).handler(async () => {
  const state = await operatorState(true);
  if (state.setupComplete) throw redirect({to: '/app'});
  // The owner's own address is the natural sender and reply-to until they say otherwise.
  return {identity: state.identity, ownerEmail: state.email};
});
