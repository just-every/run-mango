import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const db=new DatabaseSync(':memory:');
const files=readdirSync('migrations/core').filter(name=>name.endsWith('.sql')).sort();
const migration='0104_sending_event_silence.sql';
for(const name of files){if(name===migration)break;db.exec(readFileSync('migrations/core/'+name,'utf8'));}
db.exec('PRAGMA foreign_keys=OFF');
const at=Date.UTC(2026,9,1),address=['synthetic-mango-147','example.test'].join('@');
db.prepare(`INSERT INTO recipient_steps(id,campaign_id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,transport_disposition,attempt_count,provider,provider_message_id,provider_accepted_at,send_by_at,created_at,updated_at)
 VALUES(?,?,?,?,?,?,'email',?,?,'accepted',1,'resend',?,?,?,?,?)`).run('synthetic-mango-147','synthetic-mango-148','synthetic-mango-149','synthetic-mango-150','synthetic-mango-151','synthetic-mango-152',address,'synthetic-mango-153','synthetic-mango-154',at,at+7200000,at,at);
const before=db.prepare('SELECT * FROM recipient_steps').get();
const bytes=readFileSync('migrations/core/'+migration);db.exec(bytes.toString());
const after=db.prepare('SELECT * FROM recipient_steps').get();
for(const key of Object.keys(before))if(before[key]!==after[key])throw Error('Prior recipient changed: '+key);
for(const key of ['sending_generation','sending_accepted_at','sending_signed_event_at'])if(after[key]!==null)throw Error('Earlier traffic inferred: '+key);
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),migration,sha256:createHash('sha256').update(bytes).digest('hex'),priorMigrations:files.indexOf(migration),populatedRecipientPreserved:true,priorColumns:Object.keys(before).length,newFieldsNull:true,providerMessageIdPreserved:true,acceptanceAndDeadlinePreserved:true,exit:0};
writeFileSync('../packet/migration-populated-upgrade.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));db.close();
