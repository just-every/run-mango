import { localSessionCookieName } from '../support/local-session';
import { testIdentity } from '../support/test-identity';
import { createLocalApp, type LocalAppBindings } from '../support/fixture-app';
import { createAppServices } from '../../src/core/app/app';
import { dispatchDocuments } from '../../src/core/app/document-dispatch';
import { syntheticReviewPlatform } from './platform';
import { prepareSyntheticReview, prepareSuppressionReview } from './scenario';

export default {
  async fetch(request: Request, bindings: LocalAppBindings & {MANGO_REVIEW_BASE_URL?: string}, context: ExecutionContext) {
    if (!bindings.MANGO_REVIEW_BASE_URL) throw new Error('MANGO_REVIEW_BASE_URL is missing; start the review with pnpm review:synthetic.');
    const platform = syntheticReviewPlatform(bindings, bindings.MANGO_REVIEW_BASE_URL);
    const sourceJobs: Record<string, unknown>[] = [];
    platform.jobs.enqueue = async job => {if (job.kind === 'source.sync') sourceJobs.push(job.payload)};
    const path = new URL(request.url).pathname;
    if (path.startsWith('/_review/')) {
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(request.headers.get('Host') ?? '')) return new Response('Not found', {status: 404});
      const token = new URL(request.url).searchParams.get('access') ?? request.headers.get('X-Mango-Local-Bootstrap-Token');
      if (token !== bindings.LOCAL_BOOTSTRAP_TOKEN) return new Response('Forbidden', {status: 403});
      if (path === '/_review/sync-fault') {
        if (request.method !== 'POST') return new Response('Method not allowed', {status: 405});
        const value = await request.json() as {failSecond?: boolean};
        if (typeof value.failSecond !== 'boolean') return new Response('Invalid fault control', {status: 400});
        await bindings.DB.prepare('CREATE TABLE IF NOT EXISTS task_review_sync_control (id INTEGER PRIMARY KEY, fail_second INTEGER NOT NULL)').run();
        await bindings.DB.prepare('INSERT INTO task_review_sync_control (id, fail_second) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET fail_second = excluded.fail_second').bind(value.failSecond ? 1 : 0).run();
        return Response.json({failSecond: value.failSecond});
      }
      if (path === '/_review/sync-calls') {
        return Response.json((await bindings.DB.prepare('SELECT id, cursor FROM task_review_sync_calls ORDER BY id DESC LIMIT 20').all()).results);
      }
      const result = path === '/_review/suppression' ? await prepareSuppressionReview(platform)
        : await prepareSyntheticReview(platform, new URL(request.url).searchParams.get('scenario') ?? 'synthetic-review');
      const services = createAppServices(platform);
      await testIdentity(platform).importLocalDemoOperator({id: 'synthetic-review-operator', email: 'review@example.test', displayName: 'Synthetic review · sends disabled'}, new Date());
      const session = await testIdentity(platform).createTestSession('synthetic-review-operator');
      return new Response(null, {status: 303, headers: {Location: result.review, 'Set-Cookie': `${localSessionCookieName(request.url)}=${session.token}; HttpOnly; SameSite=Strict; Path=/`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer'}});
    }
    const response = await dispatchDocuments(request, bindings, context, platform, createLocalApp(bindings, platform));
    // Task-owned local runner only. Real marketing dispatch stays held. A failed
    // or chunked source run remains visible for the operator to resume.
    if (sourceJobs.length) context.waitUntil((async () => {
      const synchronize = createAppServices(platform).lifecycleRuntime.synchronizeCommerce!;
      for (const payload of sourceJobs) {
        try {await synchronize(payload)} catch { /* Durable run records expose the failure. */ }
      }
    })());
    return response;
  },
} satisfies ExportedHandler<LocalAppBindings & {MANGO_REVIEW_BASE_URL?: string}>;
