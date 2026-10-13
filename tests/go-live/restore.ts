import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCommand } from '../../scripts/installer/run-command.mjs';
import { readArchive } from '../../src/vendor/base/portability/index.mjs';
import { json, type Installation } from './harness';

/** Base's portability CLI over Mango's authenticated transfer routes. */
export const transfer = async (args: string[]) => {
  let output = '';
  try { await runCommand(process.execPath, [resolve('src/vendor/base/portability/cli.mjs'), ...args], { write: (text: string) => { output += text; } }); }
  catch (error) { throw new Error(`${args[0]} failed: ${output.slice(-2000)}`, { cause: error }); }
  return output;
};
export async function archiveRows(file: string) {
  const records: any[] = [];
  for await (const value of readArchive(new Response(await readFile(file)).body!)) records.push(value);
  return records.filter(value => value.kind === 'part').flatMap(part => part.items).filter(item => item.kind === 'row');
}
export async function importContacts(target: Installation, owner: string, count: number) {
  const csv = 'Email Address,Email Marketing Status,OPTIN_TIME,CONFIRM_TIME\n' + Array.from({ length: count }, (_, i) => `reader${i}@example.test,subscribed,2026-09-01 10:00:00,2026-09-01 10:05:00`).join('\n');
  const { fingerprint } = await json(await target.call('/api/audience/import-preview', { method: 'POST', cookie: owner, body: { consent: { brandOrLegalSender: 'Mango Garden', messageCategory: 'newsletter',
    frequencyDisclosure: 'Monthly', destinationJurisdiction: 'AU', consentText: 'Send me the Mango Garden letter.', consentVersion: 'v1' }, files: [{ name: 'readers.csv', preset: 'csv-subscribed', csv }] } }), 200);
  let { job } = await json(await target.call('/api/audience/imports', { method: 'POST', cookie: owner, body: { fingerprint } }), 200);
  while (['queued', 'applying'].includes(job.state)) ({ job } = await json(await target.call(`/api/audience/imports/${job.id}/resume`, { method: 'POST', cookie: owner, body: {} }), 200));
  expect(job.state).toBe('completed');
}

