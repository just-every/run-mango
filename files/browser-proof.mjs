import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {createWriteStream} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {once} from 'node:events';
const require=createRequire(process.cwd()+'/package.json');
const {chromium,expect}=require('@playwright/test');
const packet=new URL('file://'+process.cwd()+'/../packet/');
const portServer=createServer();portServer.listen(0,'127.0.0.1');await once(portServer,'listening');const port=portServer.address().port;await new Promise(resolve=>portServer.close(resolve));
const output=createWriteStream(new URL('browser-server.log',packet));
const server=spawn(process.execPath,['tests/support/start-fixture-runtime.mjs'],{env:{...process.env,MANGO_FIXTURE_PORT:String(port),MANGO_FIXTURE_SIGNUP_MAIL:'1'},stdio:['ignore','pipe','pipe']});
server.stdout.pipe(output);server.stderr.pipe(output);
let browser;const rows=[];
try {
 const origin=`http://127.0.0.1:${port}`;
 const started=Date.now();
 for(;;){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(server.exitCode!==null)throw Error('fixture server exited '+server.exitCode);if(Date.now()-started>120000)throw Error('fixture server health timeout');await new Promise(resolve=>setTimeout(resolve,500));}
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},extraHTTPHeaders:{'CF-Connecting-IP':'192.0.2.55'}});
  try{
   const page=await context.newPage();await page.goto(origin+'/subscribe');
   const email=['Synthetic-Mango-55-Browser','Example.Test'].join('@');
   const info=await (await context.request.get(origin+'/subscribe/info')).json();
   const whitespace=await context.request.post(origin+'/subscribe',{data:{email:` \t${email}\r\n`,consent:true,disclosure:info.disclosure}});
   expect(whitespace.status()).toBe(202);expect(await whitespace.json()).toEqual({status:'confirmation-required'});
   await page.locator('input[name="email"]').fill(email);
   await page.getByRole('checkbox').check();
   const posted=page.waitForResponse(response=>response.url()===origin+'/subscribe'&&response.request().method()==='POST');
   await page.getByRole('button',{name:'Request confirmation',exact:true}).click();
   const response=await posted;expect(response.status()).toBe(202);
   await expect(page.locator('.subscribe-confirmation[role="status"]')).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   expect(overflow).toBe(false);
   await page.screenshot({path:new URL(`subscribe-${width}.png`,packet).pathname,fullPage:true});
   rows.push({width,door:'/subscribe',whitespaceStatus:whitespace.status(),formStatus:response.status(),confirmationVisible:true,horizontalOverflow:overflow});
   console.log(`BROWSER CONT-001 width=${width} whitespace=202 form=202 confirmation=visible overflow=false`);
  }finally{await context.close();}
 }
 await writeFile(new URL('browser-receipt.json',packet),JSON.stringify({screens:rows,serverPid:server.pid,productionMocks:false,providerBoundary:'synthetic mail HTTP edge only'},null,2)+'\n');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
 await once(server,'exit');output.end();
}
