import {expect,test} from '@playwright/test';
import {fixture,draft} from '../sender-verification/fixture';
import {saveSenderSettings} from '../../src/core/features/settings/sender-persistence';

test('test-send rechecks settings after asynchronous preparation',async()=>{
  const f=await fixture();
  try {
    const now=Date.now();
    await f.db.prepare("INSERT INTO oa_operators(id,email,display_name,role,status,version,created_at) VALUES ('settings-race','race@example.test','Race','owner','active',1,?)").bind(now).run();
    await f.db.prepare("INSERT INTO oa_sessions(id,token_hash,operator_id,operator_version,kind,created_at,expires_at) VALUES ('settings-race-session','test-only-race','settings-race',1,'native',?,?)").bind(now,now+3600000).run();
    const campaign=await draft(f,'test-send-race'), capabilities=f.platform.mailer.capabilities;
    f.platform.mailer.capabilities=async()=>{
      await saveSenderSettings(f.platform,{...f.platform.config.mailSender,physicalAddress:'99 New Street, Brisbane QLD 4000'},
        {sessionId:'settings-race-session',operatorId:'settings-race',version:1});
      return capabilities();
    };
    expect(await f.lifecycle.approval.sendTest({...campaign,channel:'email',to:'receiver@example.test'})).toMatchObject({kind:'blocked',detail:expect.stringContaining('changed during preparation')});
    expect(f.outbound).toHaveLength(0);
  } finally {await f.dispose();}
});
