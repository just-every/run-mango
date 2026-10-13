import { createRequire } from 'node:module';
import { readDeployment } from './deployment/target.mjs';
import { remoteD1 } from './remote-d1.mjs';
import { resolve } from 'node:path';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
const action=process.argv[2],challengeId=process.argv[3];
if (!['prepare','send','observe','inspect'].includes(action)) throw new Error('Usage: sender-verification.mjs prepare|send|observe|inspect [challenge-id]');
const metadata=await readDeployment();
const DB=remoteD1({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN,databaseId:metadata.databaseId});
const directory=await mkdtemp(resolve(tmpdir(),'mango-sender-check-'));
try {
  const bundle=await build({entryPoints:[resolve('scripts/sender-verification-entry.ts')],bundle:true,write:false,format:'esm',platform:'node',alias:{'@':resolve('src')},logLevel:'silent'});
  const path=resolve(directory,'runner.mjs');await writeFile(path,bundle.outputFiles[0].text);
  const {senderVerificationCommand}=await import(pathToFileURL(path));
  console.log(JSON.stringify(await senderVerificationCommand({...process.env,DB},action,challengeId)));
} catch { throw new Error('Sender verification command failed. Inspect configured provider/DNS/receiver availability without exposing credential values.'); }
finally {await rm(directory,{recursive:true,force:true});}
