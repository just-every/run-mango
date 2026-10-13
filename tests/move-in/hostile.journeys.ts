import { expect, test } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { providerEdge } from '../go-live/edge';
import { eventSigner } from '../go-live/sendgrid-events';
import { installation } from '../go-live/harness';
import { accountExport, zip } from './archive';
import { postArchive, record, tableCounts } from './support';

// Data import is high-stakes: every hostile archive is refused or skipped by name, through
// the real Preview and Import routes, with no row written and the app still answering.
test('[CONT-010] hostile archives are refused or skipped with nothing written, and an oversized export gets a plain message', async () => {
  const edge = await providerEdge(), site = await installation(edge, eventSigner());
  try {
    const cookie = await site.open();
    const legit = await accountExport(), csv = 'Email Address,First Name\nhostile@example.test,Hostile\n';
    const cases: Array<{ name: string; archive: Uint8Array; status: number; code?: string; skipped?: string }> = [
      { name: 'expansion bomb (20 MB of one byte)', archive: zip([{ name: 'audiences/A/subscribed.csv', data: 'Email Address\n' + 'a'.repeat(20 * 1024 * 1024) }]), status: 400, code: 'compression-ratio' },
      { name: 'entry that expands past its declared size', archive: zip([{ name: 'templates/x.html', data: `<p>${'x'.repeat(4 * 1024 * 1024)}</p>`, declaredSize: 2048 }]), status: 400, code: 'inconsistent-header' },
      { name: '../ path traversal', archive: zip([{ name: '../evil/subscribed.csv', data: csv }]), status: 400, code: 'path-traversal' },
      { name: 'absolute path', archive: zip([{ name: '/etc/subscribed.csv', data: csv }]), status: 400, code: 'absolute-path' },
      { name: 'duplicate names', archive: zip([{ name: 'a/subscribed.csv', data: csv }, { name: 'a/subscribed.csv', data: csv }]), status: 400, code: 'duplicate-name' },
      { name: 'symbolic link', archive: zip([{ name: 'a/subscribed.csv', data: '/etc/passwd', method: 0, external: (0o120777 << 16) >>> 0 }]), status: 400, code: 'symbolic-link' },
      { name: 'encrypted entry', archive: zip([{ name: 'a/subscribed.csv', data: csv, flags: 1 }]), status: 400, code: 'encrypted-entry' },
      { name: 'truncated archive', archive: legit.slice(0, Math.floor(legit.length * 0.6)), status: 400, code: 'truncated' },
      { name: 'not a ZIP file', archive: new TextEncoder().encode('Email Address\nplain@example.test\n'), status: 400, code: 'not-zip' },
      { name: 'nested archive', archive: zip([{ name: 'audiences/inner.zip', data: legit, method: 0 }]), status: 200, skipped: 'nested-archive' },
      { name: 'legitimate export over the size limit', archive: zip([{ name: 'gallery/large.bin', data: randomBytes(17 * 1024 * 1024), method: 0 }]), status: 413 },
    ];
    const results = [];
    for (const item of cases) {
      const before = await tableCounts(site);
      const preview = await postArchive(site, cookie, '/api/audience/archive-preview', item.archive);
      const applied = await postArchive(site, cookie, '/api/audience/archives', item.archive, preview.body.fingerprint ?? 'unreviewed');
      const after = await tableCounts(site);
      const health = await site.call('/health');
      results.push({ archive: item.name, preview: preview.status, code: preview.body.code ?? (preview.body.summary ? `skipped: ${preview.body.summary.kept.map((kind: { kind: string; files: number }) => `${kind.kind} ${kind.files}`).join(', ')}` : preview.body.error),
        detail: preview.body.detail ?? null, apply: applied.status, rowsWritten: Object.keys(after).filter(table => after[table] !== before[table]).length, health: health.status });
      expect(preview.status, item.name).toBe(item.status);
      if (item.code) expect(preview.body.code, item.name).toBe(item.code);
      if (item.skipped) {
        expect(preview.body.summary.kept.map((kind: { kind: string }) => kind.kind)).toEqual([item.skipped]);
        expect(preview.body.summary.audience).toEqual([]);
        expect(applied.body.code).toBe('nothing-to-import');
      } else expect(applied.status, item.name).toBe(item.status);
      expect(after, item.name).toEqual(before);
      if (item.status === 413) expect([preview.body.error, applied.body.error]).toEqual(['archive_too_large', 'archive_too_large']);
      expect(health.status).toBe(200);
    }
    await record('hostile-archives.json', results);
  } finally { await site.runtime.close(); await edge.close(); }
});
