import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readSettings } from '@runeditrun/rer/local-installer';
import { createPortability, PortabilityError } from '../../src/vendor/base/portability/index.mjs';
import { portabilityPolicy } from '../../src/core/features/portability/policy.ts';
import { localBindings } from '../../src/core/platform/local-bindings.ts';
import { localContactHashSalt } from '../../src/core/platform/local-contact-authority.ts';
import { RerError, refuse } from '@runeditrun/rer/errors';
import { transferArchive } from './transfer-archive.mjs';
import { retireTransfers } from '../../src/core/features/portability/retire-transfers.ts';

// Mango supplies its private-authority policy and source-wide erasure floors over the adapted Base engine.
async function run(direction,{root,path,store,signal,operationToken}) {
  const env={...process.env,RER_LOCAL_OPERATION:operationToken};
  // Refuse before any write: migrations would otherwise leave a database that setup must then protect.
  const settings=await readSettings(root,{}), vars=localBindings(settings.values);
  if(!vars.SESSION_SIGNING_KEY?.trim())throw refuse('Restore matching private settings before moving Mango data.');
  await store.run('Preparing Mango local resource bindings','pnpm',['run','config:local'],{cwd:root,signal,env});
  await store.run('Applying Mango data migrations','pnpm',['exec','wrangler','d1','migrations','apply','mango-local','--local','--persist-to','.wrangler/state','--config','wrangler.toml'],{cwd:root,signal,env});
  store.addSecrets(Object.values(settings.values));
  const {getPlatformProxy}=createRequire(join(root,'package.json'))('wrangler');
  const proxy=await getPlatformProxy({configPath:join(root,'wrangler.toml'),persist:{path:join(root,'.wrangler/state/v3')},remoteBindings:false});
  try {
    await retireTransfers(proxy.env.DB,{ASSETS_BUCKET:proxy.env.ASSETS_BUCKET});
    const pending=await proxy.env.DB.prepare("SELECT 1 FROM audience_erasures WHERE state='pending' LIMIT 1").first();
    if(pending)throw new PortabilityError('contact_erasure_in_progress',409);
    const service=await createPortability({db:proxy.env.DB,buckets:{ASSETS_BUCKET:proxy.env.ASSETS_BUCKET},policy:portabilityPolicy({contactHashSalt:localContactHashSalt(vars),sessionSigningKey:vars.SESSION_SIGNING_KEY})});
    return await transferArchive(service,direction,path,signal);
  } catch(error) {
    if(error instanceof PortabilityError)throw new RerError('restore_refused',`Mango transfer refused (${error.code.split(':')[0]}).`,error.status===409?4:1);
    if(error.code==='EEXIST')throw refuse('Export requires a new archive path.');
    throw new RerError('transfer_failed','Mango local transfer failed; preserve private settings and archive.',1);
  } finally {await proxy.dispose();}
}
export const portability={export:context=>run('export',context),import:context=>run('import',context)};
