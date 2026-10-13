// Local-only Worker entry. vite.config.ts loads it only for `vite dev`; the deployed main stays worker.ts and
// preview serves worker.local.ts, and `rer build` refuses any output that contains the dev layer. It adds dev
// sign-in, personas and the dev badge.
import worker from './worker.local';
import { withDevIdentity } from '@/vendor/base/operator-auth/dev/index.mjs';
import { localBindings } from '@/core/platform/local-bindings';
import { devPersonas } from '@/core/features/auth/dev-personas';
import type { AppBindings } from '@/core/shared/platform';

// Mango's local settings name the origin RER_DEV_ORIGIN or AUTH_ORIGIN and the owner OWNER_EMAIL.
const local = (environment: AppBindings): AppBindings => ({ ...localBindings(environment), AUTH_ORIGIN: environment.RER_DEV_ORIGIN || environment.AUTH_ORIGIN, AUTH_LOCAL: 'true' });
const config = (environment: AppBindings) => ({
  origin: environment.AUTH_ORIGIN!, OWNER_EMAIL: environment.OWNER_EMAIL!, SESSION_SECRET: environment.SESSION_SECRET!, SETUP_TOKEN: environment.SETUP_TOKEN,
  local: true, branding: { productName: 'Mango', accentColor: '#ffcf47', signInPath: '/signin' },
});

export default withDevIdentity<AppBindings, typeof worker>(worker, { bindings: local, config, personas: devPersonas });
