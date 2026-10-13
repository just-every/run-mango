import { localInstaller, readSettings } from '../base-onboarding/adapter.mjs';
import { developmentTarget } from '../base-onboarding/operator-installer.mjs';
import { previewTarget } from './preview.mjs';
import { privateDirectory } from '../base-onboarding/private-files.mjs';
import { commandAdapter as commands } from '../base-cli/cli/adapter.mjs';
import { ownerDeploy } from '../base-cli/cli/deploy.mjs';
import { refuse } from '../base-cli/cli/errors.mjs';
import {lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {selectLocalState} from '../base-onboarding/local/state.mjs';
import { join } from 'node:path';
import { localContactHashSalt, localContactAuthorityVersion } from '../../src/core/platform/local-contact-authority.ts';
import { assertFreshContactStore } from './contact-authority.mjs';
import { features } from './ui/seed.mjs';
import { portability } from './portability.mjs';
import { localBindings } from '../../src/core/platform/local-bindings.ts';
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
export const {install}=lifecycle;
export const commandAdapter=commands(lifecycle,{dev:development,preview:previewTarget,verify:['pnpm',['run','verify:app']],deploy:ownerDeploy('deploy.json',lifecycle),portability,setup:{manifestFile:'rer-setup.json'},browserModule:'scripts/installer/ui/seed.mjs',
 // The production build regenerates wrangler.toml; preview's fixed-build receipt ignores it.
 // Local dev identity: the local-only Worker entry, the build output rer build scans for the dev layer, and the kept end-to-end email-link test.
 devIdentity:{entry:'src/core/app/worker.dev.ts',output:['dist'],emailLinkTest:'tests/local-start/local.journey.ts'},localOnlyKeys:['RER_DEV_ORIGIN','RER_DEV_IDENTITY'],
 generatedOutputs:['wrangler.toml'],product:'Mango',input:{names:{email:'OWNER_EMAIL'}}});

// Supply the old inventory to Base's existing state validator so it refuses
// legacy placement before any shared verb changes state or private settings.
Object.defineProperty(commandAdapter,'state',{enumerable:true,get(){
 return stateInventory(fileURLToPath(new URL('../../',import.meta.url)));
}});
