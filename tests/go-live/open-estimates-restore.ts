import {expect} from '@playwright/test';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {archiveRows,transfer} from './restore';
import {installation,type Installation} from './harness';
import type {providerEdge} from './edge';
import type {eventSigner} from './sendgrid-events';

/** Real native Worker/D1/portability round trip of populated private open data. */
export async function restoreOpenEstimates(source:Installation,cookie:string,edge:Awaited<ReturnType<typeof providerEdge>>,signer:ReturnType<typeof eventSigner>) {
  const work=await mkdtemp(join(tmpdir(),'mango-open-restore-'));
  let destination:Installation|undefined;
  try {
    const session=join(work,'source-session'),archive=join(work,'source.rer');
    await writeFile(session,cookie,{mode:0o600});
    await transfer(['export','--origin',source.runtime.url,'--session-file',session,'--out',archive]);
    const original=await archiveRows(archive);
    const privateTables=['open_tracking_settings','open_tracking_tokens','open_estimate_facts'];
    for(const table of privateTables)expect(original.some(row=>row.table===table),table).toBe(true);
    destination=await installation(edge,signer,{token:source.runtime.token,restore:true,origin:'https://restored-opens.example.test'});
    expect(await destination.count('open_tracking_settings')).toBe(0);
    const destinationSession=join(work,'destination-session');
    await writeFile(destinationSession,await destination.open('owner@example.test','restore-owner'),{mode:0o600});
    await transfer(['import','--origin',destination.runtime.url,'--session-file',destinationSession,'--from',archive]);
    for(const table of privateTables)expect(await destination.rows(`SELECT * FROM ${table} ORDER BY 1`)).toEqual(await source.rows(`SELECT * FROM ${table} ORDER BY 1`));
    const roundTrip=join(work,'round-trip.rer');
    await transfer(['export','--origin',destination.runtime.url,'--session-file',destinationSession,'--out',roundTrip]);
    expect((await archiveRows(roundTrip)).filter(row=>privateTables.includes(row.table))).toEqual(original.filter(row=>privateTables.includes(row.table)));
  } finally {await destination?.runtime.close();await rm(work,{recursive:true,force:true});}
}
