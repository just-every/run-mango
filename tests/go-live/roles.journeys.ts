import {test,expect} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,availableTransport} from './harness';
import {openPage} from '../support/navigation';
import {type ProductRole} from '../../src/core/features/auth/permissions';

test('[OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history',async({page},info)=>{
  const edge=await providerEdge(),site=await installation(edge,eventSigner());
  try {
    const owner=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie:owner,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    await confirmedContact(site,edge,owner,'riley@example.test','Riley Gardener');
    const contact=(await site.rows("SELECT id FROM contacts WHERE email='riley@example.test'"))[0].id;
    const cookies:Partial<Record<ProductRole,string>>={owner};
    for(const role of ['admin','manager','author','analyst','support'] as const) {
      cookies[role]=await site.open(`${role}@example.test`,`role-${role}`);
      expect((await site.call(`/api/operators/role-${role}/role`,{method:'PUT',cookie:owner,body:{role}})).status).toBe(200);
      expect((await json(await site.call('/api/operator',{cookie:cookies[role]}),200)).operator.role).toBe(role);
    }
    await site.runtime.sql("UPDATE oa_operators SET display_name=CASE id WHEN 'go-live-owner' THEN 'Jordan Green' WHEN 'role-admin' THEN 'Noah Brooks' WHEN 'role-manager' THEN 'Maya Torres' WHEN 'role-author' THEN 'Lena Chen' WHEN 'role-analyst' THEN 'Ari Patel' ELSE 'Sam Rivera' END RETURNING id");
    // Existing native sessions remain signed in, but cannot retain an old grant.
    expect((await site.call('/api/operators/go-live-owner/role',{method:'PUT',cookie:owner,body:{role:'author'}})).status).toBe(409);
    const cases=[
      ['POST','/api/campaigns/absent/approve',['owner','admin','manager']],
      ['POST','/api/flows/absent/activate',['owner','admin','manager']],
      ['POST','/api/audience/import-preview',['owner','admin']],
      ['GET','/api/audience/export',['owner','admin']],
      ['DELETE','/api/contacts/absent',['owner','admin']],
      ['POST','/api/operators',['owner','admin']],
      ['POST','/api/settings/integrations',['owner','admin','manager']],
      ['POST','/api/settings/sending/connection',['owner']],
    ] as const;
    for(const [role,cookie] of Object.entries(cookies))for(const [method,path,allowed] of cases) {
      const response=await site.call(path,{method,cookie,body:method==='GET'||method==='DELETE'?undefined:{}});
      if(!(allowed as readonly string[]).includes(role)) {
        expect(response.status,`${role}: ${method} ${path}`).toBe(403);
        expect((await response.json()).error).toBe('role_forbidden');
      } else if(response.status===403)expect((await response.json()).error).not.toBe('role_forbidden');
    }
    const campaign=await draftCampaign(site,cookies.author!,'Weekend planting letter',['riley@example.test'],new Date(Date.now()+86400000));
    expect((await site.call(`/api/campaigns/${campaign.campaignId}/request-approval`,{method:'POST',cookie:cookies.author,body:{revisionId:campaign.revisionId}})).status).toBe(200);
    expect((await site.call(`/api/campaigns/${campaign.campaignId}/test-send`,{method:'POST',cookie:cookies.author,body:{revisionId:campaign.revisionId,channel:'email',to:['forbidden@example.test']}})).status).toBe(403);
    await availableTransport(site);
    expect((await site.call(`/api/campaigns/${campaign.campaignId}/test-send`,{method:'POST',cookie:cookies.manager,body:{revisionId:campaign.revisionId,channel:'email',to:['design@example.test','copy@example.test']}})).status).toBe(200);
    expect(edge.sends.filter(send=>['design@example.test','copy@example.test'].includes(send.to))).toHaveLength(2);
    for(const role of ['analyst','support'] as const) {
      const detail=await json(await site.call(`/api/contacts/${contact}`,{cookie:cookies[role]}),200);
      expect(detail.contact.email).toBe('••••');
      expect(JSON.stringify(detail)).not.toContain('riley@example.test');
      expect(detail.consent.every((row:any)=>row.captureIp===null&&row.confirmationIp===null)).toBe(true);
    }
    expect((await site.call('/api/contacts/consent',{method:'POST',cookie:cookies.support,body:{}})).status).toBe(403);
    await json(await site.call(`/api/contacts/${contact}/privacy-requests`,{method:'POST',cookie:cookies.support,body:{kind:'erasure'}}),201);
    let uiChanges=false;
    const view=async(cookie:string,path:string)=>{
      await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
      await openPage(page,site.runtime.url+path);
    };
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await view(owner,'/app/settings');
      await expect(page.getByRole('combobox',{name:'Role for author@example.test'})).toHaveValue('author');
      if(!uiChanges) {
        const role=page.getByRole('combobox',{name:'Role for author@example.test'});
        await role.selectOption('analyst');
        await expect.poll(async()=>(await json(await site.call('/api/operator',{cookie:cookies.author}),200)).operator.role).toBe('analyst');
        await role.selectOption('author');
        await expect.poll(async()=>(await json(await site.call('/api/operator',{cookie:cookies.author}),200)).operator.role).toBe('author');
        await expect(role).toHaveValue('author');await expect(role).toBeEnabled();
        const grant=page.getByRole('checkbox',{name:'Allow unmasked contact details for analyst@example.test',exact:true});
        await grant.check();
        await expect.poll(async()=>(await json(await site.call(`/api/contacts/${contact}`,{cookie:cookies.analyst}),200)).contact.email).toBe('riley@example.test');
        await grant.uncheck();
        await expect.poll(async()=>(await json(await site.call(`/api/contacts/${contact}`,{cookie:cookies.analyst}),200)).contact.email).toBe('••••');
        uiChanges=true;
      }
      await page.locator('.settings-operators').screenshot({path:info.outputPath(`roles-settings-${width}.png`)});
      await view(cookies.author!,`/app/campaigns/${campaign.campaignId}/review`);
      await expect(page.getByRole('button',{name:'Request approval',exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Send a test',exact:true}).click();
      await expect(page.getByRole('combobox',{name:'Configured test destination',exact:true})).toBeVisible();
      await expect(page.getByRole('textbox',{name:'Test destination',exact:true})).toHaveCount(0);
      await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('The spring beds are in.');
      await expect(page.getByRole('button',{name:'Approve & schedule',exact:true})).toHaveCount(0);
      await page.screenshot({path:info.outputPath(`roles-author-${width}.png`),fullPage:true});
      await view(cookies.analyst!,'/app/campaigns');
      await expect(page.getByRole('button',{name:'New campaign',exact:true})).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText('riley@example.test');
      await page.screenshot({path:info.outputPath(`roles-analyst-campaigns-${width}.png`),fullPage:true});
      await view(cookies.support!,`/app/audience/${contact}`);
      await expect(page.getByRole('button',{name:'Record erasure request',exact:true})).toBeVisible();
      await expect(page.locator('main')).not.toContainText('riley@example.test');
      await expect(page.locator('section[aria-labelledby="import-observations-title"]')).toContainText('restricted by your role');
      await page.screenshot({path:info.outputPath(`roles-support-${width}.png`),fullPage:true});
      await view(cookies.support!,'/app/audience');
      await expect(page.getByRole('link',{name:'Import contacts',exact:true})).toHaveCount(0);
      await page.screenshot({path:info.outputPath(`roles-audience-${width}.png`),fullPage:true});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie:cookies.manager,body:{revisionId:campaign.revisionId,idempotencyKey:`roles-${campaign.revisionId}`}}),200);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      for(const role of ['manager','analyst'] as const) {
        await view(cookies[role]!,`/app/campaigns/${campaign.campaignId}/scheduled`);
        await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toHaveCount(role==='manager'?1:0);
        const recipients=page.getByRole('table',{name:'Recipient outcomes',exact:true});
        await expect(recipients).toBeVisible();
        await expect(recipients.locator('td[data-label="Outcome"]').first()).toHaveText('queued');
        if(role==='analyst') {
          await expect(recipients).toContainText('••••');
          await expect(page.getByLabel('Saved audience rule')).toContainText('restricted by your role');
        }
        if(role==='analyst')await expect(page.locator('main')).not.toContainText('riley@example.test');
        await page.screenshot({path:info.outputPath(`roles-${role}-scheduled-${width}.png`),fullPage:true});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    }
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,site.runtime.url+'/docs/team-and-settings');
      await expect(page.getByRole('heading',{name:'Roles',exact:true})).toBeVisible();
      await page.screenshot({path:info.outputPath(`roles-docs-${width}.png`),fullPage:true});
      await openPage(page,site.runtime.url+'/docs/install');
      const permission=page.getByText('Operators with draft-editing access can then spend from your 12ui account;', {exact:false});
      await permission.screenshot({path:info.outputPath(`roles-design-docs-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    expect((await site.rows("SELECT count(*) n FROM lifecycle_audit_entries WHERE action='operator.role-changed'"))[0].n).toBe(9);
    await json(await site.call(`/api/contacts/${contact}/opt-out`,{method:'POST',cookie:cookies.support,body:{channel:'email'}}),200);
    expect((await site.rows(`SELECT email_status FROM contacts WHERE id='${contact}'`))[0].email_status).toBe('unsubscribed');
    expect((await site.call('/api/operators/role-manager/role',{method:'PUT',cookie:cookies.admin,body:{role:'owner'}})).status).toBe(403);
    expect((await site.call('/api/operators/go-live-owner',{method:'DELETE',cookie:cookies.admin})).status).toBe(403);

    const retainedHistory=async()=>{
      const read=async(path:string)=>json(await site.call(path,{cookie:owner}),200);
      const [detail,requests,authorActivity,managerActivity,records]=await Promise.all([
        read(`/api/campaigns/${campaign.campaignId}`),
        read(`/api/campaigns/${campaign.campaignId}/approval-requests`),
        read(`/api/activity?operator=role-author&action=campaign.approval-requested&object=${campaign.revisionId}`),
        read(`/api/activity?operator=role-manager&action=approved&object=${campaign.revisionId}`),
        Promise.all([
          `SELECT * FROM campaigns WHERE id='${campaign.campaignId}'`,
          `SELECT * FROM campaign_revisions WHERE id='${campaign.revisionId}'`,
          `SELECT * FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}' ORDER BY idempotency_key`,
          `SELECT * FROM campaign_state_transitions WHERE campaign_id='${campaign.campaignId}' ORDER BY id`,
          `SELECT * FROM lifecycle_audit_entries WHERE entity_id='${campaign.revisionId}' ORDER BY id`,
        ].map(sql=>site.rows(sql))),
      ]);
      return {campaign:detail.campaign,revision:detail.revision,attribution:detail.attribution,requests:requests.requests,
        authorActivity:authorActivity.entries,managerActivity:managerActivity.entries,records};
    };
    const history=await retainedHistory();
    expect(history.attribution.campaignAuthor).toMatchObject({operatorId:'role-author',operatorName:'Lena Chen'});
    expect(history.attribution.revisionApprover).toMatchObject({operatorId:'role-manager',operatorName:'Maya Torres'});
    expect(history.requests).toEqual([expect.objectContaining({revisionId:campaign.revisionId,operator:'Lena Chen'})]);
    expect(history.authorActivity).toEqual([expect.objectContaining({operatorId:'role-author',operatorName:'Lena Chen',objectId:campaign.revisionId})]);
    expect(history.managerActivity).toEqual([expect.objectContaining({operatorId:'role-manager',operatorName:'Maya Torres',objectId:campaign.revisionId})]);
    for(const role of ['author','manager'] as const) {
      expect((await site.call(`/api/operators/role-${role}`,{method:'DELETE',cookie:owner})).status).toBe(204);
      expect((await site.call('/api/operator',{cookie:cookies[role]})).status).toBe(401);
      expect((await site.call(`/api/campaigns/${campaign.campaignId}/review`,{cookie:cookies[role]})).status).toBe(401);
    }
    const removed=await site.rows("SELECT id,display_name,removed_at FROM operators WHERE id IN ('role-author','role-manager') ORDER BY id");
    expect(removed.map(row=>({id:row.id,name:row.display_name,removed:row.removed_at!==null}))).toEqual([
      {id:'role-author',name:'Lena Chen',removed:true},{id:'role-manager',name:'Maya Torres',removed:true},
    ]);
    const activeOperators=(await json(await site.call('/api/operators',{cookie:owner}),200)).operators.map((operator:any)=>operator.id);
    for(const role of ['author','manager'])expect(activeOperators).not.toContain(`role-${role}`);
    expect(await retainedHistory()).toEqual(history);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await view(owner,`/app/campaigns/${campaign.campaignId}/review`);
      await expect(page.getByLabel('Campaign attribution',{exact:true})).toContainText('Lena Chen');
      await expect(page.getByLabel('Campaign attribution',{exact:true})).toContainText('Maya Torres');
      await expect(page.locator('main')).toContainText('Approval requested by Lena Chen');
      await page.screenshot({path:info.outputPath(`roles-retained-review-${width}.png`),fullPage:true});
      await view(owner,`/app/campaigns/${campaign.campaignId}`);
      await expect(page.getByLabel('Campaign attribution',{exact:true})).toContainText('Lena Chen');
      await expect(page.getByLabel('Campaign attribution',{exact:true})).toContainText('Maya Torres');
      await page.screenshot({path:info.outputPath(`roles-retained-campaign-${width}.png`),fullPage:true});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  } finally {await site.runtime.close();await edge.close();}
});
