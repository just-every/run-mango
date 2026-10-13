import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import path from 'node:path';
import {authoringRuntime} from './browser-runtime.mjs';

const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('wrangler'))('esbuild');

async function mountEditor(page:any) {
  const source=`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{RichEmailEditor}from'./src/core/features/campaigns/ui/rich-email-editor';import{renderMessageContent}from'./src/core/features/campaigns/message-content';function App(){const[value,setValue]=useState(''),[preview,setPreview]=useState(true);window.setPreview=setPreview;window.setBody=setValue;window.body=value;const rendered=renderMessageContent({emailSubject:'',preheader:'',smsBody:'',physicalAddress:'',emailBody:value,emailText:''},{unsubscribeUrl:'https://example.test/u'});return <><RichEmailEditor value={value} busy={false} onChange={setValue}/><div id="rendered" dangerouslySetInnerHTML={{__html:preview?rendered.html:""}}/></>};createRoot(document.getElementById('root')).render(<App/>);`;
  const output=await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'gate-regression.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',alias:{'@':path.join(process.cwd(),'src')},define:{'process.env.NODE_ENV':'"test"'}});
  await page.setContent('<div id="root"></div>');await page.addScriptTag({content:output.outputFiles[0].text});await page.waitForFunction(()=>Boolean((window as any).setBody));
}

test('[CAMP-002][CAMP-003][MSG-008] Chromium rich typing, toolbar, paste and mode round trips preserve opaque token text',async({page})=>{
  await mountEditor(page);
  const fallbacks=['Tom & Jerry','<strong>Friend & "guest"</strong>','Literal &amp; &lt; &#39; &#x41;','Dollar $& $$ $1','<img src="https://image.test/token.png">'];
  const imageRequests:string[]=[];page.on('request',request=>{if(request.url().includes('image.test'))imageRequests.push(request.url());});
  for (const fallback of fallbacks) {
    const token=`{{name | fallback: '${fallback}'}}`;
    await page.evaluate(body=>(window as any).setBody(body),`<p>Hello ${token}</p>`);
    const editor=page.getByRole('textbox',{name:'Email body',exact:true});
    await expect(editor).toHaveAttribute('contenteditable','true');
    await expect(editor).toHaveText('Hello '+token);
    await editor.press('End');await editor.press('!');
    expect(await page.evaluate(()=>(window as any).body)).toContain(token);
    await expect(page.locator('#rendered')).toHaveText(`Hello ${fallback}!`);
    await editor.press('ControlOrMeta+A');await page.getByRole('button',{name:'Bold',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).body)).toContain(token);
    await expect(page.locator('#rendered')).toHaveText(`Hello ${fallback}!`);
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();
    await expect(editor).toHaveValue(new RegExp('fallback:'));
    expect(await editor.inputValue()).toContain(token);
    await page.getByRole('button',{name:'Rich text',exact:true}).click();
    await expect(editor).toHaveText(`Hello ${token}!`);
  }
  // Formatting only the fallback splits its DOM text nodes; it must stay one token.
  const token=`{{name | fallback: '<b>Tom & Jerry</b>'}}`;
  await page.evaluate(body=>(window as any).setBody(body),`<p>${token}</p>`);
  const editor=page.getByRole('textbox',{name:'Email body',exact:true});
  await expect(editor).toHaveText(token);
  await editor.evaluate(element=>{const text=element.firstChild!.firstChild!;const range=document.createRange();range.setStart(text,3);range.setEnd(text,15);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);});
  await page.getByRole('button',{name:'Italic',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).body)).toContain(token);
  await expect(page.locator('#rendered')).toHaveText('<b>Tom & Jerry</b>');
  for (const mime of ['text/plain','text/html']) {
    await page.evaluate(()=>(window as any).setBody('<p>Replace this</p>'));
    await expect(editor).toHaveText('Replace this');
    await editor.press('ControlOrMeta+A');
    await editor.evaluate((element,{mime,token})=>{const data=new DataTransfer();data.setData(mime,mime==='text/html'?`<strong>${token}</strong>`:token);element.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},{mime,token});
    expect(await page.evaluate(()=>(window as any).body)).toContain(token);
    await expect(page.locator('#rendered')).toHaveText('<b>Tom & Jerry</b>');
  }
  await page.evaluate(()=>(window as any).setBody('<p>Safe &lt;script&gt; &amp; <a href="https://example.test/path?a=1&amp;b=2">Read</a></p>'));
  await expect(editor.locator('a')).toHaveAttribute('href','https://example.test/path?a=1&b=2');
  await editor.press('End');await editor.press('!');
  const body=await page.evaluate(()=>(window as any).body);
  expect(body).toContain('&lt;script&gt;');expect(body).toContain('href="https://example.test/path?a=1&amp;b=2"');
  // Actual image paste stays in HTML mode; token-looking image text never fetched.
  await page.evaluate(()=>(window as any).setPreview(false));
  await expect(page.locator('#rendered')).toBeEmpty();
  await editor.evaluate(element=>{const data=new DataTransfer();data.setData('text/html','<img src="https://image.test/pasted.png" width="20" height="20">');element.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
  await expect(page.getByRole('button',{name:'Rich text',exact:true})).toBeDisabled();
  expect(imageRequests).toEqual([]);
});

