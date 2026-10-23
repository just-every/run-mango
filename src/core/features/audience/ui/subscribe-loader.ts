import { createServerFn } from '@tanstack/react-start';
export const loadSubscribeInfo = createServerFn({ method: 'GET' }).handler(async () => {
  const [{currentPlatform}, {loadSignupDescription}, {loadSenderSettings}] = await Promise.all([
    import('@/core/app/request-platform'), import('@/core/features/audience/signup-routes'),
    import('@/core/features/settings/sender-persistence'),
  ]);
  const platform = currentPlatform();
  await loadSenderSettings(platform);
  return loadSignupDescription(platform);
});

export const loadPaidSubscribeInfo = createServerFn({method:'GET'}).handler(async () => {
  const {requestApi} = await import('@/core/app/request-platform');
  const api=requestApi.getStore();
  if (!api) throw new Error('Missing public request context.');
  const response=await api('/paid/info');
  if (!response.ok) {
    const {notFound}=await import('@tanstack/react-router');
    throw notFound();
  }
  return response.json() as Promise<import('@/core/features/store/stripe/paid-signup').PaidSignupInfo>;
});
