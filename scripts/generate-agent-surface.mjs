import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const server=await createServer({configFile:false,resolve:{alias:{'@':resolve('src')}},server:{middlewareMode:true},appType:'custom'});
try {
 const {nativeToolSpecs,notTools}=await server.ssrLoadModule('/src/core/features/agent-door/catalogue.ts');
 const {resourceTemplates}=await server.ssrLoadModule('/src/core/features/agent-door/records.ts');
 const fixtures=JSON.parse(await readFile('tests/agent-door/journey.json','utf8'));
 const surface={schema:'rer-agent-surface/1',seed:'mango',specialist:'marketer',
  tools:[...nativeToolSpecs.map(({name,scope,readOnly,classes,clauses,inputSchema})=>({name,scope,readOnly,classes,clauses,inputSchema})),
   {name:'mango.events.list',scope:'events:read',readOnly:true,classes:['standard'],clauses:['BASE-AGENT-010']}].sort((a,b)=>a.name.localeCompare(b.name)),
  resources:resourceTemplates,notTools,...fixtures};
 const bytes=JSON.stringify(surface,null,2)+'\n';
 if(process.argv.includes('--check')){
  if(await readFile('agent-surface.json','utf8')!==bytes)throw new Error('Stale agent-surface.json; run node scripts/generate-agent-surface.mjs.');
 }else await writeFile('agent-surface.json',bytes);
 console.log(`Mango agent surface: ${surface.tools.length} tools, ${surface.resources.length} resources, ${surface.journey.length} journey steps.`);
}finally{await server.close();}
