// Base scopes loopback sessions by port, because browsers share cookies across ports.
// @ts-expect-error Portable Base ESM has no separate declaration for this helper.
import { localCookieName } from '../../src/vendor/base/operator-auth/http.mjs';
export const localSessionCookieName = (origin: string) => localCookieName('operator_session_local', origin);
