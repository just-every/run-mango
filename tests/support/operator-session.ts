import { createAuthService } from '../../src/core/features/auth/service';
import { createAuthRepository } from '../../src/core/features/auth/repository';
import type { Platform } from '../../src/core/shared/platform';

/** Test-only bootstrap through Base's real transaction; no synthesized credentials. */
export async function bootstrapSession(platform: Platform) {
  const origin = platform.config.publicBaseUrl.origin;
  const token = 'test-bootstrap-credential-at-least-thirty-two-bytes';
  platform.config.authSetupToken = token;
  const auth = createAuthService(createAuthRepository(platform.database), platform);
  const response = await auth.handle(new Request(`${origin}/auth/bootstrap`, { method: 'POST',
    headers: { Origin: origin, Host: new URL(origin).host, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.20' },
    body: JSON.stringify({ token, displayName: 'Owner' }) }));
  if (response?.status !== 303) throw new Error(`Fixture bootstrap failed: ${response?.status}`);
  const cookie = response.headers.get('Set-Cookie')!.split(';')[0];
  const operator = await auth.authenticate(new Request(`${origin}/api/operator`, { headers: { Cookie: cookie, Host: new URL(origin).host } }));
  if (!operator) throw new Error('Fixture bootstrap did not authenticate');
  return { operator, token: cookie.split('=')[1], cookie };
}
