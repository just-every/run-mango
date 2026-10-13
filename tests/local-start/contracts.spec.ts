import { expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { readdir, readFile } from 'node:fs/promises';
import { contract } from '../contract';
import { localOptions } from '../../scripts/installer/rotation-options.mjs';
contract('OPER-001','outbox migration preserves every prior table and row',async()=>{
  const db=new DatabaseSync(':memory:');
  try {
    const files=(await readdir('migrations/core')).filter(name=>name.endsWith('.sql')).sort();
    for(const name of files.filter(name=>name<'0022')) db.exec(await readFile(`migrations/core/${name}`,'utf8'));
    db.exec("INSERT INTO oa_operators(id,email,display_name,role,status,created_at) VALUES('prior-owner','owner@example.test','Owner','owner','active',1); INSERT INTO oa_bootstrap(singleton,claim_id,claimed_at) VALUES(1,'prior',1); INSERT INTO campaigns(id,state,created_at,updated_at) VALUES('prior-campaign','draft',1,1);");
    const tables=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").all() as {name:string;sql:string}[];
    const before=tables.map(table=>({table,rows:db.prepare(`SELECT * FROM "${table.name}"`).all()}));
    await Promise.resolve(db.exec(await readFile('migrations/core/0022_local_mail_outbox.sql','utf8')));
    for(const {table,rows} of before){expect(db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(table.name)).toEqual({sql:table.sql});expect(db.prepare(`SELECT * FROM "${table.name}"`).all()).toEqual(rows);}
    expect(db.prepare('SELECT count(*) AS n FROM rer_mail_development_outbox').get()).toEqual({n:0});
  } finally {db.close();}
});
contract('OPER-001','credential recovery validates mailbox, port and explicit overwrite options',async()=>{
  expect(await localOptions(['--owner-email','Owner@example.test','--port','15660','--force'],process.cwd())).toMatchObject({email:'owner@example.test',origin:'http://127.0.0.1:15660',force:true});
  for (const authority of ['session','contact']) expect(await localOptions(['--owner-email','owner@example.test','--force',`--legacy-${authority}-authority`],process.cwd())).toMatchObject({force:true,legacyAuthority:authority});
  await expect(localOptions(['--owner-email','owner@example.test','--force','--legacy-session-authority','--legacy-contact-authority'],process.cwd())).rejects.toThrow('exactly one');
  await expect(localOptions(['--owner-email','owner@example.test','--legacy-session-authority'],process.cwd())).rejects.toThrow('requires --force');
  for(const args of [['--owner-email','invalid'],['--owner-email','a@example.test\nBAD=1'],['--owner-email','a@example.test','--port','0'],['--unknown']]) await expect(localOptions(args,process.cwd())).rejects.toThrow();
});
