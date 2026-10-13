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
