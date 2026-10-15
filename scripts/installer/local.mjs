import { localInstaller, readSettings } from '@runeditrun/rer/local-installer';
import { developmentTarget } from '@runeditrun/rer/operator-installer';
import { previewTarget } from './preview.mjs';
import { privateDirectory } from '@runeditrun/rer/private-files';
import { commandAdapter as commands } from '@runeditrun/rer/adapter';
import { ownerDeploy } from '@runeditrun/rer/deploy';
import { refuse } from '@runeditrun/rer/errors';
import {lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {selectLocalState} from '@runeditrun/rer/local/state';
import { join } from 'node:path';
import { localContactHashSalt, localContactAuthorityVersion } from '../../src/core/platform/local-contact-authority.ts';
import { assertFreshContactStore } from './contact-authority.mjs';
import { features } from './ui/seed.mjs';
import { portability } from './portability.mjs';
import { localBindings } from '../../src/core/platform/local-bindings.ts';
import { declarationPaths, resolveDeclaration } from './deploy-declaration.mjs';
export const statePath = '.wrangler/state';
function stateInventory(root) {
 const legacy='src/core/app/client/.wrangler/state';
 try{lstatSync(join(root,legacy));return legacy;}catch(error){if(error.code==='ENOENT')return statePath;throw error;}
}
export const guard=({root})=>selectLocalState(root,stateInventory(root));
async function development(context) {
 localContactHashSalt(localBindings((await readSettings(context.root,{})).values));
 const [command,args,options]=developmentTarget(context);
 return [command,args,{...options,env:{...options.env,CLOUDFLARE_INCLUDE_PROCESS_ENV:'false',X_LOCAL_EXPLORER:'false'}}];
}
export const hooks = {
 features, node:'22.20.0', guard,
 async prepare({root,input,store,fail}) {
  await guard({root}); const current=await readSettings(root,{}); await privateDirectory(root,['.wrangler','state']);
  if(current.text===undefined)await assertFreshContactStore(join(root,statePath));
  else {
   if(current.values.MANGO_LOCAL_CONFIG_VERSION!=='2')throw refuse('Legacy Mango credentials require explicit auth:rotate recovery in OPERATIONS.md; setup will not rewrite private bytes.');
   try{localContactHashSalt(current.values);}catch{store.report('Restore matching contact authority before setup.');throw fail('setup');}
   if(current.values.OWNER_EMAIL?.trim().toLowerCase()!==input.OWNER_EMAIL.trim().toLowerCase())throw refuse('Owner conflicts with the saved installation. Restore matching settings or use confirmed reset.');
  }
 },
 secrets:{keepExisting:true,originKey:'AUTH_ORIGIN',values:({origin})=>({AUTH_LOCAL:'true',AUTH_ORIGIN:origin,MAIL_PROVIDER:'development',MANGO_LOCAL_CONFIG_VERSION:'2',MANGO_LOCAL_HASH_AUTHORITY:localContactAuthorityVersion})},
 // The production build writes the production wrangler.toml; the last step puts the local one back for dev.
 build:[['pnpm',['run','build:worker']],['pnpm',['run','config:local']]],
 migrate:[['pnpm',['run','config:local']],['pnpm',['exec','wrangler','d1','migrations','apply','mango-local','--local','--persist-to',statePath,'--config','wrangler.toml']]],
 async start(context) {
  localContactHashSalt(localBindings((await readSettings(context.root,{})).values));
  return previewTarget(context);
 },
 owner:{displayName:input=>input.displayName,returnTo:'/setup'},signIn:{emailKey:'OWNER_EMAIL',returnTo:'/setup'},
};
const lifecycle=localInstaller(hooks);
// The deploy kit reads the resolved secrets for app deployment; rer's run-site planner reads
// project identity from the tracked input before the app deploy callback runs.
function deploy() {
 const owner=ownerDeploy(declarationPaths.deploy,lifecycle);
 return Object.assign(context=>{resolveDeclaration(context.root,'deploy',process.env);return owner(context);},{declaration:'deploy.json',managesHostedOwner:owner.managesHostedOwner});
}
export const {install}=lifecycle;
export const commandAdapter=commands(lifecycle,{dev:development,preview:previewTarget,verify:['pnpm',['run','verify:app']],deploy:deploy(),portability,setup:{manifestFile:'rer-setup.json'},browserModule:'scripts/installer/ui/seed.mjs',
 // The production build regenerates wrangler.toml; preview's fixed-build receipt ignores it.
 // Local dev identity: the local-only Worker entry, the build output rer build scans for the dev layer, and the kept end-to-end email-link test.
 devIdentity:{entry:'src/core/app/worker.dev.ts',output:['dist'],emailLinkTest:'tests/local-start/local.journey.ts'},localOnlyKeys:['RER_DEV_ORIGIN','RER_DEV_IDENTITY'],
 generatedOutputs:['wrangler.toml'],product:'Mango',
 // The run site (run-mango.com): the approved landing, the Run page and the docs, built by rer build --site.
 site:{entry:'src/site/pages.tsx',output:'dist/site',declaration:'deploy-site.json',config:'vite.site.config.ts'},input:{names:{email:'OWNER_EMAIL'}}});

// rer verify serves the build as deploy hosts it, from deploy.json without its optional secrets (deploy-declaration.mjs).
// Not enumerable: the setup seed loader spreads the adapter for every verb, and only verify's hosted check may read
// deploy.json and write the declaration it resolves.
Object.defineProperty(commandAdapter,'deployDeclaration',{enumerable:false,get(){
 return resolveDeclaration(fileURLToPath(new URL('../../',import.meta.url)),'verify');
}});

// Supply the old inventory to Base's existing state validator so it refuses
// legacy placement before any shared verb changes state or private settings.
Object.defineProperty(commandAdapter,'state',{enumerable:true,get(){
 return stateInventory(fileURLToPath(new URL('../../',import.meta.url)));
}});
