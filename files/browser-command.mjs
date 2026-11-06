import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(resolve('package.json'));
const {chromium,expect}=require('@playwright/test');
const origin='http://127.0.0.1:18371',packet=resolve('../packet');
const results={source:'1a4f7d299e3c366e6321a8eb4b481a6d2d840576',kind:'functional browser proof; no design judgment',browser:'/usr/bin/chromium',started:new Date().toISOString(),widths:[],exit:null};
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
try {
 await mkdir(packet+'/screens',{recursive:true});
 const token=(await readFile('.seed/local-bootstrap-token','utf8')).trim();
 let cookie;
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000},extraHTTPHeaders:{'CF-Connecting-IP':width===1440?'192.0.2.71':'192.0.2.72'}});
  try {
   const page=await context.newPage();
   if(!cookie){
    const boot=await context.request.post(origin+'/api/_local/bootstrap',{headers:{'X-Mango-Local-Bootstrap-Token':token},data:{testSession:true}});
    assert.equal(boot.status(),200);const value=await boot.json();cookie=value.session.cookie.split(';')[0];
   }
   const [name,...value]=cookie.split('=');await context.addCookies([{name,value:value.join('='),url:origin}]);
   await page.goto(origin+'/subscribe');
   const email=['Synthetic-CT-Public-'+width,'Example.Test'].join('@');
   await expect(page.getByRole('textbox',{name:'Email address'})).toBeEnabled();
   await page.getByRole('textbox',{name:'Email address'}).fill('  '+email+'  ');
   await page.getByRole('checkbox').check();
   const submitted=page.waitForResponse(r=>new URL(r.url()).pathname==='/subscribe'&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Request confirmation'}).click();
   const response=await submitted;assert.equal(response.status(),202);
   await expect(page.getByRole('status')).toContainText('Request received.');
   await page.screenshot({path:packet+'/screens/subscribe-'+width+'.png',fullPage:true});
   const publicOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(publicOverflow,false);
   const hosted=await context.request.get(origin+'/api/contacts/search?address='+encodeURIComponent(email.toLowerCase()));
   assert.equal(hosted.status(),200);const hostedRows=(await hosted.json()).contacts;assert.equal(hostedRows.length,1);assert.equal(hostedRows[0].email,email.toLowerCase());assert.equal(hostedRows[0].emailStatus,'pending');
   await page.goto(origin+'/app/audience');
   const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Add a contact by hand',exact:true})});
   const manualEmail=['Synthetic-CT-Manual-'+width,'Example.Test'].join('@');
   await panel.locator('input[name=email]').fill('  '+manualEmail+'  ');
   await panel.locator('input[name=name]').fill('Synthetic identity review '+width);
   await panel.locator('input[name=phone]').fill(' +44 (20) 7946-'+(width===1440?'0171':'0172')+' ');
   await panel.locator('input[name=source]').fill('Synthetic written review receipt');
   await panel.locator('select[name=emailMethod]').selectOption('written');
   await panel.locator('textarea[name=emailText]').fill('I agree to receive email newsletters from Mango local.');
   await panel.locator('input[name=jurisdiction]').fill('US');
   await panel.locator('input[name=emailAffirmed]').check();
   const manual=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/contacts/consent'&&r.request().method()==='POST');
   await panel.getByRole('button',{name:'Add contact with permission'}).click();
   const saved=await manual;assert.equal(saved.status(),201);const result=await saved.json();assert.equal(result.contact.email,manualEmail.toLowerCase());
   await expect(panel.getByRole('status')).toContainText('Email permission recorded; confirmation is required.');
   await panel.screenshot({path:packet+'/screens/manual-'+width+'.png'});
   const manualOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(manualOverflow,false);
   const detail=await context.request.get(origin+'/api/contacts/'+encodeURIComponent(result.contact.id));assert.equal(detail.status(),200);
   const contact=await detail.json();assert.equal(contact.contact.email,manualEmail.toLowerCase());assert.equal(contact.phones.length,1);assert.equal(contact.phones[0].phoneE164,width===1440?'+442079460171':'+442079460172');
   results.widths.push({width,publicPost:response.status(),publicCanonicalReadback:true,publicPending:true,manualPost:saved.status(),manualCanonicalEmailReadback:true,manualCanonicalPhoneReadback:true,confirmationNotice:true,publicOverflow,manualOverflow});
  } finally {await context.close();}
 }
 results.exit=0;
} catch(error) {results.exit=1;results.error=String(error);process.exitCode=1;}
finally {await browser.close();results.finished=new Date().toISOString();await writeFile(packet+'/browser-receipt.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));}
