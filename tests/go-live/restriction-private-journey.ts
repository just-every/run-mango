import {expect} from '@playwright/test';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {archiveRows,transfer} from './restore';
import type {Installation} from './harness';

export async function restrictionPrivateJourney(site:Installation,cookie:string,key:string) {
  const stored=await site.rows('SELECT credentials FROM incumbent_restriction_connections');
  expect(stored).toHaveLength(1);
  const work=await mkdtemp(join(tmpdir(),'mango-parallel-export-'));
  try {
    const session=join(work,'session'),archive=join(work,'account.rer');
    await writeFile(session,cookie,{mode:0o600});
    await transfer(['export','--origin',site.runtime.url,'--session-file',session,'--out',archive]);
    const records=await archiveRows(archive);
    expect(records.some(row=>row.table==='contacts')).toBe(true);
    expect(JSON.stringify(records)).not.toContain(stored[0].credentials);
    expect(JSON.stringify(records)).not.toContain(key);
  }finally{await rm(work,{recursive:true,force:true});}
}
