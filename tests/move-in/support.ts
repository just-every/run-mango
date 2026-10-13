import { expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Installation } from '../go-live/harness';

export const consentEvidence = { brandOrLegalSender: 'Mango Garden', messageCategory: 'newsletter', frequencyDisclosure: 'Monthly',
  destinationJurisdiction: 'AU', consentText: 'Send me the Mango Garden letter once a month.', consentVersion: 'garden-2026' };
const evidence = process.env.MOVE_IN_EVIDENCE;
export async function record(name: string, value: unknown) {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  await writeFile(join(evidence, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
}
export const screenshotPath = (name: string, fallback: string) => evidence ? join(evidence, name) : fallback;

/** The archive through the authenticated multipart routes, as the Import page sends it. */
export async function postArchive(site: Installation, cookie: string, path: string, bytes: Uint8Array, fingerprint?: string, consent: object = consentEvidence) {
  const form = new FormData();
  form.set('archive', new File([bytes], 'account-export.zip', { type: 'application/zip' }));
  form.set('consent', JSON.stringify(consent));
  if (fingerprint) form.set('fingerprint', fingerprint);
  const response = await site.call(path, { method: 'POST', cookie, raw: form });
  return { status: response.status, body: await response.json() };
}
/** Apply a reviewed archive and drive its bounded steps to the end. */
export async function importArchive(site: Installation, cookie: string, bytes: Uint8Array) {
  const preview = await postArchive(site, cookie, '/api/audience/archive-preview', bytes);
  expect(preview.status, JSON.stringify(preview.body)).toBe(200);
  const applied = await postArchive(site, cookie, '/api/audience/archives', bytes, preview.body.fingerprint);
  expect(applied.status, JSON.stringify(applied.body)).toBe(200);
  return { preview: preview.body, ...(await drive(site, cookie, applied.body.archive.id, 'continue')), repeated: applied.body.repeated as boolean };
}
export async function drive(site: Installation, cookie: string, id: string, first: 'continue' | 'undo') {
  let action = first, archive: any, steps = 0;
  do {
    const response = await site.call(`/api/audience/archives/${id}/${action}`, { method: 'POST', cookie });
    const body = await response.json(); archive = body.archive; expect(response.status, JSON.stringify(body)).toBe(200);
    action = 'continue'; steps++;
  } while (['applying', 'undoing'].includes(archive.state));
  return { archive, steps };
}
/** Every table's row count in one read, for proving that a step wrote nothing. */
export async function tableCounts(site: Installation) {
  const tables = (await site.rows("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name")).map(row => String(row.name));
  const counts: Record<string, number> = {};
  for (let start = 0; start < tables.length; start += 50) {
    const [row] = await site.rows(`SELECT ${tables.slice(start, start + 50).map((name, index) => `(SELECT count(*) FROM "${name}") AS c${index}`).join(', ')}`);
    tables.slice(start, start + 50).forEach((name, index) => { counts[name] = Number(row[`c${index}`]); });
  }
  return counts;
}
