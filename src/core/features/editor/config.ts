import {parseConfig} from '@/vendor/base/editor/config';
import type {AppBindings} from '@/core/shared/platform';

export function configuredEditor(environment: AppBindings) {
  if (!environment.RER_MANAGEMENT_ORIGIN && !environment.RER_INSTALLATION_ID) return undefined;
  return parseConfig({enabled: true, managementOrigin: environment.RER_MANAGEMENT_ORIGIN, installationId: environment.RER_INSTALLATION_ID});
}
