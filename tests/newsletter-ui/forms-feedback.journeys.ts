import { openPage, reloadPage } from '../support/navigation';
import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { signInAsLocalOperator } from './browser-checks';
import { createBlank, expectFieldError, expectSummary, expectVisibleFocus } from './form-feedback-helpers';
import { challengeEdge } from './signup-privacy-support';

{
  const width = 390;
  contract('CAMP-002', `composer keeps incomplete drafts, validates conditions and schedule, and derives audience at ${width}px`, async ({page,request}) => {
    await signInAsLocalOperator(page,request); await page.setViewportSize({width,height:900}); await openPage(page, '/app'); const id=await createBlank(page);
    const form=page.locator('#campaign-composer'), subject=page.getByLabel('Email subject',{exact:true});
    await expect(form.getByLabel('Email body',{exact:true})).toHaveAttribute('aria-required','true');
    const htmlMode=page.getByRole('button',{name:'HTML mode',exact:true}), richMode=page.getByRole('button',{name:'Rich text',exact:true});
    await htmlMode.focus();await htmlMode.press('Enter');await expect(htmlMode).toHaveAttribute('aria-pressed','true');
    await expect(form.locator('textarea[aria-label="Email body"]')).toHaveAttribute('required','');
    await richMode.focus();await richMode.press('Enter');await expect(richMode).toHaveAttribute('aria-pressed','true');
    await subject.fill(''); await subject.blur(); await expectFieldError(subject);
    const saved=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().includes('/api/campaign-revisions/'));
    await page.getByRole('button',{name:'Save full draft'}).click(); expect((await saved).status()).toBeLessThan(300);
    await expect(page.locator('.action-notice[role="status"]')).toContainText('Draft saved.'); await expect(subject).toBeFocused();
    await expect(page.locator('.message-preview--email h3')).toHaveText('Email subject not saved');
    for(const label of ['Campaign name','Consent message category','Email subject','Email preheader','Physical postal address','Sender name','From email','Reply-to email']) await expect(form.getByLabel(label,{exact:true})).toHaveAttribute('required','');
    await expect(form.getByLabel('Email body',{exact:true})).toHaveAttribute('aria-required','true');
    const invalid=await form.locator('[aria-invalid="true"]').count(); expect(invalid).toBeGreaterThan(0); await expectSummary(form,invalid);
    await reloadPage(page); await expect(subject).toHaveValue('');
    await expect(page.getByRole('button',{name:'Approve & schedule'})).toBeDisabled(); await expect(page.locator('#approval-blocked-reason')).toBeVisible(); await expect(page.getByRole('alertdialog')).toHaveCount(0);
    const savedState=await page.evaluate(async id=>(await fetch(`/api/campaigns/${id}`)).json(),id); expect(savedState.campaign.state).toBe('draft');
    await page.getByRole('button',{name:'Add exclusion',exact:true}).click(); const condition=page.getByLabel('Exclude 1 value'); await condition.focus(); await condition.blur(); await expectFieldError(condition);
    await page.getByRole('button',{name:'Save full draft'}).click(); expect(await form.locator('[aria-invalid="true"]').count()).toBeGreaterThan(0);
    await condition.fill('exclude@example.test'); await condition.blur();
    await page.getByRole('button',{name:'Add email step',exact:true}).click(); const send=page.getByLabel('Local send date and time'), deadline=page.getByLabel('Local send-by date and time');
    await send.focus(); await send.blur(); await expectFieldError(send);
    await send.fill('2031-10-08T10:00'); await deadline.fill('2031-10-08T09:00'); await deadline.blur(); await expectFieldError(deadline,/after the send time/);
    await deadline.fill('2031-10-08T18:00'); await deadline.blur();
    const timingReason=page.getByLabel('Why this time',{exact:true});await timingReason.fill('');await timingReason.blur();await expectFieldError(timingReason);await expect(timingReason).toHaveAttribute('required','');
    await page.getByRole('button',{name:'Save full draft'}).click();await expectFieldError(timingReason);await expectSummary(form,await form.locator('[aria-invalid="true"]').count());
    await timingReason.fill('The store opens at this time.');await timingReason.blur();
    await expect(page.getByRole('combobox',{name:'Channel',exact:true}).locator('option[value="sms"]')).toHaveCount(0);
    await expect(page.getByLabel('SMS message',{exact:true})).toHaveCount(0);
    await expect(page.getByLabel('SMS sender',{exact:true})).toHaveCount(0);
    await page.getByLabel('Include 1 field').selectOption('contact:email'); await page.getByLabel('Include 1 comparison').selectOption('contains'); await page.getByLabel('Include 1 value').fill('live@example.test');
    const summary=page.getByLabel('Audience summary',{exact:true}); await expect(summary).toContainText('live@example.test'); await expect(summary).toContainText('exclude@example.test'); await expect(page.getByRole('textbox',{name:'Audience rule',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Save full draft'}).click(); await expect(page.locator('.action-notice')).toContainText('Draft saved.'); await reloadPage(page); await expect(summary).toContainText('live@example.test'); await expect(summary).toContainText('exclude@example.test');
    await expect(page.getByRole('button',{name:'Approve & schedule'})).toBeDisabled();await expect(page.locator('#approval-blocked-reason')).toBeVisible();await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expectVisibleFocus(page);
  });
  contract('CAMP-002', `unsaved changes modal traps keyboard focus, Escape cancels, and disclosures announce state at ${width}px`, async ({page,request}) => {
    await signInAsLocalOperator(page,request); await page.setViewportSize({width,height:900}); await openPage(page, '/app'); await createBlank(page);
    for(const name of ['Send a test','Approval checks']) {const control=page.getByRole('button',{name,exact:true}); await control.focus(); const initial=await control.getAttribute('aria-expanded'); await control.press('Space'); await expect(control).toHaveAttribute('aria-expanded',initial==='true'?'false':'true'); await control.press('Enter'); await expect(control).toHaveAttribute('aria-expanded',initial!);}
    await page.getByLabel('Campaign name',{exact:true}).fill('Unsaved changes'); const opener=page.getByRole('link',{name:'← Back to campaigns',exact:true}); await opener.focus(); await opener.press('Enter');
    const modal=page.getByRole('alertdialog'); await expect(modal).toBeVisible(); const keep=modal.getByRole('button',{name:'Keep editing'}), discard=modal.getByRole('button',{name:'Discard and leave'}); await expect(keep).toBeFocused(); await keep.press('Shift+Tab'); await expect(discard).toBeFocused(); await discard.press('Tab'); await expect(keep).toBeFocused(); await page.keyboard.press('Escape'); await expect(modal).toHaveCount(0); await expect(opener).toBeFocused(); await expect(page.getByLabel('Campaign name',{exact:true})).toHaveValue('Unsaved changes'); await expect(page).toHaveURL(/\/review$/);
  });
  contract('AUD-001', `sender, test destination, import mapping, signup settings and subscribe give linked inline feedback at ${width}px`, async ({page,request}) => {
    await signInAsLocalOperator(page,request); await page.setViewportSize({width,height:900});
    await openPage(page, '/app/settings'); const sender=page.locator('.settings-sender-form');
    for(const label of ['Business display name','From email','Reply-to email','Physical postal address']) {const control=sender.getByLabel(label,{exact:true}); await expect(control).toHaveAttribute('required',''); await control.fill(''); await control.blur(); await expectFieldError(control);}
    await sender.getByRole('button',{name:'Save sender details'}).click(); await expect(sender.getByLabel('Business display name',{exact:true})).toBeFocused(); await expectSummary(sender,4);
    await sender.getByLabel('From email',{exact:true}).fill('invalid'); await sender.getByLabel('From email',{exact:true}).blur(); await expectFieldError(sender.getByLabel('From email',{exact:true}),/valid email/); await expectVisibleFocus(page);
    await openPage(page, '/app/campaigns/campaign_table_runner_draft_v4/review'); await page.getByRole('button',{name:'Send a test',exact:true}).click(); const testForm=page.getByRole('form',{name:'Send a test'}), destination=page.getByLabel('Test destination',{exact:true});
    await destination.focus(); await destination.blur(); await expectFieldError(destination); await testForm.getByRole('button',{name:'Send test',exact:true}).click(); await expect(destination).toBeFocused(); await expectSummary(testForm,1); await destination.fill('invalid'); await destination.blur(); await expectFieldError(destination,/valid email/); await destination.fill('first@example.test, second@example.test'); await destination.blur(); await expect(destination).not.toHaveAttribute('aria-invalid','true');
    await expect(destination).toHaveAttribute('required','');
    await openPage(page, '/app/audience/import'); const importForm=page.getByRole('form',{name:'Audience import mapping'}); await importForm.getByRole('button',{name:'Preview import'}).click(); await expect(page.getByLabel('Choose CSV files')).toBeFocused(); await expectSummary(importForm,1);
    await expect(page.getByLabel('Choose CSV files')).toHaveAttribute('aria-required','true');
    await page.getByLabel('Choose CSV files').setInputFiles({name:'mapping.csv',mimeType:'text/csv',buffer:Buffer.from('Email Address,Phone,First Name\nvalidation@example.test,+61400123456,Validation')});
    await page.getByLabel('Preset for mapping.csv').selectOption('csv-non-subscribed'); await page.getByRole('button',{name:'Preview import'}).click();
    const mapping=page.getByLabel('Email in mapping.csv',{exact:true}), phoneMapping=page.getByLabel('Phone in mapping.csv',{exact:true});
    await expect(mapping).toBeVisible(); await phoneMapping.selectOption(''); await mapping.focus(); await mapping.selectOption(''); await mapping.blur();
    await expectFieldError(mapping); await phoneMapping.focus(); await phoneMapping.blur(); await expectFieldError(phoneMapping);
    await page.getByRole('button',{name:'Preview import'}).click(); await expect(mapping).toBeFocused();
    await expectSummary(importForm,await importForm.locator('[aria-invalid="true"]').count());
    // Either destination satisfies the mapping requirement; a phone does not borrow email consent.
    await phoneMapping.selectOption('Phone');
    const phonePreview=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/audience/import-preview');
    await page.getByRole('button',{name:'Preview import'}).click(); const phoneResponse=await phonePreview;
    expect(phoneResponse.status()).toBe(200); const phoneData=await phoneResponse.json();
    expect(phoneData.columns[0].mapping.email).toBe('');
    expect(phoneData.rows).toEqual([expect.objectContaining({email:'',phone:'+61400123456',smsStatus:'non-subscribed'})]);
    await expect(mapping).not.toHaveAttribute('aria-invalid','true'); await expect(phoneMapping).not.toHaveAttribute('aria-invalid','true');
    await expect(importForm.locator('.validation-summary')).toHaveCount(0);
    await expect(page.getByLabel('Preset for mapping.csv')).toHaveAttribute('required','');
    await openPage(page, '/app/audience'); const signup=page.getByRole('form',{name:'Signup-form settings'}), frequency=signup.getByLabel('Newsletter frequency',{exact:true}); const original=await frequency.inputValue(); await frequency.fill(''); await frequency.blur(); await expectFieldError(frequency); await signup.getByRole('button',{name:'Save signup settings'}).click(); await expect(frequency).toBeFocused(); await expectSummary(signup,1); await frequency.fill('<weekly>'); await frequency.blur(); await expectFieldError(frequency,/plain text/);
    await expect(frequency).toHaveAttribute('required','');
    await frequency.fill('Weekly newsletter updates'); await signup.getByRole('button',{name:'Save signup settings'}).click(); await expect(signup.locator('.action-notice[role="status"]')).toContainText('Signup settings saved'); await reloadPage(page); await expect(frequency).toHaveValue('Weekly newsletter updates'); await frequency.fill(original); await signup.getByRole('button',{name:'Save signup settings'}).click(); await expect(signup.locator('.action-notice')).toBeVisible();
    await challengeEdge(page);
    await openPage(page, '/subscribe'); const subscribe=page.locator('.subscribe-form'), email=page.getByLabel('Email address',{exact:true}), consent=page.getByRole('checkbox');
    await expect(email).toBeEnabled(); await email.click(); await email.blur(); await expectFieldError(email);
    // The configured fixture requires verification, activated by a trusted form interaction.
    const confirmation=page.getByRole('button',{name:'Request confirmation'});
    await expect(confirmation).toBeDisabled();
    await page.getByRole('button',{name:'Complete verification'}).click();
    await expect(confirmation).toBeEnabled();
    await confirmation.click(); await expect(email).toBeFocused(); await expectFieldError(consent); await expectSummary(subscribe,2); await email.fill('invalid'); await email.blur(); await expectFieldError(email,/valid email/);
    await expect(email).toHaveAttribute('required',''); await expect(consent).toHaveAttribute('required','');
  });
}
contract('CAMP-002','native server timing errors focus the corresponding control and linked summary',async({page,request})=>{
  await signInAsLocalOperator(page,request);await openPage(page, '/app');await createBlank(page);
  await page.getByRole('button',{name:'Add email step',exact:true}).click();
  await page.getByLabel('Local send date and time',{exact:true}).fill('2031-10-08T10:00');
  await page.getByLabel('Local send-by date and time',{exact:true}).fill('2031-10-08T18:00');
  const form=page.locator('#campaign-composer');
  // An incomplete draft still shows its advisory content errors when a native refusal adds a named field.
  await page.route('**/api/campaign-revisions/*',async route=>{
    if(route.request().method()!=='PATCH')return route.continue();
    const payload=route.request().postDataJSON();payload.steps[0].whyThisTime='';await route.continue({postData:JSON.stringify(payload)});
  },{times:1});
  const blankResponse=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().includes('/api/campaign-revisions/'));
  await page.getByRole('button',{name:'Save full draft'}).click();expect((await blankResponse).status()).toBe(400);
  await expectFieldError(page.getByLabel('Why this time',{exact:true}));
  const subject=page.getByLabel('Email subject',{exact:true});await expectFieldError(subject);await expect(subject).toBeFocused();
  const invalid=await form.locator('[aria-invalid="true"]').count();expect(invalid).toBeGreaterThan(1);await expectSummary(form,invalid);
  // Complete the missing content and identity so each native refusal isolates one named field.
  await subject.fill('A newsletter subject');await page.getByLabel('Email preheader',{exact:true}).fill('A newsletter preview');
  await page.getByLabel('From email',{exact:true}).fill('newsletter@example.test');await page.getByLabel('Reply-to email',{exact:true}).fill('reply@example.test');
  await expect(page.getByLabel('Email body',{exact:true})).toHaveAttribute('aria-required','true');
  const htmlMode=page.getByRole('button',{name:'HTML mode',exact:true});
  await htmlMode.focus();await htmlMode.press('Enter');await expect(htmlMode).toHaveAttribute('aria-pressed','true');
  const htmlBody=page.locator('textarea[aria-label="Email body"]');
  await expect(htmlBody).toHaveAttribute('required','');await htmlBody.fill('<p>Newsletter content.</p>');
  for(const [field,value,label] of [['whyThisTime','','Why this time'],['localScheduledAt','invalid','Local send date and time'],['localSendByAt','invalid','Local send-by date and time']]) {
    await page.route('**/api/campaign-revisions/*',async route=>{
      if(route.request().method()!=='PATCH')return route.continue();
      const payload=route.request().postDataJSON();payload.steps[0][field]=value;
      await route.continue({postData:JSON.stringify(payload)});
    },{times:1});
    const response=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().includes('/api/campaign-revisions/'));
    await page.getByRole('button',{name:'Save full draft'}).click();expect((await response).status()).toBe(400);
    const control=page.getByLabel(label,{exact:true});await expectFieldError(control);await expect(control).toBeFocused();await expectSummary(form,1);
  }
});
