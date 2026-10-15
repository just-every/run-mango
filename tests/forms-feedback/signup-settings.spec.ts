import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { fixture } from '../prior-approval/fixture';
import { hashToken } from '../../src/vendor/base/operator-auth/crypto.mjs';
import { loadSignupSettings, saveSignupSettings } from '../../src/core/features/audience/signup-settings';
import { createSignupRoutes, loadSignupDescription } from '../../src/core/features/audience/signup-routes';

contract('CONT-003', 'signup settings migration preserves prior records and exact accepted disclosure across a frequency change', async () => {
  const h=await fixture(true);
  try {
    const f=h.current;
    await f.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('before-signup-settings','prior@example.test','Prior contact','non-subscribed','non-subscribed',1,1)").run();
    const before=await f.db.prepare("SELECT * FROM contacts WHERE id='before-signup-settings'").first(); await h.upgrade();
    expect(await f.db.prepare("SELECT * FROM contacts WHERE id='before-signup-settings'").first()).toEqual(before);
    expect(await loadSignupSettings(f.platform)).toEqual({frequencyDisclosure:'Occasional newsletters',embedOrigins:[]});
    const token='s'.repeat(43), now=Date.now(), tokenHash=await hashToken(f.platform.config.sessionSigningKey,'session',token);
    await f.db.prepare("INSERT INTO oa_operators(id,email,display_name,role,status,version,created_at) VALUES('signup-owner','signup-owner@example.test','Owner','owner','active',1,?)").bind(now).run();
    await f.db.prepare("INSERT INTO oa_sessions(id,token_hash,operator_id,operator_version,kind,created_at,expires_at) VALUES('signup-session',?,'signup-owner',1,'native',?,?)").bind(tokenHash,now,now+60_000).run();
    const request=new Request('https://mango.example.test/api/audience/signup',{headers:{cookie:`__Host-operator_session=${token}`}});
    const old=await loadSignupDescription(f.platform);
    await saveSignupSettings(f.platform,{frequencyDisclosure:'Every Friday'},'signup-owner',request);
    expect(await loadSignupSettings(f.platform)).toEqual({frequencyDisclosure:'Every Friday',embedOrigins:[]});
    const next=await loadSignupDescription(f.platform); expect(next.disclosure).not.toBe(old.disclosure);
    const app=createSignupRoutes(f.services.audienceService,f.platform,f.db);
    const response=await app.request('https://mango.example.test/subscribe',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.61'},body:JSON.stringify({email:'outdated@example.test',consent:true,disclosure:old.disclosure})});
    expect(response.status).toBe(409); expect(await response.json()).toHaveProperty('error','signup_disclosure_changed');
    expect(await f.db.prepare('SELECT count(*) AS count FROM consent_evidence').first()).toEqual({count:0}); expect(f.outbound).toHaveLength(0);
    await f.db.prepare("UPDATE oa_operators SET version=2 WHERE id='signup-owner'").run();
    await expect(saveSignupSettings(f.platform,{frequencyDisclosure:'Every day'},'signup-owner',request)).rejects.toThrow();
    expect(await loadSignupSettings(f.platform)).toEqual({frequencyDisclosure:'Every Friday',embedOrigins:[]});
  } finally {await h.dispose();}
});