test('[AUD-001][AUD-002][CAMP-003] actual Worker refreshes recipient-step counts and preserves tokens through link edits',async({page,request})=>{
  test.setTimeout(120000);
  const runtime=await authoringRuntime();
  try {
    const open=await request.post(runtime.url+'/_authoring/open',{headers:{'X-Test-Token':runtime.token}});expect(open.status()).toBe(200);
    const {token}=await open.json();await page.context().addCookies([{name:'operator_session_local',value:token,url:runtime.url}]);
    await page.goto(runtime.url+'/app/campaigns');await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByRole('button',{name:'Blank newsletter',exact:true}).click();
    await page.getByRole('button',{name:'Add email step',exact:true}).click();
    await page.getByLabel('Include 1 field',{exact:true}).selectOption('contact:email');await page.getByLabel('Include 1 comparison',{exact:true}).selectOption('contains');await page.getByLabel('Include 1 value',{exact:true}).fill('@example.test');
    const live=page.getByLabel('Live audience estimate');
    await expect(live).toContainText('2 candidates · 1 eligible contacts · 1 excluded contacts');
    await expect(live).toContainText('Email: 1 eligible contacts · 1 recipient-steps across 1 step');
    const requestBody=page.waitForRequest(req=>req.url().endsWith('/api/campaign-authoring/audience')&&req.postDataJSON().stepCounts?.email===2);
    await page.getByRole('button',{name:'Add email step',exact:true}).click();await requestBody;
    await expect(live).toContainText('Email: 1 eligible contacts · 2 recipient-steps across 2 steps');
    await page.getByRole('button',{name:'Remove step 2',exact:true}).click();
    await expect(live).toContainText('Email: 1 eligible contacts · 1 recipient-steps across 1 step');
    const query={inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'contains',value:'@example.test'}]}),exclusionRulesJson:'[]',channels:['email']};
    const call=(body:unknown)=>page.evaluate(async body=>{const response=await fetch('/api/campaign-authoring/audience',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};},body);
    expect((await call(query)).body).toMatchObject({candidateCount:2,eligibleCount:1,excludedCount:1,channelCounts:[{channel:'email',stepCount:1,eligibleContactCount:1,recipientStepCount:1}]});
    expect((await call({...query,channels:['email','sms'],stepCounts:{email:2,sms:1}})).body).toMatchObject({candidateCount:2,eligibleCount:1,excludedCount:1,channelCounts:[{channel:'email',stepCount:2,eligibleContactCount:1,recipientStepCount:2},{channel:'sms',stepCount:1,eligibleContactCount:0,recipientStepCount:0}]});
    for (const stepCounts of [{email:0,sms:0},{email:26,sms:0},{email:1.5,sms:0},{email:1,sms:1}]) expect((await call({...query,stepCounts})).status).toBe(400);
    const fallback=`{{salutation | fallback: '<b>Tom & Jerry &amp; "guest"</b>'}}`;
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();
    await page.getByLabel('Email body',{exact:true}).fill(`<p>${fallback} <a href="https://example.test/read?a=1&amp;b=2">Read</a></p>`);
    await page.getByLabel('Link 1 destination',{exact:true}).fill('https://example.test/updated?a=2&b=3');
    expect(await page.getByLabel('Email body',{exact:true}).inputValue()).toContain(fallback);
    await page.getByLabel('Link 1 label',{exact:true}).fill(`Link ${fallback}`);
    expect((await page.getByLabel('Email body',{exact:true}).inputValue()).split(fallback)).toHaveLength(3);
    await page.getByRole('button',{name:'Remove link 1',exact:true}).click();
    expect((await page.getByLabel('Email body',{exact:true}).inputValue()).split(fallback)).toHaveLength(3);
    await page.getByRole('button',{name:'Remove step 1',exact:true}).click();
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('<b>Tom & Jerry &amp; "guest"</b>');
    expect(await (await request.get(runtime.url+'/_authoring/state',{headers:{'X-Test-Token':runtime.token}})).json()).toEqual({jobs:[],recipients:[],approvals:[]});
  } finally {await runtime.close();}
});
