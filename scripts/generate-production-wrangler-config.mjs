import { variableNames, selectedEnvironment } from './runtime-environment.mjs';
import { readFile, writeFile } from 'node:fs/promises';

import { deploymentNames } from './deployment/target.mjs';

const template = await readFile('deploy/wrangler.template.toml', 'utf8');
const names = deploymentNames();
// The bundler needs a D1 binding, but build creates no provider resources.
// Base's owner deploy plan supplies and verifies the real resource identity.
const metadata = { ...names, databaseId: '00000000-0000-0000-0000-000000000000' };

const generated = template
  .replaceAll('__MANGO_WORKER_NAME__', metadata.workerName)
  .replaceAll('__MANGO_DATABASE_NAME__', metadata.databaseName)
  .replaceAll('__MANGO_DATABASE_ID__', metadata.databaseId)
  .replaceAll('__MANGO_BUCKET_NAME__', metadata.bucketName)
  .replaceAll('__MANGO_QUEUE_NAME__', metadata.queueName);

const variables = Object.entries(selectedEnvironment(variableNames)).map(([name, value]) => `${name} = ${JSON.stringify(value)}`).join('\n');
await writeFile('wrangler.toml', `${generated}\n[vars]\n${variables}\n`);
