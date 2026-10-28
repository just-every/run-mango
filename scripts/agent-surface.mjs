import {createRequire} from 'node:module';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
const directory=await mkdtemp(join(tmpdir(),'mango-agent-declaration-'));
try{
 const source=`
 import {mangoTools} from './src/core/features/agent-door/tools';
 import {integrationTools} from './src/core/features/agent-door/integration-tools';
 import {workerTools} from './src/core/features/agent-door/worker-tools';
 import {mangoResources} from './src/core/features/agent-door/resources';
 import {eventsTool} from './src/vendor/base/agent-door/events.ts';
 const platform={database:{$client:{}},config:{}},runtime={platform};
 export const tools=[...mangoTools(platform,()=>{throw Error('Declaration may not execute native actions')},{},runtime),...workerTools(runtime),...integrationTools(platform,{}),eventsTool({options:{seed:'mango'}})]
   .map(({name,title,scope,readOnly,classes,clauses,inputSchema})=>({name,title,scope,readOnly,classes,clauses,inputSchema})).sort((a,b)=>a.name.localeCompare(b.name));
 export const resources=mangoResources(platform).map(resource=>resource.uriTemplate).sort();
 `;
 const bundled=await build({stdin:{contents:source,resolveDir:root,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',alias:{'@':resolve('src')},external:['node:*']});
 const output=join(directory,'declaration.mjs');await writeFile(output,bundled.outputFiles[0].text);
 const declaration=await import(pathToFileURL(output));
 const journey=JSON.parse(await readFile('tests/agent-door/journey.json','utf8'));
 const surface={schema:'rer-agent-surface/1',seed:'mango',specialist:'marketer',tools:declaration.tools,resources:declaration.resources,
  notTools:[{clauses:['DATA-001','MOVE-001'],reason:'import-door'},{clauses:['OPER-001'],reason:'screen'},{clauses:['DATA-001'],reason:'installation'}],
  witness:{tool:'mango.witness.read',args:{}},journey,escalations:[],
  verification:{journey:'tests/agent-door/native-journey.mjs',owner:{bindings:{RER_MANAGEMENT_ORIGIN:'issuer',RER_INSTALLATION_ID:'installationId',DESIGN_PROVIDER_API_KEY:'token',DESIGN_PROVIDER_ORIGIN:'appOrigin'},initializer:'tests/agent-door/owner.mjs'},network:{module:'tests/agent-door/network.mjs',origins:['https://api.sendgrid.com','https://api.resend.com','https://cloudflare-dns.com','https://rer-hosted-check.invalid']}},
  pending:JSON.parse(await readFile('tests/agent-door/pending.json','utf8'))};
 const text=JSON.stringify(surface,null,2)+'\n';
 if(process.argv.includes('--check')){
  if(await readFile('agent-surface.json','utf8')!==text)throw Error('Agent surface is stale; run node scripts/agent-surface.mjs.');
  console.log('Agent surface matches the production registry.');
 }else{await writeFile('agent-surface.json',text);console.log('Generated '+surface.tools.length+' native tools and '+surface.resources.length+' resources.');}
}finally{await rm(directory,{recursive:true,force:true});}
